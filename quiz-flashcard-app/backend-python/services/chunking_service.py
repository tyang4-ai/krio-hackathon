"""
Chunking service for semantic document splitting and topic extraction.

Research Basis:
- MC-Indexing (arXiv:2404.15103v1): Content-aware chunking with multi-topic tagging
- SCAN (arXiv:2505.14381v1): Coarse-grained chunking (800-1200 tokens optimal)
- User's chunking plan: Page-based topic detection with boundary refinement
"""
import re
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Tuple

import tiktoken
import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.document import Document
from models.document_chunk import DocumentChunk
from models.document_topic import DocumentTopic
from models.document_concept_map import DocumentConceptMap
from config.settings import settings

logger = structlog.get_logger()

# Token counting with tiktoken (using cl100k_base for OpenAI ada-002 compatibility)
ENCODING = tiktoken.get_encoding("cl100k_base")


@dataclass
class PageContent:
    """Represents a page of document content."""
    page_number: int
    content: str
    start_char: int
    end_char: int


@dataclass
class TopicBoundary:
    """Represents a topic boundary within a document."""
    topic_name: str
    start_char: int
    end_char: int
    page_numbers: List[int]


@dataclass
class ChunkResult:
    """Result of chunking a document."""
    chunks: List[Dict[str, Any]]
    topics: List[Dict[str, Any]]
    concept_map: Dict[str, Any]
    total_tokens: int


class ChunkingService:
    """
    Service for semantic document chunking.

    Implements a 4-phase chunking pipeline:
    1. Page-level topic detection
    2. Boundary refinement for topic transition pages
    3. Chunk formation with overlap
    4. Multi-topic tagging per chunk
    """

    def __init__(
        self,
        target_tokens: int = 1000,
        min_tokens: int = 500,
        max_tokens: int = 1500,
        overlap_tokens: int = 100,
    ):
        """
        Initialize chunking service.

        Args:
            target_tokens: Target chunk size (default 1000, per SCAN research)
            min_tokens: Minimum chunk size (default 500)
            max_tokens: Maximum chunk size (default 1500)
            overlap_tokens: Overlap between adjacent chunks (default 100)
        """
        self.target_tokens = target_tokens
        self.min_tokens = min_tokens
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        self._ai_client = None

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken."""
        return len(ENCODING.encode(text))

    def split_into_pages(self, content: str, page_markers: bool = True) -> List[PageContent]:
        """
        Split document content into pages.

        Args:
            content: Full document text
            page_markers: Whether to detect page markers in text

        Returns:
            List of PageContent objects
        """
        # Try to detect page breaks (common in PDF extractions)
        if page_markers and "\f" in content:
            # Form feed character often used as page break
            raw_pages = content.split("\f")
        elif page_markers and re.search(r'\n---\s*Page\s+\d+\s*---\n', content):
            # Custom page markers
            raw_pages = re.split(r'\n---\s*Page\s+\d+\s*---\n', content)
        elif page_markers and re.search(r'\n--- Slide \d+ ---\n', content):
            # PowerPoint slide markers
            raw_pages = re.split(r'\n--- Slide \d+ ---\n', content)
        else:
            # No page markers - split by approximate token count
            # Aim for ~500 tokens per "page" for processing
            tokens_per_page = 500
            words = content.split()
            words_per_page = tokens_per_page * 4 // 3  # Rough word-to-token ratio

            raw_pages = []
            for i in range(0, len(words), words_per_page):
                raw_pages.append(" ".join(words[i:i + words_per_page]))

        # Build PageContent objects with character positions
        pages = []
        current_pos = 0
        for i, page_text in enumerate(raw_pages, 1):
            page_text = page_text.strip()
            if page_text:
                start = content.find(page_text, current_pos)
                if start == -1:
                    start = current_pos
                end = start + len(page_text)
                pages.append(PageContent(
                    page_number=i,
                    content=page_text,
                    start_char=start,
                    end_char=end,
                ))
                current_pos = end

        return pages

    async def get_topic_summary(self, text: str, max_words: int = 5) -> str:
        """
        Get a brief topic summary for a text segment using AI.

        Args:
            text: Text to summarize
            max_words: Maximum words in summary

        Returns:
            Topic summary string (3-5 words)
        """
        # Truncate to first ~150 tokens for efficiency
        tokens = ENCODING.encode(text)[:150]
        truncated_text = ENCODING.decode(tokens)

        prompt = f"""Summarize the main topic of this text in exactly {max_words} words or less.
