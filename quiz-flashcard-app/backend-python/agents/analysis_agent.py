"""
Analysis Agent - Analyzes sample questions to extract patterns.

Responsibilities:
- Analyze sample questions to detect structural/language patterns
- Score questions on research-backed quality dimensions
- Extract best samples as few-shot examples for generation
- Detect Bloom's taxonomy levels
- Store analysis results for the Generation Agent

Research Foundation (6 academic papers):
- Ahmed et al. (BMC Medical Education 2025) - Facility/Discrimination metrics
- Sultan (PDQI-9 Framework) - 9-item quality rubric
- Abouzeid et al. (JMIR Medical Education 2025) - Technical item flaws + Bloom's
- Zelikman et al. (Stanford 2023) - Item calibration with LLMs
- Nielsen et al. (Diagnostics 2025) - 6-criteria MCQ assessment
- Cherrez-Ojeda et al. (World Allergy 2025) - DISCERN/JAMA benchmarks
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

# Quality scoring weights based on research papers
QUALITY_WEIGHTS = {
    "clarity": 0.15,           # Nielsen, PDQI-9
    "content_accuracy": 0.20,  # PDQI-9, Abouzeid
    "answer_accuracy": 0.15,   # Abouzeid, Nielsen
    "distractor_quality": 0.15,# Nielsen, Ahmed
    "cognitive_level": 0.10,   # Abouzeid, Zelikman
    "rationale_quality": 0.10, # Nielsen, PDQI-9
    "single_concept": 0.10,    # Abouzeid
    "cover_test": 0.05,        # Abouzeid
}

QUALITY_THRESHOLDS = {
    "high": 4.0,    # Use as few-shot example
    "medium": 3.0,  # Usable but not exemplary
}

VALID_BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"]

ANALYSIS_SYSTEM_PROMPT = """You are an expert educational content analyst specializing in question quality assessment.

Your task is to analyze sample questions using research-backed quality criteria and:
1. Score each question on 8 quality dimensions (1-5 scale)
2. Calculate weighted overall quality scores
3. Select the best 3-5 questions as few-shot examples (score >= 4.0)
4. Identify Bloom's taxonomy levels used
5. Extract patterns for generating similar questions

## Quality Dimensions (Score 1-5, where 5 is excellent)
- clarity (15%): Question stem is clear, unambiguous, grammatically correct
- content_accuracy (20%): Information is factually correct and up-to-date
- answer_accuracy (15%): Correct answer is definitively right, distractors are wrong
- distractor_quality (15%): Distractors are plausible, homogeneous, no "all/none of above"
- cognitive_level (10%): Targets application/analysis vs pure recall (higher = better)
- rationale_quality (10%): Explanation is educational and justifies the answer
- single_concept (10%): Tests one concept only, not multiple intertwined ideas
- cover_test (5%): Can answer without seeing options (well-constructed stem)

## Bloom's Taxonomy Levels
- remember: Recall facts, definitions, terms
- understand: Explain concepts, summarize, interpret
- apply: Use knowledge in new situations
- analyze: Break down, compare, contrast, examine
- evaluate: Judge, assess, critique, justify
- create: Produce original work, design, construct

## Scoring Guidelines
- 5: Excellent - No modifications needed
- 4: Good - Minor improvements possible
- 3: Acceptable - Usable with modifications
- 2: Poor - Significant issues
- 1: Unacceptable - Should not be used

Provide your analysis in the specified JSON format."""


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
        """Build the prompt for analysis with quality scoring."""
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

        return f"""Analyze these {len(sample_questions)} sample questions. Score each on quality dimensions and select the best as few-shot examples.

{chr(10).join(samples_text)}

Provide your analysis as JSON with this EXACT structure:
{{
    "few_shot_examples": {{
        "questions": [
            {{
                "question_text": "The exact question text",
                "question_type": "multiple_choice|true_false|written_answer|fill_in_blank",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "The correct answer",
                "explanation": "The explanation if provided",
                "quality_scores": {{
                    "clarity": 5,
                    "content_accuracy": 5,
                    "answer_accuracy": 5,
                    "distractor_quality": 4,
                    "cognitive_level": 4,
                    "rationale_quality": 5,
                    "single_concept": 5,
                    "cover_test": 4,
                    "overall": 4.65
                }},
                "bloom_level": "apply"
            }}
        ]
    }},
    "bloom_taxonomy_targets": ["remember", "understand", "apply"],
    "quality_criteria": {{
        "weights": {{
            "clarity": 0.15,
            "content_accuracy": 0.20,
            "answer_accuracy": 0.15,
            "distractor_quality": 0.15,
            "cognitive_level": 0.10,
            "rationale_quality": 0.10,
            "single_concept": 0.10,
            "cover_test": 0.05
        }},
        "thresholds": {{"high": 4.0, "medium": 3.0}},
        "analysis_summary": {{
            "average_quality": 4.2,
            "strongest_dimension": "content_accuracy",
            "weakest_dimension": "distractor_quality",
            "total_scored": {len(sample_questions)},
            "high_quality_count": 3,
            "notes": "Brief analysis of overall quality patterns"
        }}
    }},
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
    ]
}}

