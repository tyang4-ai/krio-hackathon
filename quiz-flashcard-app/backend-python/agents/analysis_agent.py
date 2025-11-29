"""
Analysis Agent - Analyzes sample questions to extract patterns.

Responsibilities:
- Analyze sample questions to detect structural/language patterns
- Generate style guides for consistent question generation
- Store analysis results for the Generation Agent
"""
import json
import re
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import AIAnalysisResult, AgentMessage as AgentMessageModel, SampleQuestion
from services.ai_service import ai_service

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

ANALYSIS_SYSTEM_PROMPT = """You are an expert educational content analyst specializing in question pattern recognition.

Your task is to analyze a set of sample questions and extract:
1. Language patterns (formal/informal, tone, vocabulary level)
2. Question structure patterns (how questions are typically formatted)
3. Option format patterns (length, style, distractor quality)
4. Answer patterns (how correct answers are presented)
5. Difficulty indicators (what makes questions easier or harder)
6. Subject-specific patterns

Provide your analysis in a structured JSON format that can be used to generate similar questions."""


class AnalysisAgent(BaseAgent):
    """
    Agent that analyzes sample questions to extract patterns.

    Used to ensure generated questions match the style and format
    of user-provided samples.
    """

    def __init__(self):
        """Initialize the Analysis Agent."""
        super().__init__(
            role=AgentRole.ANALYSIS,
            system_prompt=ANALYSIS_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process sample questions and extract patterns.

        Args:
            input_data: Dict containing:
                - sample_questions: List of sample question dicts
                - category_id: Category ID for storing results

        Returns:
            Analysis results including patterns and style guide
        """
        sample_questions = input_data.get("sample_questions", [])
        category_id = input_data.get("category_id")

        if not sample_questions:
            return {
                "success": False,
                "error": "No sample questions provided for analysis",
            }

        logger.info(
            "analysis_agent_processing",
            category_id=category_id,
            sample_count=len(sample_questions),
        )

        # Build the analysis prompt
        prompt = self._build_analysis_prompt(sample_questions)

        # Generate analysis using AI
        try:
            response = await self.generate_json(prompt, max_tokens=4000)
            analysis = self._parse_analysis_response(response)

            logger.info(
                "analysis_agent_completed",
                category_id=category_id,
                patterns_extracted=bool(analysis.get("patterns")),
            )

            return {
                "success": True,
                "analysis": analysis,
                "analyzed_count": len(sample_questions),
            }

        except Exception as e:
            logger.error("analysis_agent_error", error=str(e))
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}",
            }

    def _build_analysis_prompt(self, sample_questions: List[Dict[str, Any]]) -> str:
        """Build the prompt for analysis."""
        # Format samples for analysis
        samples_text = []
        for i, q in enumerate(sample_questions, 1):
            sample = f"\n--- Sample {i} ---\n"
            sample += f"Type: {q.get('question_type', 'unknown')}\n"
            sample += f"Question: {q.get('question_text', '')}\n"

            if q.get("options"):
                sample += "Options:\n"
                for opt in q["options"]:
                    sample += f"  {opt}\n"

            sample += f"Correct Answer: {q.get('correct_answer', '')}\n"

            if q.get("explanation"):
                sample += f"Explanation: {q['explanation']}\n"

            samples_text.append(sample)

        return f"""Analyze these {len(sample_questions)} sample questions and extract patterns for generating similar questions.

{chr(10).join(samples_text)}

Provide your analysis as JSON with this structure:
{{
    "patterns": {{
        "language_style": "Description of language patterns (formal/informal, tone, etc.)",
        "question_structure": "Common question structures used",
        "option_format": "How options are formatted (length, style, distractors)",
        "answer_patterns": "Patterns in correct answers",
        "difficulty_indicators": "What makes questions harder/easier",
        "subject_focus": "Main topics and subject areas covered"
    }},
    "style_guide": {{
        "tone": "formal|informal|academic|conversational",
        "vocabulary_level": "basic|intermediate|advanced|technical",
        "question_length": "short|medium|long",
        "option_count": 4,
        "explanation_style": "How explanations are written",
        "formatting_rules": ["Rule 1", "Rule 2"]
    }},
    "by_type": {{
        "multiple_choice": {{"count": 0, "patterns": "Specific patterns for this type"}},
        "true_false": {{"count": 0, "patterns": "Specific patterns for this type"}},
        "written_answer": {{"count": 0, "patterns": "Specific patterns for this type"}},
        "fill_in_blank": {{"count": 0, "patterns": "Specific patterns for this type"}}
    }},
    "recommendations": [
        "Actionable recommendation 1",
        "Actionable recommendation 2"
    ],
    "quality_indicators": {{
        "strengths": ["Strength 1", "Strength 2"],
        "improvements": ["Area for improvement 1"]
    }}
}}"""

    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse the AI response into structured analysis."""
        # Clean the response
        cleaned = self._clean_json_response(response)

        try:
            analysis = json.loads(cleaned)
            return analysis
        except json.JSONDecodeError:
            # Return a default structure if parsing fails
            logger.warning("analysis_parse_failed", response_preview=response[:200])
            return {
                "patterns": {
                    "language_style": "Could not extract - using defaults",
                    "question_structure": "Standard question format",
                    "option_format": "Multiple choice with 4 options",
                    "answer_patterns": "Single correct answer",
                    "difficulty_indicators": "Varies by complexity",
                    "subject_focus": "General",
                },
                "style_guide": {
                    "tone": "academic",
                    "vocabulary_level": "intermediate",
                    "question_length": "medium",
                    "option_count": 4,
                    "explanation_style": "Brief explanation of correct answer",
                    "formatting_rules": [],
                },
                "by_type": {},
                "recommendations": [],
                "quality_indicators": {"strengths": [], "improvements": []},
            }

    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON."""
        # Remove markdown code blocks
        response = re.sub(r"```json\s*", "", response)
        response = re.sub(r"```\s*", "", response)

        # Find JSON object
        start = response.find("{")
        end = response.rfind("}") + 1

        if start != -1 and end > start:
            return response[start:end]

        return response


async def analyze_samples(
    db: AsyncSession,
    category_id: int,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Analyze sample questions for a category.

    Args:
        db: Database session
        category_id: Category to analyze
        force: Force re-analysis even if results exist

    Returns:
        Analysis results
    """
    # Check for existing analysis - use fresh query to avoid stale session data
    if not force:
        # Expire all to ensure fresh data from database
        db.expire_all()
        existing = await db.execute(
            select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
        )
        existing_result = existing.scalar_one_or_none()
        if existing_result:
            logger.info(
                "returning_cached_analysis",
                category_id=category_id,
                analyzed_count=existing_result.analyzed_count,
            )
            return {
                "success": True,
                "analysis": {
                    "patterns": existing_result.patterns,
                    "style_guide": existing_result.style_guide,
                    "recommendations": existing_result.recommendations,
                },
                "analyzed_count": existing_result.analyzed_count,
                "from_cache": True,
            }

    # Get sample questions
    samples_result = await db.execute(
        select(SampleQuestion).where(SampleQuestion.category_id == category_id)
    )
    samples = samples_result.scalars().all()

    if not samples:
        return {
            "success": False,
            "error": "No sample questions found for analysis",
        }

    # Convert to dicts for analysis
    sample_dicts = [
        {
            "question_text": s.question_text,
            "question_type": s.question_type,
            "options": s.options,
            "correct_answer": s.correct_answer,
            "explanation": s.explanation,
        }
        for s in samples
    ]

    # Run analysis
    agent = AnalysisAgent()
    result = await agent.process({
        "sample_questions": sample_dicts,
        "category_id": category_id,
    })

    if result["success"]:
        # Store analysis results
        analysis = result["analysis"]

        # Delete existing analysis
        existing = await db.execute(
            select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
        )
        existing_result = existing.scalar_one_or_none()
        if existing_result:
            await db.delete(existing_result)

        # Create new analysis
        analysis_record = AIAnalysisResult(
            category_id=category_id,
            analysis_type="sample_questions",
            patterns=analysis.get("patterns", {}),
            style_guide=analysis.get("style_guide", {}),
            recommendations=analysis.get("recommendations", []),
            analyzed_count=result["analyzed_count"],
        )
        db.add(analysis_record)

        # Log agent message
        agent_msg = AgentMessageModel(
            category_id=category_id,
            from_agent="analysis_agent",
            to_agent="generation_agent",
            message_type="analysis_complete",
            payload=analysis,
            status="pending",
        )
        db.add(agent_msg)

        # Flush to ensure records are visible within this session and for status queries
        await db.flush()

        logger.info(
            "analysis_stored",
            category_id=category_id,
            analyzed_count=result["analyzed_count"],
        )

    return result


async def get_analysis_status(db: AsyncSession, category_id: int) -> Dict[str, Any]:
    """
    Get the current analysis status for a category.

    Returns:
        Status including whether analysis exists and sample counts
    """
    # Expire all to ensure fresh data from database (not stale session cache)
    db.expire_all()

    # Get analysis result
    result = await db.execute(
        select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
    )
    analysis = result.scalar_one_or_none()

    # Get sample counts by type
    samples_result = await db.execute(
        select(SampleQuestion).where(SampleQuestion.category_id == category_id)
    )
    samples = samples_result.scalars().all()

    samples_by_type = {}
    for s in samples:
        q_type = s.question_type
        samples_by_type[q_type] = samples_by_type.get(q_type, 0) + 1

    logger.info(
        "get_analysis_status",
        category_id=category_id,
        has_analysis=analysis is not None,
        sample_count=len(samples),
        analysis_id=analysis.id if analysis else None,
    )

    return {
        "has_analysis": analysis is not None,
        "analysis": {
            "patterns": analysis.patterns if analysis else None,
            "style_guide": analysis.style_guide if analysis else None,
            "recommendations": analysis.recommendations if analysis else None,
            "analyzed_count": analysis.analyzed_count if analysis else 0,
            "updated_at": analysis.updated_at.isoformat() if analysis and analysis.updated_at else (
                analysis.created_at.isoformat() if analysis and analysis.created_at else None
            ),
        } if analysis else None,
        "sample_count": len(samples),
        "samples_by_type": samples_by_type,
    }


async def clear_analysis(db: AsyncSession, category_id: int) -> bool:
    """Clear analysis results for a category."""
    result = await db.execute(
        select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
    )
    analysis = result.scalar_one_or_none()

    if analysis:
        await db.delete(analysis)
        logger.info("analysis_cleared", category_id=category_id)
        return True

    return False


# Singleton instance
analysis_agent = AnalysisAgent()