Return ONLY the topic summary, nothing else.

Text:
{truncated_text}

Topic summary:"""

        try:
            response = await self._call_ai(prompt, max_tokens=20)
            return response.strip().strip('"').strip("'")
        except Exception as e:
            logger.warning("topic_summary_failed", error=str(e))
            # Fallback: extract first meaningful phrase
            words = text.split()[:10]
            return " ".join(words[:5])

    async def detect_topic_boundaries(
        self,
        pages: List[PageContent],
    ) -> List[TopicBoundary]:
        """
        Phase 1 & 2: Detect topic boundaries using page-based detection.

        For each page:
        1. Extract first 150 tokens and last 150 tokens
        2. Get topic summary for each
        3. If summaries match → same topic continues
        4. If summaries differ → mark as boundary page, refine

        Args:
            pages: List of page contents

        Returns:
            List of topic boundaries
        """
        if not pages:
            return []

        boundaries = []
        current_topic = None
        current_start = 0
        current_pages = []

        for i, page in enumerate(pages):
            page_tokens = self.count_tokens(page.content)

            # Get topic summaries for start and end of page
            start_text = page.content[:min(len(page.content), 500)]
            end_text = page.content[max(0, len(page.content) - 500):]

            start_topic = await self.get_topic_summary(start_text)
            end_topic = await self.get_topic_summary(end_text)

            logger.debug(
                "page_topic_detection",
                page=page.page_number,
                start_topic=start_topic,
                end_topic=end_topic,
            )

            if current_topic is None:
                # First page - initialize
                current_topic = start_topic
                current_start = page.start_char
                current_pages = [page.page_number]

                if start_topic.lower() != end_topic.lower():
                    # Topic changes within first page - refine boundary
                    boundary_char = await self._refine_boundary(page, start_topic, end_topic)

                    # Save first topic
                    boundaries.append(TopicBoundary(
                        topic_name=start_topic,
                        start_char=current_start,
                        end_char=boundary_char,
                        page_numbers=current_pages.copy(),
                    ))

                    # Start new topic
                    current_topic = end_topic
                    current_start = boundary_char
                    current_pages = [page.page_number]
            else:
                # Check if topic continues or changes
                if start_topic.lower() != current_topic.lower():
                    # Topic changed between pages
                    prev_page = pages[i - 1] if i > 0 else page
                    boundaries.append(TopicBoundary(
                        topic_name=current_topic,
                        start_char=current_start,
                        end_char=prev_page.end_char,
                        page_numbers=current_pages.copy(),
                    ))

                    current_topic = start_topic
                    current_start = page.start_char
                    current_pages = [page.page_number]
                else:
                    current_pages.append(page.page_number)

                if start_topic.lower() != end_topic.lower():
                    # Topic changes within this page - refine
                    boundary_char = await self._refine_boundary(page, start_topic, end_topic)

                    boundaries.append(TopicBoundary(
                        topic_name=current_topic,
                        start_char=current_start,
                        end_char=boundary_char,
                        page_numbers=current_pages.copy(),
                    ))

                    current_topic = end_topic
                    current_start = boundary_char
                    current_pages = [page.page_number]

        # Add final boundary
        if current_topic and pages:
            boundaries.append(TopicBoundary(
                topic_name=current_topic,
                start_char=current_start,
                end_char=pages[-1].end_char,
                page_numbers=current_pages,
            ))

        return boundaries

    async def _refine_boundary(
        self,
        page: PageContent,
        start_topic: str,
        end_topic: str,
    ) -> int:
        """
        Refine topic boundary within a page by splitting into 4 sections.

        Args:
            page: Page content
            start_topic: Topic at start of page
            end_topic: Topic at end of page

        Returns:
            Character position of boundary
        """
        content = page.content
        section_size = len(content) // 4

        sections = [
            content[i * section_size:(i + 1) * section_size]
            for i in range(4)
        ]

        # Get topic for each section
        section_topics = []
        for section in sections:
            topic = await self.get_topic_summary(section)
            section_topics.append(topic.lower())

        # Find where topic changes
        for i in range(1, len(section_topics)):
            if section_topics[i] != section_topics[i - 1]:
                # Boundary is between sections i-1 and i
                boundary = page.start_char + (i * section_size)
                return boundary

        # Default to middle of page
        return page.start_char + len(content) // 2

    def form_chunks_with_overlap(
        self,
        content: str,
        boundaries: List[TopicBoundary],
    ) -> List[Dict[str, Any]]:
        """
        Phase 3: Form chunks from topic boundaries with overlap.

        Args:
            content: Full document content
            boundaries: Detected topic boundaries

        Returns:
            List of chunk dictionaries
        """
        chunks = []
        chunk_index = 0

        for boundary in boundaries:
            section_content = content[boundary.start_char:boundary.end_char]
            section_tokens = self.count_tokens(section_content)

            if section_tokens <= self.max_tokens:
                # Section fits in one chunk
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": section_content,
                    "token_count": section_tokens,
                    "start_char": boundary.start_char,
                    "end_char": boundary.end_char,
                    "section_title": boundary.topic_name,
                    "page_numbers": boundary.page_numbers,
                })
                chunk_index += 1
            else:
                # Split section into multiple chunks
                sub_chunks = self._split_large_section(
                    section_content,
                    boundary.start_char,
                    boundary.topic_name,
                    boundary.page_numbers,
                    chunk_index,
                )
                chunks.extend(sub_chunks)
                chunk_index += len(sub_chunks)

        # Add overlap between adjacent chunks
        chunks = self._add_overlap(chunks, content)

        return chunks

    def _split_large_section(
        self,
        content: str,
        start_char: int,
        topic_name: str,
        page_numbers: List[int],
        start_index: int,
    ) -> List[Dict[str, Any]]:
        """
        Split a large section into multiple chunks.

        Tries to split at paragraph boundaries.
        """
        chunks = []

        # Split by paragraphs first
        paragraphs = content.split("\n\n")
        if len(paragraphs) == 1:
            # No paragraph breaks - split by sentences
            paragraphs = re.split(r'(?<=[.!?])\s+', content)

        current_chunk = ""
        current_tokens = 0
        current_start = start_char
        chunk_index = start_index

        for para in paragraphs:
            para_tokens = self.count_tokens(para)

            if current_tokens + para_tokens <= self.target_tokens:
                current_chunk += para + "\n\n"
                current_tokens += para_tokens
            else:
                if current_chunk:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "content": current_chunk.strip(),
                        "token_count": current_tokens,
                        "start_char": current_start,
                        "end_char": current_start + len(current_chunk),
                        "section_title": topic_name,
                        "page_numbers": page_numbers,
                    })
                    chunk_index += 1
                    current_start += len(current_chunk)

                current_chunk = para + "\n\n"
                current_tokens = para_tokens

        # Add remaining content
        if current_chunk:
            chunks.append({
                "chunk_index": chunk_index,
                "content": current_chunk.strip(),
                "token_count": current_tokens,
                "start_char": current_start,
                "end_char": current_start + len(current_chunk),
                "section_title": topic_name,
                "page_numbers": page_numbers,
            })

        return chunks

    def _add_overlap(
        self,
        chunks: List[Dict[str, Any]],
        content: str,
    ) -> List[Dict[str, Any]]:
        """Add overlap content to chunks for better context preservation."""
        for i in range(1, len(chunks)):
            prev_chunk = chunks[i - 1]

            # Get last ~100 tokens of previous chunk as overlap
            prev_tokens = ENCODING.encode(prev_chunk["content"])
            overlap_tokens = prev_tokens[-self.overlap_tokens:]
            overlap_text = ENCODING.decode(overlap_tokens)

            # Prepend to current chunk
            chunks[i]["content"] = f"[...] {overlap_text}\n\n{chunks[i]['content']}"
            chunks[i]["token_count"] += len(overlap_tokens)

        return chunks

    async def extract_topics_for_chunk(
        self,
        chunk_content: str,
    ) -> Dict[str, Any]:
        """
        Phase 4: Extract all topics and concepts from a chunk using AI.

        Args:
            chunk_content: Content of the chunk

        Returns:
            Dictionary with topics, primary_topic, and key_concepts
        """
        prompt = f"""Analyze this text and extract:
