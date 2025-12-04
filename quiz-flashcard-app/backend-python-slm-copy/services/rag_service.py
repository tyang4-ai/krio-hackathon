"""
RAG (Retrieval-Augmented Generation) service for semantic context retrieval.

This service provides intelligent context retrieval for question generation
by leveraging pgvector similarity search and intelligent context formatting.

Phase 3 of RAG Pipeline Implementation.
"""
import hashlib
from functools import lru_cache
from typing import Dict, List, Optional, Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from services.embedding_service import embedding_service

logger = structlog.get_logger()

# Token estimation constants (conservative estimates)
CHARS_PER_TOKEN = 4  # Average for English text
DEFAULT_CONTEXT_TOKEN_BUDGET = 6000  # Leave room for prompt + response
MAX_CHUNK_TOKENS = 1000  # Max tokens per chunk in context


class RAGService:
    """
    Service for retrieval-augmented generation context.

    Retrieves semantically relevant document chunks and formats them
    for use in question generation prompts.
    """

    def __init__(
        self,
        context_token_budget: int = DEFAULT_CONTEXT_TOKEN_BUDGET,
        max_chunk_tokens: int = MAX_CHUNK_TOKENS,
    ):
        """
        Initialize RAG service.

        Args:
            context_token_budget: Maximum tokens for context
            max_chunk_tokens: Maximum tokens per individual chunk
        """
        self.context_token_budget = context_token_budget
        self.max_chunk_tokens = max_chunk_tokens
        self._context_cache: Dict[str, List[Dict]] = {}

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        return len(text) // CHARS_PER_TOKEN

    def _cache_key(
        self,
        category_id: int,
        query: str,
        document_ids: Optional[List[int]] = None,
        top_k: int = 20,
    ) -> str:
        """Generate cache key for context retrieval."""
        doc_str = ",".join(str(d) for d in sorted(document_ids)) if document_ids else ""
        raw_key = f"{category_id}:{query}:{doc_str}:{top_k}"
        return hashlib.md5(raw_key.encode()).hexdigest()

    async def retrieve_context(
        self,
        db: AsyncSession,
        category_id: int,
        query: str,
        document_ids: Optional[List[int]] = None,
        top_k: int = 20,
        use_cache: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve semantically relevant context chunks.

        Args:
            db: Database session
            category_id: Category to search within
            query: Search query (topic/concept to generate questions about)
            document_ids: Optional filter to specific documents
            top_k: Maximum number of chunks to retrieve
            use_cache: Whether to use context cache

        Returns:
            List of chunk dictionaries with content and metadata
        """
        # Check cache
        cache_key = self._cache_key(category_id, query, document_ids, top_k)
        if use_cache and cache_key in self._context_cache:
            logger.debug("rag_cache_hit", cache_key=cache_key[:8])
            return self._context_cache[cache_key]

        logger.info(
            "rag_retrieving_context",
            category_id=category_id,
            query=query[:100],
            document_ids=document_ids,
            top_k=top_k,
        )

        # Use embedding service for similarity search
        chunks = await embedding_service.search_similar_chunks(
            db=db,
            query=query,
            category_id=category_id,
            top_k=top_k,
            document_ids=document_ids,
            similarity_threshold=0.3,  # Configurable threshold
        )

        logger.info(
            "rag_context_retrieved",
            num_chunks=len(chunks),
            top_similarity=chunks[0]["similarity"] if chunks else 0,
        )

        # Cache results
        if use_cache:
            self._context_cache[cache_key] = chunks

        return chunks

    def format_context_for_prompt(
        self,
        chunks: List[Dict[str, Any]],
        include_metadata: bool = True,
    ) -> str:
        """
        Format retrieved chunks into a context string for the LLM prompt.

        Respects token budget and prioritizes higher similarity chunks.

        Args:
            chunks: List of chunk dictionaries from retrieve_context
            include_metadata: Whether to include section titles and topics

        Returns:
            Formatted context string
        """
        if not chunks:
            return ""

        context_parts = []
        total_tokens = 0

        for i, chunk in enumerate(chunks):
            # Build chunk text
            chunk_parts = []

            if include_metadata:
                if chunk.get("section_title"):
                    chunk_parts.append(f"[Section: {chunk['section_title']}]")
                if chunk.get("primary_topic"):
                    chunk_parts.append(f"[Topic: {chunk['primary_topic']}]")

            chunk_parts.append(chunk["content"])

            chunk_text = "\n".join(chunk_parts)
            chunk_tokens = self._estimate_tokens(chunk_text)

            # Truncate chunk if too long
            if chunk_tokens > self.max_chunk_tokens:
                max_chars = self.max_chunk_tokens * CHARS_PER_TOKEN
                chunk_text = chunk_text[:max_chars] + "..."
                chunk_tokens = self.max_chunk_tokens

            # Check if we have budget
            if total_tokens + chunk_tokens > self.context_token_budget:
                logger.debug(
                    "rag_context_budget_reached",
                    chunks_included=i,
                    total_chunks=len(chunks),
                    total_tokens=total_tokens,
                )
                break

            context_parts.append(f"--- Chunk {i+1} (similarity: {chunk['similarity']:.3f}) ---\n{chunk_text}")
            total_tokens += chunk_tokens

        context = "\n\n".join(context_parts)

        logger.info(
            "rag_context_formatted",
            num_chunks_included=len(context_parts),
            estimated_tokens=total_tokens,
        )

        return context

    async def get_context_with_concepts(
        self,
        db: AsyncSession,
        category_id: int,
        topics: List[str],
        document_ids: Optional[List[int]] = None,
        chunks_per_topic: int = 5,
    ) -> Dict[str, Any]:
        """
        Retrieve context organized by topics/concepts.

        Useful for generating diverse questions across multiple topics.

        Args:
            db: Database session
            category_id: Category to search within
            topics: List of topics to retrieve context for
            document_ids: Optional filter to specific documents
            chunks_per_topic: Number of chunks per topic

        Returns:
            Dictionary with context organized by topic
        """
        result = {
            "topics": {},
            "total_chunks": 0,
            "formatted_context": "",
        }

        all_chunks = []

        for topic in topics:
            chunks = await self.retrieve_context(
                db=db,
                category_id=category_id,
                query=topic,
                document_ids=document_ids,
                top_k=chunks_per_topic,
                use_cache=True,
            )

            result["topics"][topic] = {
                "chunks": chunks,
                "count": len(chunks),
            }
            all_chunks.extend(chunks)

        # Deduplicate chunks by ID
        seen_ids = set()
        unique_chunks = []
        for chunk in all_chunks:
            if chunk["id"] not in seen_ids:
                seen_ids.add(chunk["id"])
                unique_chunks.append(chunk)

        # Sort by similarity and format
        unique_chunks.sort(key=lambda x: x["similarity"], reverse=True)
        result["total_chunks"] = len(unique_chunks)
        result["formatted_context"] = self.format_context_for_prompt(unique_chunks)

        return result

    def build_generation_prompt_context(
        self,
        chunks: List[Dict[str, Any]],
        few_shot_examples: Optional[Dict] = None,
        quality_criteria: Optional[Dict] = None,
        bloom_targets: Optional[List[str]] = None,
    ) -> str:
        """
        Build complete context section for question generation prompt.

        Combines RAG context with few-shot examples and quality guidance.

        Args:
            chunks: Retrieved context chunks
            few_shot_examples: Best sample questions from analysis
            quality_criteria: Quality scoring weights and thresholds
            bloom_targets: Target Bloom's taxonomy levels

        Returns:
            Complete context section for generation prompt
        """
        sections = []

        # 1. Source Material Context
        context = self.format_context_for_prompt(chunks)
        if context:
            sections.append(f"## Source Material\n\n{context}")

        # 2. Few-Shot Examples (if available)
        if few_shot_examples and few_shot_examples.get("questions"):
            examples_text = self._format_few_shot_examples(few_shot_examples)
            sections.append(f"## Example High-Quality Questions\n\n{examples_text}")

        # 3. Quality Criteria (if available)
        if quality_criteria:
            criteria_text = self._format_quality_criteria(quality_criteria)
            sections.append(f"## Quality Requirements\n\n{criteria_text}")

        # 4. Bloom's Taxonomy Targets (if available)
        if bloom_targets:
            bloom_text = self._format_bloom_targets(bloom_targets)
            sections.append(f"## Cognitive Level Targets\n\n{bloom_text}")

        return "\n\n".join(sections)

    def _format_few_shot_examples(self, few_shot_examples: Dict) -> str:
        """Format few-shot examples for the prompt."""
        lines = []
        questions = few_shot_examples.get("questions", [])

        for i, q in enumerate(questions[:3], 1):  # Max 3 examples to save tokens
            lines.append(f"### Example {i}")
            lines.append(f"**Question:** {q.get('question_text', '')}")

            if q.get("options"):
                lines.append("**Options:**")
                for opt in q["options"]:
                    lines.append(f"  - {opt}")

            lines.append(f"**Answer:** {q.get('correct_answer', '')}")

            if q.get("explanation"):
                lines.append(f"**Explanation:** {q['explanation'][:200]}...")

            scores = q.get("quality_scores", {})
            if scores:
                overall = scores.get("overall", 0)
                lines.append(f"**Quality Score:** {overall:.2f}/5")

            lines.append("")

        return "\n".join(lines)

    def _format_quality_criteria(self, quality_criteria: Dict) -> str:
        """Format quality criteria for the prompt."""
        lines = []

        weights = quality_criteria.get("weights", {})
        if weights:
            lines.append("**Scoring Dimensions (by importance):**")
            sorted_weights = sorted(weights.items(), key=lambda x: x[1], reverse=True)
            for dim, weight in sorted_weights:
                pct = int(weight * 100)
                lines.append(f"  - {dim.replace('_', ' ').title()}: {pct}%")

        summary = quality_criteria.get("analysis_summary", {})
        if summary:
            lines.append("")
            lines.append("**Target Quality:**")
            avg = summary.get("average_quality", 0)
            lines.append(f"  - Minimum acceptable: {avg:.1f}/5")
            if summary.get("strongest_dimension"):
                lines.append(f"  - Emphasize: {summary['strongest_dimension'].replace('_', ' ')}")
            if summary.get("weakest_dimension"):
                lines.append(f"  - Improve: {summary['weakest_dimension'].replace('_', ' ')}")

        return "\n".join(lines)

    def _format_bloom_targets(self, bloom_targets: List[str]) -> str:
        """Format Bloom's taxonomy targets for the prompt."""
        level_descriptions = {
            "remember": "recall facts and basic concepts",
            "understand": "explain ideas or concepts",
            "apply": "use information in new situations",
            "analyze": "draw connections among ideas",
            "evaluate": "justify a stance or decision",
            "create": "produce new or original work",
        }

        lines = ["Generate questions at these cognitive levels:"]
        for level in bloom_targets:
            desc = level_descriptions.get(level.lower(), "")
            lines.append(f"  - **{level.title()}**: {desc}")

        return "\n".join(lines)

    def clear_cache(self, category_id: Optional[int] = None) -> int:
        """
        Clear context cache.

        Args:
            category_id: If provided, only clear cache for this category

        Returns:
            Number of cache entries cleared
        """
        if category_id is None:
            count = len(self._context_cache)
            self._context_cache.clear()
            return count

        # Clear entries for specific category
        keys_to_remove = [
            k for k in self._context_cache.keys()
            if k.startswith(f"{category_id}:")
        ]
        for k in keys_to_remove:
            del self._context_cache[k]
        return len(keys_to_remove)


# Global service instance
rag_service = RAGService()
