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
from typing import Any, Dict, List

import structlog

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

CHAPTER_ANALYSIS_SYSTEM_PROMPT = """You are an expert at analyzing document structure.

Your task is to:
1. Identify chapter headings, section titles, and major topic divisions
2. Detect patterns like "Chapter 1", "Section A", numbered headings, etc.
3. Extract the hierarchical structure of the document
4. Find natural content boundaries based on topic changes

Always respond with valid JSON containing the detected chapters/sections."""


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


# Singleton instance
chapter_agent = ChapterAgent()