1. ALL topics discussed (list of 2-5 topics)
2. The PRIMARY topic (main focus)
3. Key concepts/terms mentioned (5-10 important terms)

Return ONLY valid JSON in this exact format:
{{
    "topics": ["Topic 1", "Topic 2"],
    "primary_topic": "Main Topic",
    "key_concepts": ["concept1", "concept2", "concept3"]
}}

Text to analyze:
{chunk_content[:2000]}

JSON response:"""

        try:
            response = await self._call_ai(prompt, max_tokens=200)
            # Parse JSON response
            import json
            # Clean up response
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            return json.loads(response.strip())
        except Exception as e:
            logger.warning("topic_extraction_failed", error=str(e))
            return {
                "topics": [],
                "primary_topic": None,
                "key_concepts": [],
            }

    async def build_concept_map(
        self,
        chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Build a concept map from all chunks.

        Args:
            chunks: List of processed chunks with topics

        Returns:
            Concept map dictionary
        """
        # Collect all concepts and their chunk associations
        concept_chunks: Dict[str, List[int]] = {}
        chunk_concepts: Dict[int, List[str]] = {}

        for chunk in chunks:
            chunk_idx = chunk["chunk_index"]
            concepts = chunk.get("key_concepts", [])
            topics = chunk.get("topics", [])

            all_terms = concepts + topics
            chunk_concepts[chunk_idx] = all_terms

            for term in all_terms:
                term_lower = term.lower()
                if term_lower not in concept_chunks:
                    concept_chunks[term_lower] = []
                concept_chunks[term_lower].append(chunk_idx)

        # Build relationships between concepts
        concept_map = {}
        for concept, chunk_ids in concept_chunks.items():
            # Find related concepts (appear in same chunks)
            related = set()
            for chunk_id in chunk_ids:
                other_concepts = chunk_concepts.get(chunk_id, [])
                for other in other_concepts:
                    other_lower = other.lower()
                    if other_lower != concept:
                        related.add(other_lower)

            concept_map[concept] = {
                "chunk_ids": chunk_ids,
                "related": list(related)[:10],  # Limit to 10 related concepts
            }

        return concept_map

    async def chunk_document(
        self,
        db: AsyncSession,
        document_id: int,
    ) -> ChunkResult:
        """
        Main entry point: Chunk a document and store results.

        Args:
            db: Database session
            document_id: Document to chunk

        Returns:
            ChunkResult with chunks, topics, and concept map
        """
        # Get document
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()

        if not document:
            raise ValueError(f"Document {document_id} not found")

        if not document.content_text:
            raise ValueError(f"Document {document_id} has no content")

        logger.info(
            "chunking_started",
            document_id=document_id,
            content_length=len(document.content_text),
        )

        # Update status
        document.chunking_status = "processing"
        await db.flush()

        try:
            content = document.content_text

            # Phase 1 & 2: Detect topic boundaries
            pages = self.split_into_pages(content)
            boundaries = await self.detect_topic_boundaries(pages)

            logger.info(
                "boundaries_detected",
                document_id=document_id,
                num_pages=len(pages),
                num_boundaries=len(boundaries),
            )

            # Phase 3: Form chunks with overlap
            raw_chunks = self.form_chunks_with_overlap(content, boundaries)

            # Phase 4: Extract topics for each chunk
            processed_chunks = []
            for chunk in raw_chunks:
                topic_info = await self.extract_topics_for_chunk(chunk["content"])
                chunk.update(topic_info)
                processed_chunks.append(chunk)

            # Build concept map
            concept_map = await self.build_concept_map(processed_chunks)

            # Calculate totals
            total_tokens = sum(c["token_count"] for c in processed_chunks)

            # Store chunks in database
            await self._store_chunks(db, document_id, processed_chunks)

            # Store topics
            topics = await self._store_topics(db, document_id, boundaries)

            # Store concept map
            await self._store_concept_map(db, document_id, concept_map)

            # Update document status
            document.chunking_status = "complete"
            document.total_chunks = len(processed_chunks)
            document.total_tokens = total_tokens
            await db.flush()

            logger.info(
                "chunking_complete",
                document_id=document_id,
                num_chunks=len(processed_chunks),
                total_tokens=total_tokens,
            )

            return ChunkResult(
                chunks=processed_chunks,
                topics=[{"name": b.topic_name, "pages": b.page_numbers} for b in boundaries],
                concept_map=concept_map,
                total_tokens=total_tokens,
            )

        except Exception as e:
            document.chunking_status = "failed"
            await db.flush()
            logger.error("chunking_failed", document_id=document_id, error=str(e))
            raise

    async def _store_chunks(
        self,
        db: AsyncSession,
        document_id: int,
        chunks: List[Dict[str, Any]],
    ) -> None:
        """Store chunks in database."""
        # Delete existing chunks
        await db.execute(
            text("DELETE FROM document_chunks WHERE document_id = :doc_id"),
            {"doc_id": document_id},
        )

        for chunk in chunks:
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                token_count=chunk["token_count"],
                start_char=chunk["start_char"],
                end_char=chunk["end_char"],
                section_title=chunk.get("section_title"),
                chunk_type="text",
                page_numbers=chunk.get("page_numbers"),
                topics=chunk.get("topics"),
                primary_topic=chunk.get("primary_topic"),
                key_concepts=chunk.get("key_concepts"),
                embedding_status="pending",
            )
            db.add(db_chunk)

        await db.flush()

    async def _store_topics(
        self,
        db: AsyncSession,
        document_id: int,
        boundaries: List[TopicBoundary],
    ) -> List[Dict[str, Any]]:
        """Store topics in database."""
        # Delete existing topics
        await db.execute(
            text("DELETE FROM document_topics WHERE document_id = :doc_id"),
            {"doc_id": document_id},
        )

        topics = []
        for boundary in boundaries:
            db_topic = DocumentTopic(
                document_id=document_id,
                topic_name=boundary.topic_name,
                chunk_ids=[],  # Will be filled after chunks are stored with IDs
                key_concepts=[],
            )
            db.add(db_topic)
            topics.append({"name": boundary.topic_name, "pages": boundary.page_numbers})

        await db.flush()
        return topics

    async def _store_concept_map(
        self,
        db: AsyncSession,
        document_id: int,
        concept_map: Dict[str, Any],
    ) -> None:
        """Store concept map in database."""
        # Delete existing concept map
        await db.execute(
            text("DELETE FROM document_concept_maps WHERE document_id = :doc_id"),
            {"doc_id": document_id},
        )

        total_concepts = len(concept_map)
        total_relationships = sum(len(c.get("related", [])) for c in concept_map.values())

        db_map = DocumentConceptMap(
            document_id=document_id,
            concept_map=concept_map,
            total_concepts=total_concepts,
            total_relationships=total_relationships,
        )
        db.add(db_map)
        await db.flush()

    async def _call_ai(self, prompt: str, max_tokens: int = 100) -> str:
        """Call AI for topic extraction."""
        if settings.ai_provider == "anthropic":
            return await self._call_anthropic(prompt, max_tokens)
        elif settings.ai_provider == "openai":
            return await self._call_openai(prompt, max_tokens)
        else:
            # Fallback to anthropic
            return await self._call_anthropic(prompt, max_tokens)

    async def _call_anthropic(self, prompt: str, max_tokens: int) -> str:
        """Call Anthropic API."""
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=settings.anthropic_api_key)

        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text

    async def _call_openai(self, prompt: str, max_tokens: int) -> str:
        """Call OpenAI API."""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.choices[0].message.content


# Global service instance
chunking_service = ChunkingService()