IMPORTANT:
1. Score ALL {len(sample_questions)} questions on 8 dimensions (1-5 scale)
2. Calculate overall = (clarity*0.15 + content_accuracy*0.20 + answer_accuracy*0.15 + distractor_quality*0.15 + cognitive_level*0.10 + rationale_quality*0.10 + single_concept*0.10 + cover_test*0.05)
3. Select 3-5 questions with overall >= 4.0 for few_shot_examples (or top 3 if none reach 4.0)
4. Identify bloom_level for each: remember, understand, apply, analyze, evaluate, create
5. List unique bloom levels found in bloom_taxonomy_targets"""

    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse the AI response into structured analysis with quality scoring."""
        # Clean the response
        cleaned = self._clean_json_response(response)

        try:
            analysis = json.loads(cleaned)

            # Validate and fix quality scores
            analysis = self._validate_and_fix_quality_scores(analysis)

            return analysis
        except json.JSONDecodeError:
            # Return a default structure if parsing fails
            logger.warning("analysis_parse_failed", response_preview=response[:200])
            return self._get_default_analysis()

    def _validate_and_fix_quality_scores(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Validate quality scores and recalculate overall if needed."""
        few_shot = analysis.get("few_shot_examples", {})
        questions = few_shot.get("questions", [])

        for q in questions:
            scores = q.get("quality_scores", {})
            if not scores:
                continue

            # Validate dimension scores are 1-5
            for dim in QUALITY_WEIGHTS.keys():
                if dim in scores:
                    scores[dim] = max(1, min(5, int(scores[dim])))

            # Recalculate overall score
            calculated_overall = sum(
                scores.get(dim, 3) * weight
                for dim, weight in QUALITY_WEIGHTS.items()
            )
            scores["overall"] = round(calculated_overall, 2)

            # Validate bloom level
            bloom = q.get("bloom_level", "").lower()
            if bloom not in VALID_BLOOM_LEVELS:
                q["bloom_level"] = "understand"  # Default

        # Validate bloom_taxonomy_targets
        bloom_targets = analysis.get("bloom_taxonomy_targets", [])
        analysis["bloom_taxonomy_targets"] = [
            b.lower() for b in bloom_targets if b.lower() in VALID_BLOOM_LEVELS
        ]

        # Ensure quality_criteria has required fields
        qc = analysis.get("quality_criteria", {})
        if "weights" not in qc:
            qc["weights"] = QUALITY_WEIGHTS
        if "thresholds" not in qc:
            qc["thresholds"] = QUALITY_THRESHOLDS
        analysis["quality_criteria"] = qc

        return analysis

    def _get_default_analysis(self) -> Dict[str, Any]:
        """Return default analysis structure when parsing fails."""
        return {
            "few_shot_examples": {"questions": []},
            "bloom_taxonomy_targets": [],
            "quality_criteria": {
                "weights": QUALITY_WEIGHTS,
                "thresholds": QUALITY_THRESHOLDS,
                "analysis_summary": {
                    "average_quality": 0,
                    "total_scored": 0,
                    "high_quality_count": 0,
                    "notes": "Analysis parsing failed - using defaults"
                }
            },
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


def validate_sample_questions(samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validate and sanitize sample questions before processing.

    Prevents prompt injection and ensures data quality.

    Args:
        samples: List of sample question dictionaries

    Returns:
        List of validated and sanitized sample dictionaries
    """
    validated = []

    for sample in samples:
        # Skip empty questions
        if not sample.get("question_text"):
            continue

        # Sanitize text fields with length limits
        clean_sample = {
            "question_text": str(sample["question_text"])[:5000],
            "question_type": str(sample.get("question_type", "unknown"))[:50],
            "options": None,
            "correct_answer": str(sample.get("correct_answer") or "")[:1000],
            "explanation": str(sample.get("explanation") or "")[:2000],
        }

        # Sanitize options array
        raw_options = sample.get("options")
        if raw_options and isinstance(raw_options, list):
            clean_sample["options"] = [
                str(opt)[:500] for opt in raw_options[:10]  # Max 10 options, 500 chars each
            ]

        validated.append(clean_sample)

    return validated


async def analyze_samples(
    db: AsyncSession,
    category_id: int,
    force: bool = False,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Analyze sample questions for a category with retry logic and checkpointing.

    Args:
        db: Database session
        category_id: Category to analyze
        force: Force re-analysis even if results exist
        max_retries: Maximum retry attempts on failure

    Returns:
        Analysis results including few-shot examples and quality scores
    """
    import asyncio

    # Check for existing analysis - use fresh query to avoid stale session data
    if not force:
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
                has_few_shot=bool(existing_result.few_shot_examples),
            )
            return {
                "success": True,
                "analysis": {
                    "patterns": existing_result.patterns,
                    "style_guide": existing_result.style_guide,
                    "recommendations": existing_result.recommendations,
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

    # Convert to dicts and validate/sanitize
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

    # Input validation
    validated_samples = validate_sample_questions(sample_dicts)
    if not validated_samples:
        return {
            "success": False,
            "error": "No valid sample questions after validation",
        }

    logger.info(
        "analyze_samples_starting",
        category_id=category_id,
        original_count=len(sample_dicts),
        validated_count=len(validated_samples),
    )

    # Run analysis with retry logic
    agent = AnalysisAgent()
    result = None
    last_error = None

    for attempt in range(max_retries):
        try:
            result = await agent.process({
                "sample_questions": validated_samples,
                "category_id": category_id,
            })

            if result["success"]:
                break

            last_error = result.get("error", "Unknown error")
            logger.warning(
                "analysis_attempt_failed",
                attempt=attempt + 1,
                max_retries=max_retries,
                error=last_error,
            )

        except Exception as e:
            last_error = str(e)
            logger.warning(
                "analysis_attempt_exception",
                attempt=attempt + 1,
                max_retries=max_retries,
                error=last_error,
            )

        # Exponential backoff before retry
        if attempt < max_retries - 1:
            await asyncio.sleep(2 ** attempt)

    if not result or not result.get("success"):
        logger.error(
            "analysis_failed_all_retries",
            category_id=category_id,
            max_retries=max_retries,
            last_error=last_error,
        )
        return {
            "success": False,
            "error": f"Analysis failed after {max_retries} attempts: {last_error}",
        }

    # Store analysis results (checkpoint)
    analysis = result["analysis"]

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
        # New Phase 2 fields
        few_shot_examples=analysis.get("few_shot_examples", {}),
        quality_criteria=analysis.get("quality_criteria", {}),
        bloom_taxonomy_targets=analysis.get("bloom_taxonomy_targets", []),
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

    # Checkpoint: Flush immediately to persist results
    await db.flush()

    few_shot_count = len(analysis.get("few_shot_examples", {}).get("questions", []))
    logger.info(
        "analysis_stored",
        category_id=category_id,
        analyzed_count=result["analyzed_count"],
        few_shot_count=few_shot_count,
        bloom_targets=analysis.get("bloom_taxonomy_targets", []),
    )

    return result


async def get_analysis_status(db: AsyncSession, category_id: int) -> Dict[str, Any]:
    """
    Get the current analysis status for a category.

    Returns:
        Status including analysis results, few-shot examples, quality scores, and sample counts
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

    # Count few-shot examples if available
    few_shot_count = 0
    if analysis and analysis.few_shot_examples:
        few_shot_count = len(analysis.few_shot_examples.get("questions", []))

    logger.info(
        "get_analysis_status",
        category_id=category_id,
        has_analysis=analysis is not None,
        sample_count=len(samples),
        few_shot_count=few_shot_count,
        analysis_id=analysis.id if analysis else None,
    )

    return {
        "has_analysis": analysis is not None,
        "analysis": {
            "patterns": analysis.patterns if analysis else None,
            "style_guide": analysis.style_guide if analysis else None,
            "recommendations": analysis.recommendations if analysis else None,
            # New Phase 2 fields
            "few_shot_examples": analysis.few_shot_examples if analysis else None,
            "quality_criteria": analysis.quality_criteria if analysis else None,
            "bloom_taxonomy_targets": analysis.bloom_taxonomy_targets if analysis else None,
            "analyzed_count": analysis.analyzed_count if analysis else 0,
            "updated_at": analysis.updated_at.isoformat() if analysis and analysis.updated_at else (
                analysis.created_at.isoformat() if analysis and analysis.created_at else None
            ),
        } if analysis else None,
        "sample_count": len(samples),
        "samples_by_type": samples_by_type,
        "few_shot_count": few_shot_count,
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
