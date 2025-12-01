"""
Chapter Analysis Agent - Analyzes documents to detect chapter/section boundaries.

Responsibilities:
- Detect chapter headings and section breaks in documents
- Extract table of contents structure
- Identify logical content boundaries
- Return structured chapter information for document splitting
"""
import json
import re
from typing import Any, Dict, List, Tuple

import structlog

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()


# Token estimation and chunking utilities
# Claude models use roughly 4 characters per token on average
CHARS_PER_TOKEN = 4
MAX_CHUNK_TOKENS = 4096
MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN  # ~16384 characters


def estimate_tokens(text: str) -> int:
    """
    Estimate the number of tokens in a text string.

    Uses a rough heuristic of ~4 characters per token.
    This is an approximation - actual tokenization varies by content.

    Args:
        text: The text to estimate tokens for

    Returns:
        Estimated token count
    """
    if not text:
        return 0
    return len(text) // CHARS_PER_TOKEN


def chunk_content(content: str, max_tokens: int = MAX_CHUNK_TOKENS) -> List[Tuple[int, str]]:
    """
    Split content into chunks of approximately max_tokens each.

    Tries to split on paragraph boundaries to preserve context.
    Returns list of (chunk_index, chunk_content) tuples.

    Args:
        content: The full content to chunk
        max_tokens: Maximum tokens per chunk (default 4096)

    Returns:
        List of (chunk_number, chunk_text) tuples
    """
    if not content:
        return []

    max_chars = max_tokens * CHARS_PER_TOKEN
    total_tokens = estimate_tokens(content)

    # If content fits in one chunk, return as-is
    if total_tokens <= max_tokens:
        return [(1, content)]

    chunks = []
    current_pos = 0
    chunk_num = 1

    while current_pos < len(content):
        # Calculate end position for this chunk
        end_pos = current_pos + max_chars

        if end_pos >= len(content):
            # Last chunk - take everything remaining
            chunks.append((chunk_num, content[current_pos:]))
            break

        # Try to find a good break point (paragraph, sentence, or word boundary)
        # Look backwards from end_pos to find a natural break
        search_start = max(current_pos + (max_chars // 2), current_pos)  # Don't go back too far

        # Try paragraph break first (double newline)
        para_break = content.rfind('\n\n', search_start, end_pos)
        if para_break != -1:
            end_pos = para_break + 2
        else:
            # Try single newline
            line_break = content.rfind('\n', search_start, end_pos)
            if line_break != -1:
                end_pos = line_break + 1
            else:
                # Try sentence end (. ! ?)
                for punct in ['. ', '! ', '? ']:
                    sent_break = content.rfind(punct, search_start, end_pos)
                    if sent_break != -1:
                        end_pos = sent_break + len(punct)
                        break
                else:
                    # Try word boundary (space)
                    space_break = content.rfind(' ', search_start, end_pos)
                    if space_break != -1:
                        end_pos = space_break + 1

        # Add this chunk
        chunk_text = content[current_pos:end_pos].strip()
        if chunk_text:
            chunks.append((chunk_num, chunk_text))
            chunk_num += 1

        current_pos = end_pos

    logger.info(
        "content_chunked",
        total_chars=len(content),
        total_tokens=total_tokens,
        num_chunks=len(chunks),
        chunk_sizes=[estimate_tokens(c[1]) for c in chunks],
    )

    return chunks


def build_chunked_prompt(
    chunks: List[Tuple[int, str]],
    total_chunks: int,
    category_name: str = "",
) -> str:
    """
    Build a prompt that includes all chunks with clear indicators.

    Args:
        chunks: List of (chunk_number, chunk_content) tuples
        total_chunks: Total number of chunks in the full document
        category_name: Optional category name for context

    Returns:
        Formatted prompt string with chunk indicators
    """
    prompt_parts = []

    prompt_parts.append(f"""IMPORTANT: The following content has been split into {total_chunks} parts due to length.
All parts are from the SAME document set and should be organized together as a unified whole.
Please analyze ALL parts before determining the chapter/unit structure.

""")

    for chunk_num, chunk_content in chunks:
        prompt_parts.append(f"""
{'='*60}
PART {chunk_num} OF {total_chunks}
{'='*60}

{chunk_content}

""")

    prompt_parts.append(f"""
{'='*60}
END OF ALL PARTS
{'='*60}

Now organize ALL the content above{f' for "{category_name}"' if category_name else ''} into chapters and units.
Remember: These parts are from a SINGLE document set - organize them as one cohesive whole.""")

    return "".join(prompt_parts)


def normalize_whitespace(text: str) -> str:
    """
    Normalize all whitespace in text to single spaces.

    Converts newlines, tabs, and multiple spaces to single spaces.
    This helps match text when AI returns markers with collapsed whitespace.

    Args:
        text: Text to normalize

    Returns:
        Text with normalized whitespace
    """
    if not text:
        return ""
    # Replace all whitespace sequences (newlines, tabs, multiple spaces) with single space
    return re.sub(r'\s+', ' ', text).strip()


def extract_key_words(text: str, max_words: int = 5) -> List[str]:
    """
    Extract the first few meaningful words from text for matching.

    Args:
        text: Text to extract words from
        max_words: Maximum number of words to extract

    Returns:
        List of lowercase words
    """
    if not text:
        return []
    # Remove punctuation and normalize
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    words = cleaned.split()
    # Filter out very short words
    words = [w for w in words if len(w) > 2]
    return words[:max_words]


def find_with_normalized_whitespace(content: str, marker: str, search_from: int = 0) -> int:
    """
    Find a marker in content, handling whitespace differences.

    The AI often returns markers with spaces where the original has newlines.
    This function tries multiple matching strategies:
    1. Exact match
    2. Case-insensitive match
    3. Word-based match (extract key words and find sequence)
    4. Partial match (first 30 chars normalized)

    Args:
        content: The full content to search in
        marker: The marker text to find
        search_from: Start searching from this position (default 0)

    Returns:
        Position in original content where marker starts, or -1 if not found
    """
    if not marker:
        return -1

    # Limit search area
    search_content = content[search_from:] if search_from > 0 else content

    logger.info(
        "marker_search_attempt",
        marker_preview=marker[:80] if len(marker) > 80 else marker,
        marker_length=len(marker),
        search_from=search_from,
        content_length=len(search_content),
    )

    # Strategy 1: Exact match
    pos = search_content.find(marker)
    if pos != -1:
        logger.info("marker_found", strategy="exact", marker=marker[:30], position=search_from + pos)
        return search_from + pos

    # Strategy 2: Case-insensitive match
    pos = search_content.lower().find(marker.lower())
    if pos != -1:
        logger.info("marker_found", strategy="case_insensitive", marker=marker[:30], position=search_from + pos)
        return search_from + pos

    # Strategy 3: Word-based matching - find the key words in sequence
    key_words = extract_key_words(marker, max_words=4)
    if len(key_words) >= 2:
        # Build a regex pattern to find these words with any whitespace between them
        pattern = r'\s*'.join(re.escape(w) for w in key_words)
        match = re.search(pattern, search_content.lower())
        if match:
            logger.info(
                "marker_found",
                strategy="word_sequence",
                marker=marker[:30],
                matched_text=search_content[match.start():match.start()+50],
                position=search_from + match.start()
            )
            return search_from + match.start()

    # Strategy 4: Normalized whitespace - convert all whitespace to single space and match
    normalized_marker = normalize_whitespace(marker)
    normalized_content = normalize_whitespace(search_content)

    # Find in normalized version
    norm_pos = normalized_content.lower().find(normalized_marker.lower())
    if norm_pos != -1:
        # Map back to original position - approximate by ratio
        ratio = len(search_content) / len(normalized_content) if len(normalized_content) > 0 else 1
        approx_pos = int(norm_pos * ratio)

        # Search around this approximate position for actual text
        search_start = max(0, approx_pos - 200)
        search_end = min(len(search_content), approx_pos + 200)

        # Use first few words to find exact position
        first_words = extract_key_words(marker, max_words=3)
        if first_words:
            pattern = r'\s*'.join(re.escape(w) for w in first_words)
            local_match = re.search(pattern, search_content[search_start:search_end].lower())
            if local_match:
                logger.info(
                    "marker_found",
                    strategy="normalized_mapped",
                    marker=marker[:30],
                    position=search_from + search_start + local_match.start()
                )
                return search_from + search_start + local_match.start()

        # Fallback: just return approximate position
        logger.info(
            "marker_found",
            strategy="normalized_approx",
            marker=marker[:30],
            position=search_from + approx_pos
        )
        return search_from + approx_pos

    # Strategy 5: Very short partial match (first 20-30 chars of key content)
    # Extract just the first meaningful phrase
    partial = marker[:min(40, len(marker))]
    partial_normalized = normalize_whitespace(partial).lower()

    if len(partial_normalized) >= 10:
        # Find this partial in normalized content
        norm_pos = normalized_content.lower().find(partial_normalized)
        if norm_pos != -1:
            ratio = len(search_content) / len(normalized_content) if len(normalized_content) > 0 else 1
            approx_pos = int(norm_pos * ratio)
            logger.info(
                "marker_found",
                strategy="partial_normalized",
                marker=partial[:30],
                position=search_from + approx_pos
            )
            return search_from + approx_pos

    logger.warning(
        "marker_not_found",
        marker=marker[:80] if len(marker) > 80 else marker,
        marker_length=len(marker),
        key_words_tried=key_words if len(key_words) >= 2 else "none",
    )
    return -1


CHAPTER_ANALYSIS_SYSTEM_PROMPT = """You are an academic note-organization assistant specializing in structuring class notes.

Your task is to:
1. Identify chapter headings, section titles, and major topic divisions
2. Detect patterns like "Chapter 1", "Section A", numbered headings, etc.
3. Extract the hierarchical structure of the document
4. Find natural content boundaries based on topic changes

CRITICAL RULES:
- Do NOT delete, rewrite, summarize, or alter any wording
- Preserve all original text exactly as provided
- Your only task is structural reorganization, not editing

Always respond with valid JSON containing the detected chapters/sections."""


# System prompt from sample prompt.json - exact copy
ORGANIZE_SYSTEM_PROMPT = """You are an academic note-organization assistant. Your task for this entire conversation is to reorganize any notes I provide into a structured format without changing their content.

RULES:

Content Handling:
- Do NOT delete, rewrite, summarize, or alter wording.
- Preserve all original text exactly.

Structure:
- Target: Chapter → Unit → Content
- Logic: Infer chapters and units based on headings, topic shifts, or patterns. If unclear, assign neutral placeholders (e.g., 'Chapter 1 – Untitled').

Inputs:
- Accept PDFs, DOCX, TXT, pasted text, and mixed formats. Notes may be bullet points, paragraphs, messy fragments, or partially organized.

Outputs:
- Produce a hierarchical outline of chapters and units with unchanged content.
- Generate one PDF per chapter with unit sub-sections.
- Provide a table of contents listing detected chapters and units.
- Return downloadable PDFs for each chapter.

Workflow:
1. Parse the provided notes.
2. Detect chapter boundaries.
3. Detect units within chapters.
4. Reorganize content into Chapter → Unit format.
5. Export each chapter as a separate PDF.
6. Output TOC + download links.

Constraints:
- No commentary unless asked.
- No merging unless clearly necessary.
- No duplication.
- Maintain original order within units.

Always respond with valid JSON only."""


class ChapterAgent(BaseAgent):
    """
    Agent that analyzes documents to detect chapter/section structure.

    Used when users upload large documents and want to automatically
    identify chapters for splitting or tagging.
    """

    def __init__(self):
        """Initialize the Chapter Analysis Agent."""
        super().__init__(
            role=AgentRole.ANALYSIS,
            system_prompt=CHAPTER_ANALYSIS_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze document content for chapter structure.

        Args:
            input_data: Dict containing:
                - content: Full document text content

        Returns:
            Detected chapters with titles and boundaries
        """
        content = input_data.get("content", "")

        if not content:
            return {
                "success": False,
                "error": "No content provided for chapter analysis",
            }

        logger.info(
            "chapter_agent_processing",
            content_length=len(content),
        )

        # Build prompt
        prompt = self._build_analysis_prompt(content)

        try:
            response = await self.generate_json(prompt, max_tokens=4096)
            chapters = self._parse_chapters_response(response, content)

            logger.info(
                "chapter_agent_completed",
                chapters_detected=len(chapters),
            )

            return {
                "success": True,
                "chapters": chapters,
            }

        except Exception as e:
            logger.error("chapter_agent_error", error=str(e))
            return {
                "success": False,
                "error": f"Chapter analysis failed: {str(e)}",
            }

    def _build_analysis_prompt(self, content: str) -> str:
        """Build the prompt for chapter analysis."""
        # Truncate content if too long (we need to see structure, not all content)
        max_content_length = 12000
        if len(content) > max_content_length:
            # Take beginning, middle, and end to see full structure
            third = max_content_length // 3
            content = (
                content[:third]
                + "\n\n[... content truncated ...]\n\n"
                + content[len(content) // 2 - third // 2 : len(content) // 2 + third // 2]
                + "\n\n[... content truncated ...]\n\n"
                + content[-third:]
            )

        return f"""Analyze this document and identify all chapters, sections, or major topic divisions.

DOCUMENT CONTENT:
{content}

ANALYSIS INSTRUCTIONS:
1. Look for chapter headings (e.g., "Chapter 1:", "CHAPTER ONE", "1. Introduction")
2. Look for section markers (e.g., "Section A", "Part I", "Unit 1")
3. Look for numbered or lettered headings (e.g., "1.0", "A.", "I.")
4. Identify major topic changes even without explicit headings
5. Consider document structure patterns (bold text, all caps, numbered lines)

For each detected chapter/section, provide:
- title: The chapter/section title or a descriptive name
- start_pattern: The text that marks the start (first ~50 characters)
- content_preview: A brief preview of what this section covers (~100 characters)

Respond with JSON in this exact format:
{{
    "chapters": [
        {{
            "title": "Chapter or section title",
            "start_pattern": "Text marking the start of this section",
            "content_preview": "Brief preview of section content..."
        }}
    ],
    "structure_type": "chapters|sections|topics|mixed",
    "notes": "Any observations about the document structure"
}}

If no clear chapters or sections are found, return an empty chapters array and note that in the notes field."""

    def _parse_chapters_response(
        self, response: str, original_content: str
    ) -> List[Dict[str, Any]]:
        """Parse the AI response and calculate actual character indices."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            raw_chapters = data.get("chapters", [])

            # Calculate actual indices based on start_pattern
            chapters_with_indices = []
            last_end = 0

            for i, ch in enumerate(raw_chapters):
                title = ch.get("title", "Untitled")
                start_pattern = ch.get("start_pattern", "")
                content_preview = ch.get("content_preview", "")

                # Find the start_pattern in the original content
                start_index = 0
                if start_pattern:
                    # Search after the last chapter ended
                    found_index = original_content.find(start_pattern, last_end)
                    if found_index != -1:
                        start_index = found_index
                    else:
                        # Try a fuzzy match - look for the title
                        title_index = original_content.lower().find(
                            title.lower(), last_end
                        )
                        if title_index != -1:
                            start_index = title_index
                        else:
                            # Default to after last chapter
                            start_index = last_end

                # Calculate end_index (start of next chapter or end of document)
                if i < len(raw_chapters) - 1:
                    next_pattern = raw_chapters[i + 1].get("start_pattern", "")
                    if next_pattern:
                        next_start = original_content.find(next_pattern, start_index + 1)
                        end_index = next_start if next_start != -1 else len(original_content)
                    else:
                        end_index = len(original_content)
                else:
                    end_index = len(original_content)

                # Get actual content preview from the document
                actual_preview = original_content[
                    start_index : min(start_index + 200, end_index)
                ].strip()
                if len(actual_preview) > 150:
                    actual_preview = actual_preview[:150] + "..."

                chapters_with_indices.append({
                    "title": title,
                    "start_index": start_index,
                    "end_index": end_index,
                    "content_preview": actual_preview or content_preview,
                })

                last_end = start_index + 1

            return chapters_with_indices

        except json.JSONDecodeError:
            logger.warning(
                "chapter_parse_failed", response_preview=response[:200]
            )
            return []

    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON."""
        response = re.sub(r"```json\s*", "", response)
        response = re.sub(r"```\s*", "", response)

        start = response.find("{")
        end = response.rfind("}") + 1

        if start != -1 and end > start:
            cleaned = response[start:end]
            cleaned = re.sub(r",\s*}", "}", cleaned)
            cleaned = re.sub(r",\s*]", "]", cleaned)
            return cleaned

        return response


async def analyze_document_chapters(content: str) -> Dict[str, Any]:
    """
    Analyze a document to detect chapter/section structure.

    Args:
        content: The full text content of the document

    Returns:
        Dict with success status and detected chapters
    """
    agent = ChapterAgent()
    return await agent.process({"content": content})


async def organize_content_into_structure(
    content: str,
    category_name: str = "",
) -> Dict[str, Any]:
    """
    Organize content into a hierarchical structure (chapters/units/topics).

    Args:
        content: Combined text content from all documents
        category_name: Name of the category for context

    Returns:
        Organization structure with chapters, units, and topics
    """
    from services.ai_service import ai_service

    if not content:
        return {
            "success": False,
            "error": "No content provided for organization",
        }

    max_content_length = 10000
    if len(content) > max_content_length:
        content = content[:max_content_length] + "..."

    prompt = f"""Analyze this study material{f' for "{category_name}"' if category_name else ''} and organize it into a logical structure.

CONTENT TO ORGANIZE:
{content}

Create a hierarchical organization with:
- Chapters (major sections/themes)
- Units within each chapter (sub-sections)
- Key topics within each unit

OUTPUT FORMAT (JSON only, no markdown):
{{
    "title": "Organized Study Guide{f': {category_name}' if category_name else ''}",
    "summary": "Brief overview of the material (1-2 sentences)",
    "chapters": [
        {{
            "chapter_number": 1,
            "title": "Chapter Title",
            "description": "Brief chapter overview",
            "units": [
                {{
                    "unit_number": 1,
                    "title": "Unit Title",
                    "topics": ["Topic 1", "Topic 2", "Topic 3"],
                    "key_concepts": ["Concept 1", "Concept 2"],
                    "content_summary": "Brief summary of this unit's content"
                }}
            ]
        }}
    ]
}}

Identify natural groupings in the content. Create 2-6 chapters with 1-4 units each.
Focus on creating a clear, logical structure that would help a student study effectively."""

    try:
        response = await ai_service.generate_text(
            prompt=prompt,
            system_prompt="You are an expert educator who organizes study materials into clear, logical structures. Always respond with valid JSON only.",
            max_tokens=4000,
            temperature=0.3,
        )

        # Parse JSON response
        cleaned = re.sub(r"```json\s*", "", response)
        cleaned = re.sub(r"```\s*", "", cleaned)
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start != -1 and end > start:
            cleaned = cleaned[start:end]

        organization = json.loads(cleaned)

        logger.info(
            "content_organized",
            chapters_count=len(organization.get("chapters", [])),
        )

        return {
            "success": True,
            "organization": organization,
        }

    except json.JSONDecodeError as e:
        logger.error("organize_parse_error", error=str(e))
        return {
            "success": False,
            "error": "Failed to parse AI response as JSON",
        }
    except Exception as e:
        logger.error("organize_error", error=str(e))
        return {
            "success": False,
            "error": f"Organization failed: {str(e)}",
        }


def generate_organized_pdf(organization: Dict[str, Any]) -> bytes:
    """
    Generate a PDF from the organization structure.

    Args:
        organization: The organization dictionary with chapters/units

    Returns:
        PDF file as bytes
    """
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.colors import HexColor

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=1*inch,
        bottomMargin=1*inch,
        leftMargin=1*inch,
        rightMargin=1*inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        spaceAfter=30,
        textColor=HexColor('#1a1a2e'),
    )

    chapter_style = ParagraphStyle(
        'ChapterTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceBefore=20,
        spaceAfter=12,
        textColor=HexColor('#16213e'),
    )

    unit_style = ParagraphStyle(
        'UnitTitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=8,
        leftIndent=20,
        textColor=HexColor('#0f3460'),
    )

    topic_style = ParagraphStyle(
        'Topic',
        parent=styles['Normal'],
        fontSize=11,
        leftIndent=40,
        spaceBefore=4,
        textColor=HexColor('#333333'),
    )

    summary_style = ParagraphStyle(
        'Summary',
        parent=styles['Normal'],
        fontSize=11,
        leftIndent=40,
        spaceBefore=4,
        spaceAfter=8,
        textColor=HexColor('#555555'),
    )

    story = []

    # Title
    title = organization.get("title", "Organized Study Guide")
    story.append(Paragraph(title, title_style))

    # Summary
    summary = organization.get("summary", "")
    if summary:
        story.append(Paragraph(summary, styles['Normal']))
        story.append(Spacer(1, 20))

    # Chapters
    for chapter in organization.get("chapters", []):
        chapter_num = chapter.get("chapter_number", "")
        chapter_title = chapter.get("title", "Untitled Chapter")
        story.append(Paragraph(f"Chapter {chapter_num}: {chapter_title}", chapter_style))

        chapter_desc = chapter.get("description", "")
        if chapter_desc:
            story.append(Paragraph(chapter_desc, summary_style))

        # Units
        for unit in chapter.get("units", []):
            unit_num = unit.get("unit_number", "")
            unit_title = unit.get("title", "Untitled Unit")
            story.append(Paragraph(f"Unit {unit_num}: {unit_title}", unit_style))

            # Topics
            topics = unit.get("topics", [])
            if topics:
                for topic in topics:
                    story.append(Paragraph(f"* {topic}", topic_style))

            # Key Concepts
            concepts = unit.get("key_concepts", [])
            if concepts:
                story.append(Spacer(1, 6))
                story.append(Paragraph("Key Concepts:", topic_style))
                for concept in concepts:
                    story.append(Paragraph(f"  - {concept}", topic_style))

            # Content Summary
            content_summary = unit.get("content_summary", "")
            if content_summary:
                story.append(Spacer(1, 6))
                story.append(Paragraph(f"Summary: {content_summary}", summary_style))

            story.append(Spacer(1, 10))

        story.append(Spacer(1, 20))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


# Store the last AI response for debugging
_last_organize_debug = {
    "prompt": None,
    "raw_response": None,
    "parsed_response": None,
    "error": None,
}


def get_organize_debug_info() -> Dict[str, Any]:
    """Get debug info from the last organize operation."""
    return _last_organize_debug.copy()


async def organize_documents_with_full_content(
    documents: List[Dict[str, Any]],
    category_name: str = "",
) -> Dict[str, Any]:
    """
    Organize documents into chapters with units while PRESERVING full content.

    This function uses a two-step approach:
    1. AI analyzes content and returns chapter BOUNDARIES (start patterns)
    2. We use those boundaries to slice the ORIGINAL content

    This ensures full content is preserved even for very large documents.

    Args:
        documents: List of document dicts with 'id', 'original_name', 'content_text'
        category_name: Name of the category for context

    Returns:
        Organization with full content preserved per chapter/unit
    """
    global _last_organize_debug
    from services.ai_service import ai_service

    if not documents:
        return {
            "success": False,
            "error": "No documents provided for organization",
        }

    # Combine ALL document content for the AI to analyze and split
    combined_content = ""
    for doc in documents:
        content = doc.get("content_text") or ""
        doc_name = doc.get("original_name", "Untitled")
        combined_content += f"\n\n{'='*60}\nDOCUMENT: {doc_name}\n{'='*60}\n\n{content}"

    # Estimate tokens and check if chunking is needed
    total_tokens = estimate_tokens(combined_content)
    needs_chunking = total_tokens > MAX_CHUNK_TOKENS

    logger.info(
        "organize_content_input",
        total_docs=len(documents),
        combined_content_length=len(combined_content),
        estimated_tokens=total_tokens,
        needs_chunking=needs_chunking,
        category=category_name,
    )

    # Build the prompt - ask AI to identify BOUNDARIES only, not copy content
    chunks = []  # Initialize for tracking
    if needs_chunking:
        # Chunk the content and build a multi-part prompt
        chunks = chunk_content(combined_content, MAX_CHUNK_TOKENS)
        content_section = build_chunked_prompt(chunks, len(chunks), category_name)

        prompt = f"""{content_section}

YOUR TASK:
Analyze the content above and identify chapter/section BOUNDARIES.
DO NOT copy the content - just tell me WHERE each chapter starts.

For each chapter, provide:
1. A title for the chapter
2. The section HEADING or first few words that mark where this chapter starts
3. A brief description

OUTPUT FORMAT (JSON only):
{{
    "title": "Organized Study Guide{f': {category_name}' if category_name else ''}",
    "chapters": [
        {{
            "chapter_number": 1,
            "title": "Chapter Title",
            "start_marker": "The heading or first 3-5 words where this chapter begins",
            "description": "Brief description of what this chapter covers"
        }},
        {{
            "chapter_number": 2,
            "title": "Second Chapter Title",
            "start_marker": "Heading or first words of chapter 2",
            "description": "Brief description"
        }}
    ]
}}

IMPORTANT:
- The start_marker should be the HEADING TEXT or first 3-5 KEY WORDS of the section
- Keep start_marker SHORT (under 50 characters) - just the heading/title is best
- Example good markers: "Common Prefixes and Suffixes", "Body homeostasis mechanisms", "Cardiac Output"
- Example bad markers: long sentences or paragraphs copied verbatim
- Identify 2-8 major chapters based on topic changes, headings, or subject shifts
- DO NOT include the actual chapter content - we will extract it using your markers"""
    else:
        # No chunking needed - use same boundary-based approach
        prompt = f"""Here are the notes to organize{f' for "{category_name}"' if category_name else ''}:

{combined_content}

YOUR TASK:
Analyze the content above and identify chapter/section BOUNDARIES.
DO NOT copy the content - just tell me WHERE each chapter starts.

For each chapter, provide:
1. A title for the chapter
2. The section HEADING or first few words that mark where this chapter starts
3. A brief description

OUTPUT FORMAT (JSON only):
{{
    "title": "Organized Study Guide{f': {category_name}' if category_name else ''}",
    "chapters": [
        {{
            "chapter_number": 1,
            "title": "Chapter Title",
            "start_marker": "The heading or first 3-5 words where this chapter begins",
            "description": "Brief description of what this chapter covers"
        }},
        {{
            "chapter_number": 2,
            "title": "Second Chapter Title",
            "start_marker": "Heading or first words of chapter 2",
            "description": "Brief description"
        }}
    ]
}}

IMPORTANT:
- The start_marker should be the HEADING TEXT or first 3-5 KEY WORDS of the section
- Keep start_marker SHORT (under 50 characters) - just the heading/title is best
- Example good markers: "Common Prefixes and Suffixes", "Body homeostasis mechanisms", "Cardiac Output"
- Example bad markers: long sentences or paragraphs copied verbatim
- Identify 2-8 major chapters based on topic changes, headings, or subject shifts
- DO NOT include the actual chapter content - we will extract it using your markers"""

    # Store debug info
    _last_organize_debug["prompt"] = prompt[:2000] + "..." if len(prompt) > 2000 else prompt
    _last_organize_debug["raw_response"] = None
    _last_organize_debug["parsed_response"] = None
    _last_organize_debug["error"] = None
    _last_organize_debug["mode"] = "boundary_detection"
    _last_organize_debug["chunked"] = needs_chunking
    _last_organize_debug["num_chunks"] = len(chunks) if needs_chunking else 1
    _last_organize_debug["estimated_tokens"] = total_tokens

    try:
        # Use max_tokens of 4000 - we only need boundaries, not content
        response = await ai_service.generate_text(
            prompt=prompt,
            system_prompt="You are an expert at analyzing documents and identifying logical chapter boundaries. Return only valid JSON.",
            max_tokens=4000,
            temperature=0.2,
        )

        # Store raw response for debugging
        _last_organize_debug["raw_response"] = response
        logger.info(
            "organize_ai_response",
            response_length=len(response) if response else 0,
            response_preview=response[:500] if response else "EMPTY",
            mode=_last_organize_debug["mode"],
        )

        if not response:
            return {
                "success": False,
                "error": "AI returned empty response",
            }

        # Parse JSON response
        cleaned = re.sub(r"```json\s*", "", response)
        cleaned = re.sub(r"```\s*", "", cleaned)
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}") + 1
        if start_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx:end_idx]

        organization = json.loads(cleaned)
        _last_organize_debug["parsed_response"] = organization

        # Now extract ACTUAL content using the boundaries
        chapters = organization.get("chapters", [])
        chapters_with_content = []

        logger.info(
            "organize_boundaries_detected",
            num_chapters=len(chapters),
            chapter_titles=[ch.get("title") for ch in chapters],
            start_markers=[ch.get("start_marker", "")[:50] for ch in chapters],
        )

        # First pass: find all chapter start positions
        chapter_positions = []
        last_found_pos = 0

        for i, chapter in enumerate(chapters):
            chapter_num = chapter.get("chapter_number", i + 1)
            chapter_title = chapter.get("title", f"Chapter {chapter_num}")
            start_marker = chapter.get("start_marker", "")

            # Find start position - search from after the last found position
            # to ensure chapters are in sequence
            start_pos = -1
            if start_marker:
                # First try: search from last found position
                found_pos = find_with_normalized_whitespace(
                    combined_content, start_marker, search_from=last_found_pos
                )
                if found_pos != -1:
                    start_pos = found_pos
                    last_found_pos = found_pos + len(start_marker)
                else:
                    # Fallback: search from beginning (in case order is different)
                    found_pos = find_with_normalized_whitespace(combined_content, start_marker, search_from=0)
                    if found_pos != -1:
                        start_pos = found_pos
                        logger.warning(
                            "marker_found_out_of_order",
                            chapter_num=chapter_num,
                            title=chapter_title,
                            marker=start_marker[:50],
                            position=found_pos,
                        )

            if start_pos == -1:
                logger.warning(
                    "start_marker_not_found",
                    chapter_num=chapter_num,
                    title=chapter_title,
                    marker=start_marker[:50] if start_marker else "EMPTY",
                )

            chapter_positions.append({
                "chapter": chapter,
                "start_pos": start_pos,
            })

        # Sort by position (keeping -1s at the beginning)
        # This helps handle cases where AI returns chapters out of order
        found_chapters = [cp for cp in chapter_positions if cp["start_pos"] != -1]
        found_chapters.sort(key=lambda x: x["start_pos"])

        # Now extract content for each chapter
        for i, chapter in enumerate(chapters):
            chapter_num = chapter.get("chapter_number", i + 1)
            chapter_title = chapter.get("title", f"Chapter {chapter_num}")
            description = chapter.get("description", "")
            start_marker = chapter.get("start_marker", "")

            # Find this chapter's position in our found list
            start_pos = 0
            cp = next((cp for cp in chapter_positions if cp["chapter"] is chapter), None)
            if cp and cp["start_pos"] != -1:
                start_pos = cp["start_pos"]

            # Find end position - look for the next chapter that starts after this one
            end_pos = len(combined_content)
            for fc in found_chapters:
                if fc["start_pos"] > start_pos:
                    end_pos = fc["start_pos"]
                    break

            # Extract the actual content
            full_content = combined_content[start_pos:end_pos].strip()

            # Clean up document headers from content
            full_content = re.sub(r'^={60}\nDOCUMENT:.*?\n={60}\n*', '', full_content)

            logger.info(
                "chapter_content_extracted",
                chapter_num=chapter_num,
                title=chapter_title,
                start_pos=start_pos,
                end_pos=end_pos,
                content_length=len(full_content),
            )

            chapters_with_content.append({
                "chapter_number": chapter_num,
                "title": chapter_title,
                "description": description,
                "units": [],
                "documents": [],
                "full_content": full_content,
            })

        logger.info(
            "documents_organized_with_content",
            chapters_count=len(chapters_with_content),
            total_docs=len(documents),
            chapters_with_actual_content=sum(1 for ch in chapters_with_content if len(ch.get("full_content", "")) > 100),
            total_content_extracted=sum(len(ch.get("full_content", "")) for ch in chapters_with_content),
            mode=_last_organize_debug["mode"],
        )

        return {
            "success": True,
            "organization": {
                "title": organization.get("title", f"Organized Study Guide: {category_name}"),
                "chapters": chapters_with_content,
            },
            "debug": {
                "mode": _last_organize_debug["mode"],
                "response_length": len(response),
                "num_chapters": len(chapters_with_content),
                "total_content_extracted": sum(len(ch.get("full_content", "")) for ch in chapters_with_content),
            },
        }

    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse AI response as JSON: {str(e)}"
        _last_organize_debug["error"] = error_msg
        logger.error("organize_docs_parse_error", error=str(e), raw_response=response[:1000] if response else "NONE")
        return {
            "success": False,
            "error": error_msg,
            "debug": {
                "mode": _last_organize_debug.get("mode", "unknown"),
                "raw_response_preview": response[:2000] if response else "NONE",
            },
        }
    except Exception as e:
        error_msg = f"Organization failed: {str(e)}"
        _last_organize_debug["error"] = error_msg
        logger.error("organize_docs_error", error=str(e))
        return {
            "success": False,
            "error": error_msg,
        }


def generate_chapter_pdf(chapter: Dict[str, Any], category_name: str = "") -> bytes:
    """
    Generate a PDF for a single chapter with FULL content.

    Args:
        chapter: Chapter dict with 'title', 'description', 'full_content', 'documents'
        category_name: Category name for header

    Returns:
        PDF file as bytes
    """
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.colors import HexColor

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'ChapterTitle',
        parent=styles['Title'],
        fontSize=22,
        spaceAfter=20,
        textColor=HexColor('#1a1a2e'),
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=30,
        textColor=HexColor('#666666'),
    )

    doc_header_style = ParagraphStyle(
        'DocHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=HexColor('#16213e'),
        borderWidth=1,
        borderColor=HexColor('#e0e0e0'),
        borderPadding=5,
        backColor=HexColor('#f5f5f5'),
    )

    content_style = ParagraphStyle(
        'Content',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceBefore=6,
        spaceAfter=6,
    )

    story = []

    # Chapter title
    chapter_num = chapter.get("chapter_number", "")
    chapter_title = chapter.get("title", "Untitled Chapter")
    story.append(Paragraph(f"Chapter {chapter_num}: {chapter_title}", title_style))

    # Description
    desc = chapter.get("description", "")
    if desc:
        story.append(Paragraph(desc, subtitle_style))

    # Category info
    if category_name:
        story.append(Paragraph(f"Category: {category_name}", subtitle_style))

    story.append(Spacer(1, 20))

    # Document list
    docs = chapter.get("documents", [])
    if docs:
        story.append(Paragraph(f"Documents in this chapter: {len(docs)}", styles['Normal']))
        for d in docs:
            story.append(Paragraph(f"  • {d.get('name', 'Unknown')}", styles['Normal']))
        story.append(Spacer(1, 20))

    # Full content - render directly
    full_content = chapter.get("full_content", "")
    if full_content:
        # Clean up document header markers from the content
        # Remove patterns like "============================================================\nDOCUMENT: Name\n============================================================"
        cleaned_content = re.sub(r'={60}\nDOCUMENT:[^\n]*\n={60}\n*', '', full_content)
        cleaned_content = cleaned_content.strip()

        if cleaned_content:
            # Normalize the text formatting:
            # 1. Detect and fix word-per-line issue (common in PDF extraction)
            # 2. Preserve actual paragraph breaks and section headers
            # 3. Collapse multiple spaces into one

            # First, normalize all newlines and whitespace
            cleaned_content = re.sub(r'\n\s*\n', '\n\n', cleaned_content)  # Normalize varied paragraph breaks

            # Check if this looks like word-per-line output (many short "paragraphs")
            # by testing if most paragraphs are single words
            test_paragraphs = [p.strip() for p in cleaned_content.split('\n\n') if p.strip()]
            if test_paragraphs:
                single_word_count = sum(1 for p in test_paragraphs if len(p.split()) <= 2)
                single_word_ratio = single_word_count / len(test_paragraphs)

                # If more than 60% of "paragraphs" are 1-2 words, this is likely word-per-line extraction
                if single_word_ratio > 0.6 and len(test_paragraphs) > 10:
                    # Join everything with spaces - treat newlines as word separators
                    cleaned_content = re.sub(r'\n+', ' ', cleaned_content)

                    # Smart paragraph detection:
                    # 1. Break before ALL-CAPS headers (like "PREFIXES", "SUFFIXES", "FUNCTIONAL TERMS")
                    cleaned_content = re.sub(r'\s+([A-Z]{4,}(?:\s+[A-Z]+)*)\s+', r'\n\n\1\n\n', cleaned_content)

                    # 2. Break before title-case section headers (2-5 words, capitalized)
                    cleaned_content = re.sub(r'\s+((?:[A-Z][a-z]+\s+){1,4}[A-Z][a-z]+)(?=\s+[A-Z][a-z]+-?:|\s+●|\s+•)', r'\n\n\1\n\n', cleaned_content)

                    # 3. Break before bullet points
                    cleaned_content = re.sub(r'\s+(●|•)\s*', r'\n\n\1 ', cleaned_content)

                    # 4. Break between medical term definitions
                    # Pattern: "word) Term-:" or "word Term-:" or "word Term:" where Term starts with capital
                    # This handles: "Blood Hyper-:" and "adrenal Angio-:" and "(lipids) Medial:"
                    cleaned_content = re.sub(r'(\)|[a-z])\s+([A-Z][a-z]*(?:-|/)?\s*(?:/\s*)?[A-Z]?[a-z]*-?:)', r'\1\n\n\2', cleaned_content)

                    # 5. Also break before standalone terms with hyphen-colon like "-ase:" "-blast:"
                    cleaned_content = re.sub(r'\s+(-[a-z]+:)', r'\n\n\1', cleaned_content)

                    # 6. Break at major topic transitions
                    cleaned_content = re.sub(r'([.!?])\s+(Body homeostasis|Blood Flow|pH balance|Negative feedback|Positive feedback|Adaptive response|Condition PCO2)', r'\1\n\n\2', cleaned_content)

                    # 7. Break before "Body →" pathway notation
                    cleaned_content = re.sub(r'\s+(Body\s*→)', r'\n\n\1', cleaned_content)

                    # Clean up any triple+ newlines
                    cleaned_content = re.sub(r'\n{3,}', '\n\n', cleaned_content)

            # Split into paragraphs
            paragraphs = cleaned_content.split('\n\n')

            for para in paragraphs:
                para = para.strip()
                if para:
                    # Convert single newlines to spaces (fixes word-per-line issue)
                    para = para.replace('\n', ' ')
                    # Collapse multiple spaces
                    para = re.sub(r' +', ' ', para)

                    # Escape special characters for reportlab
                    para = para.replace('&', '&amp;')
                    para = para.replace('<', '&lt;')
                    para = para.replace('>', '&gt;')

                    try:
                        story.append(Paragraph(para, content_style))
                    except Exception:
                        # If paragraph fails, add as plain text (truncated)
                        story.append(Paragraph(para[:500] + "...", content_style))
                    story.append(Spacer(1, 6))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_all_chapter_pdfs(organization: Dict[str, Any], category_name: str = "") -> List[Dict[str, Any]]:
    """
    Generate separate PDFs for each chapter.

    Args:
        organization: Organization dict with 'chapters' list
        category_name: Category name

    Returns:
        List of dicts with 'chapter_number', 'title', 'filename', 'pdf_base64'
    """
    import base64

    chapter_pdfs = []

    for chapter in organization.get("chapters", []):
        try:
            pdf_bytes = generate_chapter_pdf(chapter, category_name)
            pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

            chapter_num = chapter.get("chapter_number", 0)
            title = chapter.get("title", "Untitled")
            safe_title = re.sub(r'[^\w\s-]', '', title).replace(' ', '_')

            chapter_pdfs.append({
                "chapter_number": chapter_num,
                "title": title,
                "filename": f"Chapter_{chapter_num}_{safe_title}.pdf",
                "pdf_base64": pdf_base64,
                "document_count": len(chapter.get("documents", [])),
            })

        except Exception as e:
            logger.error("chapter_pdf_generation_error", chapter=chapter.get("title"), error=str(e))
            chapter_pdfs.append({
                "chapter_number": chapter.get("chapter_number", 0),
                "title": chapter.get("title", "Untitled"),
                "filename": None,
                "pdf_base64": None,
                "error": str(e),
            })

    return chapter_pdfs


# Singleton instance
chapter_agent = ChapterAgent()
