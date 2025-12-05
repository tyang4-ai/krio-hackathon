"""
Analysis Agent - Analyzes sample questions to extract patterns.

Responsibilities:
- Analyze sample questions to detect structural/language patterns
- Generate style guides for consistent question generation
- Score sample questions on 8 quality dimensions (Phase 2)
- Extract few-shot examples from high-quality samples
- Detect Bloom's taxonomy levels
- Store analysis results for the Generation Agent
"""
import asyncio
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

# 8-dimension quality scoring weights (research-backed)
# Based on: Ahmed et al. (BMC Medical Education 2025), Sultan (PDQI-9)
QUALITY_WEIGHTS = {
    "clarity": 0.15,           # Clear, unambiguous wording
    "content_accuracy": 0.20,  # Factually correct content
    "answer_accuracy": 0.15,   # Correct answer is truly correct
    "distractor_quality": 0.15,  # Plausible but incorrect options
    "cognitive_level": 0.10,   # Appropriate Bloom's level
    "rationale_quality": 0.10, # Helpful explanation
    "single_concept": 0.10,    # Tests one concept only
    "cover_test": 0.05,        # Can't be answered without content
}

# Minimum score threshold for few-shot examples
FEW_SHOT_THRESHOLD = 4.0

ANALYSIS_SYSTEM_PROMPT = """You are an expert educational content analyst specializing in question pattern recognition and quality assessment.

Your task is to analyze a set of sample questions and:
1. Extract language patterns (formal/informal, tone, vocabulary level)
2. Identify question structure patterns (how questions are typically formatted)
3. Assess option format patterns (length, style, distractor quality)
4. Evaluate answer patterns (how correct answers are presented)
5. Determine difficulty indicators (what makes questions easier or harder)
6. Detect subject-specific patterns
7. Score each question on 8 quality dimensions (1-5 scale)
8. Identify Bloom's taxonomy levels

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

    async def score_questions(
        self, questions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Score questions on 8 quality dimensions using AI.

        Args:
            questions: List of question dicts with question_text, options, etc.

        Returns:
            List of questions with quality_scores added
        """
        if not questions:
            return []

        # Build scoring prompt
        prompt = self._build_scoring_prompt(questions)

        try:
            response = await self.generate_json(prompt, max_tokens=4000)
            scored = self._parse_scoring_response(response, questions)
            return scored
        except Exception as e:
            logger.error("question_scoring_failed", error=str(e))
            # Return with default scores
            return [
                {**q, "quality_scores": self._default_scores(), "bloom_level": "understand"}
                for q in questions
            ]

    def _build_scoring_prompt(self, questions: List[Dict[str, Any]]) -> str:
        """Build prompt for quality scoring."""
        questions_text = []
        for i, q in enumerate(questions, 1):
            text = f"\n--- Question {i} ---\n"
            text += f"Type: {q.get('question_type', 'multiple_choice')}\n"
            text += f"Question: {q.get('question_text', '')}\n"
            if q.get("options"):
                text += f"Options: {q['options']}\n"
            text += f"Answer: {q.get('correct_answer', '')}\n"
            if q.get("explanation"):
                text += f"Explanation: {q['explanation']}\n"
            questions_text.append(text)

        return f"""Score each of these {len(questions)} questions on 8 quality dimensions (1-5 scale).

{chr(10).join(questions_text)}

For each question, provide scores and Bloom's taxonomy level.

Quality Dimensions (1=poor, 5=excellent):
- clarity: Clear, unambiguous wording
- content_accuracy: Factually correct content
- answer_accuracy: The marked answer is truly correct
- distractor_quality: Wrong options are plausible but clearly incorrect
- cognitive_level: Tests appropriate thinking level
- rationale_quality: Explanation is helpful and educational
- single_concept: Tests only one concept (not multiple)
- cover_test: Can't be answered without knowing the content

Bloom's Taxonomy Levels: remember, understand, apply, analyze, evaluate, create

Return JSON:
{{
    "scored_questions": [
        {{
            "question_index": 1,
            "quality_scores": {{
                "clarity": 5,
                "content_accuracy": 5,
                "answer_accuracy": 5,
                "distractor_quality": 4,
                "cognitive_level": 4,
                "rationale_quality": 5,
                "single_concept": 5,
                "cover_test": 4
            }},
            "bloom_level": "apply",
            "overall_score": 4.65,
            "feedback": "Brief feedback on question quality"
        }}
    ]
}}"""

    def _parse_scoring_response(
        self, response: str, original_questions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Parse scoring response and merge with original questions."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            scored_list = data.get("scored_questions", [])

            # Create a mapping by index
            score_map = {}
            for item in scored_list:
                idx = item.get("question_index", 0) - 1  # Convert to 0-based
                score_map[idx] = item

            # Merge scores into original questions
            result = []
            for i, q in enumerate(original_questions):
                scores = score_map.get(i, {})
                q_with_scores = {
                    **q,
                    "quality_scores": scores.get("quality_scores", self._default_scores()),
                    "bloom_level": scores.get("bloom_level", "understand"),
                    "overall_score": scores.get("overall_score", self._calculate_overall(
                        scores.get("quality_scores", self._default_scores())
                    )),
                    "quality_feedback": scores.get("feedback", ""),
                }
                result.append(q_with_scores)

            return result

        except json.JSONDecodeError:
            logger.warning("scoring_parse_failed", response_preview=response[:200])
            return [
                {**q, "quality_scores": self._default_scores(), "bloom_level": "understand"}
                for q in original_questions
            ]

    def _default_scores(self) -> Dict[str, float]:
        """Return default quality scores (3.0 = average)."""
        return {dim: 3.0 for dim in QUALITY_WEIGHTS.keys()}

    def _calculate_overall(self, scores: Dict[str, float]) -> float:
        """Calculate weighted overall score."""
        total = 0.0
        for dim, weight in QUALITY_WEIGHTS.items():
            total += scores.get(dim, 3.0) * weight
        return round(total, 2)

    def extract_few_shot_examples(
        self, scored_questions: List[Dict[str, Any]], max_examples: int = 5
    ) -> Dict[str, Any]:
        """
        Extract high-quality questions as few-shot examples.

        Args:
            scored_questions: Questions with quality_scores
            max_examples: Maximum number of examples to return

        Returns:
            Dict with questions list and metadata
        """
        # Filter by threshold and sort by overall score
        high_quality = [
            q for q in scored_questions
            if q.get("overall_score", 0) >= FEW_SHOT_THRESHOLD
        ]
        high_quality.sort(key=lambda x: x.get("overall_score", 0), reverse=True)

        # Take top N
        examples = high_quality[:max_examples]

        # Format for storage
        return {
            "questions": [
                {
                    "question_text": q.get("question_text"),
                    "question_type": q.get("question_type"),
                    "options": q.get("options"),
                    "correct_answer": q.get("correct_answer"),
                    "explanation": q.get("explanation"),
                    "quality_scores": q.get("quality_scores"),
                    "bloom_level": q.get("bloom_level"),
                    "overall_score": q.get("overall_score"),
                }
                for q in examples
            ],
            "count": len(examples),
            "threshold": FEW_SHOT_THRESHOLD,
        }

    def extract_bloom_targets(
        self, scored_questions: List[Dict[str, Any]]
    ) -> List[str]:
        """Extract unique Bloom's taxonomy levels from scored questions."""
        levels = set()
        for q in scored_questions:
            level = q.get("bloom_level", "").lower()
            if level in ["remember", "understand", "apply", "analyze", "evaluate", "create"]:
                levels.add(level)
        return sorted(levels)

    def build_quality_criteria(
        self, scored_questions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build quality criteria summary from scored questions."""
        if not scored_questions:
            return {"weights": QUALITY_WEIGHTS, "thresholds": {"high": 4.0, "medium": 3.0}}

        # Calculate averages per dimension
        dimension_scores = {dim: [] for dim in QUALITY_WEIGHTS.keys()}
        overall_scores = []

        for q in scored_questions:
            scores = q.get("quality_scores", {})
            for dim in QUALITY_WEIGHTS.keys():
                if dim in scores:
                    dimension_scores[dim].append(scores[dim])
            if "overall_score" in q:
                overall_scores.append(q["overall_score"])

        # Find strongest and weakest dimensions
        avg_by_dim = {
            dim: sum(vals) / len(vals) if vals else 3.0
            for dim, vals in dimension_scores.items()
        }
        strongest = max(avg_by_dim, key=avg_by_dim.get) if avg_by_dim else "clarity"
        weakest = min(avg_by_dim, key=avg_by_dim.get) if avg_by_dim else "cover_test"

        return {
            "weights": QUALITY_WEIGHTS,
            "thresholds": {"high": 4.0, "medium": 3.0},
            "analysis_summary": {
                "average_quality": round(sum(overall_scores) / len(overall_scores), 2) if overall_scores else 3.0,
                "strongest_dimension": strongest,
                "weakest_dimension": weakest,
                "dimension_averages": {k: round(v, 2) for k, v in avg_by_dim.items()},
            },
        }


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
                    # Phase 2 enhanced fields
                    "few_shot_examples": existing_result.few_shot_examples,
                    "quality_criteria": existing_result.quality_criteria,
                    "bloom_taxonomy_targets": existing_result.bloom_taxonomy_targets,
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

    # Run analysis and scoring in PARALLEL for speed optimization
    # Previously sequential: ~30-65 sec → Now parallel: ~15-35 sec
    agent = AnalysisAgent()

    # Run both AI calls concurrently with asyncio.gather()
    result, scored_questions = await asyncio.gather(
        agent.process({
            "sample_questions": sample_dicts,
            "category_id": category_id,
        }),
        agent.score_questions(sample_dicts),
    )

    if result["success"]:
        # Store analysis results
        analysis = result["analysis"]

        # Phase 2: Extract enhanced data from already-scored questions
        few_shot_examples = agent.extract_few_shot_examples(scored_questions)
        bloom_targets = agent.extract_bloom_targets(scored_questions)
        quality_criteria = agent.build_quality_criteria(scored_questions)

        logger.info(
            "phase2_scoring_complete",
            category_id=category_id,
            few_shot_count=few_shot_examples.get("count", 0),
            bloom_targets=bloom_targets,
            avg_quality=quality_criteria.get("analysis_summary", {}).get("average_quality"),
        )

        # Delete existing analysis
        existing = await db.execute(
            select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
        )
        existing_result = existing.scalar_one_or_none()
        if existing_result:
            await db.delete(existing_result)

        # Create new analysis with enhanced fields
        analysis_record = AIAnalysisResult(
            category_id=category_id,
            analysis_type="sample_questions",
            patterns=analysis.get("patterns", {}),
            style_guide=analysis.get("style_guide", {}),
            recommendations=analysis.get("recommendations", []),
            analyzed_count=result["analyzed_count"],
            # Phase 2 enhanced fields
            few_shot_examples=few_shot_examples,
            quality_criteria=quality_criteria,
            bloom_taxonomy_targets=bloom_targets,
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
            # Phase 2 enhanced fields
            "few_shot_examples": analysis.few_shot_examples if analysis else None,
            "quality_criteria": analysis.quality_criteria if analysis else None,
            "bloom_taxonomy_targets": analysis.bloom_taxonomy_targets if analysis else None,
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
