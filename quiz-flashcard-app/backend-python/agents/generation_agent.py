"""
Generation Agent - Generates questions and flashcards using AI.

Responsibilities:
- Generate questions based on content and analysis patterns
- Apply style guides from Analysis Agent
- Support all question types (multiple_choice, true_false, written_answer, fill_in_blank)
- Generate flashcards from content
"""
import json
import re
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import AIAnalysisResult, AgentMessage as AgentMessageModel, Question, Flashcard
from services.ai_service import ai_service

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

GENERATION_SYSTEM_PROMPT = """You are an expert educator who creates high-quality quiz questions and flashcards.

Your questions should:
1. Be clear and unambiguous
2. Test understanding, not just memorization
3. Have plausible distractors for multiple choice
4. Include helpful explanations
5. Match the style and format of any provided examples

Always respond with valid JSON."""


class GenerationAgent(BaseAgent):
    """
    Agent that generates questions and flashcards.

    Uses patterns from the Analysis Agent (if available) to ensure
    consistency with user-provided samples.
    """

    def __init__(self):
        """Initialize the Generation Agent."""
        super().__init__(
            role=AgentRole.GENERATION,
            system_prompt=GENERATION_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate questions based on input.

        Args:
            input_data: Dict containing:
                - content: Text content to generate questions from
                - count: Number of questions to generate
                - difficulty: easy/medium/hard
                - question_type: Type of questions to generate
                - style_guide: Optional style guide from analysis
                - custom_directions: Optional user instructions
                - chapter: Optional chapter/topic to tag questions with

        Returns:
            Generated questions
        """
        content = input_data.get("content", "")
        count = input_data.get("count", 5)
        difficulty = input_data.get("difficulty", "medium")
        question_type = input_data.get("question_type", "multiple_choice")
        style_guide = input_data.get("style_guide")
        custom_directions = input_data.get("custom_directions", "")
        chapter = input_data.get("chapter", "")

        if not content:
            return {
                "success": False,
                "error": "No content provided for question generation",
            }

        logger.info(
            "generation_agent_processing",
            content_length=len(content),
            count=count,
            difficulty=difficulty,
            question_type=question_type,
            chapter=chapter,
        )

        # Build prompt
        prompt = self._build_generation_prompt(
            content=content,
            count=count,
            difficulty=difficulty,
            question_type=question_type,
            style_guide=style_guide,
            custom_directions=custom_directions,
            chapter=chapter,
        )

        try:
            response = await self.generate_json(prompt, max_tokens=8000)
            questions = self._parse_questions_response(response)

            logger.info(
                "generation_agent_completed",
                questions_generated=len(questions),
            )

            return {
                "success": True,
                "questions": questions,
            }

        except Exception as e:
            logger.error("generation_agent_error", error=str(e))
            return {
                "success": False,
                "error": f"Question generation failed: {str(e)}",
            }

    def _build_generation_prompt(
        self,
        content: str,
        count: int,
        difficulty: str,
        question_type: str,
        style_guide: Optional[Dict[str, Any]] = None,
        custom_directions: str = "",
        chapter: str = "",
    ) -> str:
        """Build the prompt for question generation."""
        # Truncate content if too long
        max_content_length = 7000
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."

        # Chapter tagging instruction
        chapter_instruction = ""
        if chapter:
            chapter_instruction = f'\nIMPORTANT: Tag ALL generated questions with "tags": ["{chapter}"] to categorize them under the chapter/topic: {chapter}\n'

        # Type-specific instructions
        type_instructions = {
            "multiple_choice": """
For MULTIPLE CHOICE questions:
- Provide exactly 4 options labeled A, B, C, D
- Only ONE option should be correct
- Make distractors plausible but clearly incorrect
- Correct answer should be just the letter (A, B, C, or D)""",
            "true_false": """
For TRUE/FALSE questions:
- Create definitive statements that are either completely true or false
- Avoid ambiguous wording
- Correct answer should be "True" or "False\"""",
            "written_answer": """
For WRITTEN ANSWER questions:
- Create open-ended questions requiring paragraph responses
- Include a model answer showing what a good response includes
- Correct answer should be the model answer text""",
            "fill_in_blank": """
For FILL-IN-THE-BLANK questions:
- Create a statement where a key term, concept, or formula is replaced by "_____" (exactly 5 underscores)
- The question_text should contain the sentence with the blank
- Test important vocabulary, concepts, dates, formulas, or facts
- The correct_answer should be the exact word/phrase that fills the blank
- Example: question_text: "The process of photosynthesis converts light energy into _____ energy."
  correct_answer: "chemical"
- Set options to null for fill_in_blank questions""",
        }

        type_instruction = type_instructions.get(
            question_type,
            type_instructions["multiple_choice"]
        )

        # Style guide section
        style_section = ""
        if style_guide:
            style_section = f"""
Use this style guide based on the user's sample questions:
- Tone: {style_guide.get('tone', 'academic')}
- Vocabulary Level: {style_guide.get('vocabulary_level', 'intermediate')}
- Question Length: {style_guide.get('question_length', 'medium')}
- Explanation Style: {style_guide.get('explanation_style', 'Brief and clear')}
"""
            if style_guide.get("formatting_rules"):
                style_section += f"- Formatting Rules: {', '.join(style_guide['formatting_rules'])}\n"

        # Custom directions section
        custom_section = ""
        if custom_directions:
            custom_section = f"\nAdditional Instructions from User:\n{custom_directions}\n"

        # Difficulty guidance
        difficulty_guidance = {
            "easy": "EASY: Basic recall, straightforward concepts, obvious answers",
            "medium": "MEDIUM: Application of knowledge, some analysis required",
            "hard": "HARD: Complex analysis, synthesis of concepts, challenging scenarios"
        }.get(difficulty, "MEDIUM")

        # Default tags for output
        tags_output = f'["{chapter}"]' if chapter else '[]'

        # Build a simple, concise prompt to avoid truncation
        if question_type == "fill_in_blank":
            return f"""Generate {count} {difficulty.upper()} fill-in-the-blank questions from this content:

{content}
{custom_section}{chapter_instruction}
Difficulty: {difficulty_guidance}

Output ONLY valid JSON:
{{"questions":[{{"question_text":"Statement with _____ blank","question_type":"fill_in_blank","difficulty":"{difficulty}","options":null,"correct_answer":"answer","explanation":"why","tags":{tags_output}}}]}}

Rules: question_text has _____, options is null, correct_answer fills blank. All questions MUST be {difficulty} difficulty. Generate exactly {count}."""

        elif question_type == "written_answer":
            return f"""Generate {count} {difficulty.upper()} written answer questions from this content:

{content}
{custom_section}{chapter_instruction}
Difficulty: {difficulty_guidance}

Output ONLY valid JSON:
{{"questions":[{{"question_text":"Open-ended question?","question_type":"written_answer","difficulty":"{difficulty}","options":null,"correct_answer":"Model answer text","explanation":"Grading criteria","tags":{tags_output}}}]}}

Rules: options is null, correct_answer is model answer. All questions MUST be {difficulty} difficulty. Generate exactly {count}."""

        elif question_type == "true_false":
            return f"""Generate {count} {difficulty.upper()} true/false questions from this content:

{content}
{custom_section}{chapter_instruction}
Difficulty: {difficulty_guidance}

Output ONLY valid JSON:
{{"questions":[{{"question_text":"Statement to evaluate","question_type":"true_false","difficulty":"{difficulty}","options":["A) True","B) False"],"correct_answer":"A","explanation":"why","tags":{tags_output}}}]}}

Rules: options always ["A) True","B) False"], correct_answer is "A" or "B". All questions MUST be {difficulty} difficulty. Generate exactly {count}."""

        else:  # multiple_choice
            # Check if custom instructions specify number of options
            num_options = 4  # default
            option_letters = "A-D"
            options_example = '["A) opt1","B) opt2","C) opt3","D) opt4"]'

            if custom_directions:
                # Look for patterns like "6 choices", "6 options", "six options"
                num_match = re.search(r'(\d+)\s*(?:choices|options|answers)', custom_directions.lower())
                if num_match:
                    num_options = int(num_match.group(1))
                    if num_options == 5:
                        option_letters = "A-E"
                        options_example = '["A) opt1","B) opt2","C) opt3","D) opt4","E) opt5"]'
                    elif num_options == 6:
                        option_letters = "A-F"
                        options_example = '["A) opt1","B) opt2","C) opt3","D) opt4","E) opt5","F) opt6"]'
                    elif num_options >= 7:
                        option_letters = "A-G"
                        options_example = '["A) opt1","B) opt2","C) opt3","D) opt4","E) opt5","F) opt6","G) opt7"]'

            # Special handling for concepts mode in MCQ
            if difficulty == "concepts":
                return f"""Generate {count} CONCEPT-FOCUSED multiple choice questions from this content:

{content}
{custom_section}{chapter_instruction}

Mode: CONCEPTS ONLY - Test key terminology, definitions, and core concepts.

Guidelines:
- Questions should test VOCABULARY and DEFINITIONS
- Ask "What is X?", "Which term describes...", "What is the definition of..."
- For science: include questions about formulas, structures, properties
- Distractors should be plausible related terms
- Keep questions straightforward - no complex application scenarios

Example question formats:
- "What is the term for a molecular structure with 5 bonding pairs and 1 lone pair?"
- "Which organelle is known as the powerhouse of the cell?"
- "What does the term 'photosynthesis' refer to?"

Output ONLY valid JSON:
{{"questions":[{{"question_text":"What is/Which term...?","question_type":"multiple_choice","difficulty":"concepts","options":{options_example},"correct_answer":"A","explanation":"brief definition","tags":{tags_output}}}]}}

Rules: {num_options} options {option_letters}, correct_answer is letter. Focus on testing terminology and definitions. Generate exactly {count}."""

            return f"""Generate {count} {difficulty.upper()} multiple choice questions from this content:

{content}
{custom_section}{chapter_instruction}
Difficulty: {difficulty_guidance}

Output ONLY valid JSON:
{{"questions":[{{"question_text":"Question?","question_type":"multiple_choice","difficulty":"{difficulty}","options":{options_example},"correct_answer":"A","explanation":"why","tags":{tags_output}}}]}}

Rules: {num_options} options {option_letters}, correct_answer is letter. All questions MUST be {difficulty} difficulty. Generate exactly {count}."""

    def _parse_questions_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse the AI response into questions."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            questions = data.get("questions", [])

            # Validate and clean each question
            valid_questions = []
            for q in questions:
                if q.get("question_text") and q.get("correct_answer"):
                    valid_questions.append({
                        "question_text": q["question_text"],
                        "question_type": q.get("question_type", "multiple_choice"),
                        "difficulty": q.get("difficulty", "medium"),
                        "options": q.get("options"),
                        "correct_answer": q["correct_answer"],
                        "explanation": q.get("explanation", ""),
                        "tags": q.get("tags", []),
                    })

            return valid_questions

        except json.JSONDecodeError:
            logger.warning("generation_parse_failed", response_preview=response[:200])
            return []

    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON."""
        response = re.sub(r"```json\s*", "", response)
        response = re.sub(r"```\s*", "", response)

        start = response.find("{")
        end = response.rfind("}") + 1

        if start != -1 and end > start:
            cleaned = response[start:end]
            # Fix common JSON issues - trailing commas
            cleaned = re.sub(r",\s*}", "}", cleaned)
            cleaned = re.sub(r",\s*]", "]", cleaned)

            # Try to fix truncated JSON by closing any open structures
            try:
                json.loads(cleaned)
                return cleaned
            except json.JSONDecodeError as e:
                logger.warning("json_parse_attempt_failed", error=str(e)[:100])
                # Try to repair truncated JSON
                cleaned = self._repair_truncated_json(cleaned)

            return cleaned

        return response

    def _repair_truncated_json(self, json_str: str) -> str:
        """Attempt to repair truncated JSON by closing open structures."""
        # Count open brackets/braces
        open_braces = json_str.count('{') - json_str.count('}')
        open_brackets = json_str.count('[') - json_str.count(']')
        open_quotes = json_str.count('"') % 2 == 1

        repaired = json_str

        # Close open string
        if open_quotes:
            repaired += '"'

        # Close any open structures
        for _ in range(open_brackets):
            # Check if we need to close a partial object first
            if open_braces > 0:
                repaired += '}'
                open_braces -= 1
            repaired += ']'

        for _ in range(open_braces):
            repaired += '}'

        return repaired

    async def generate_flashcards(
        self,
        content: str,
        count: int = 10,
        difficulty: str = "medium",
        custom_directions: str = "",
        chapter: str = "",
    ) -> Dict[str, Any]:
        """
        Generate flashcards from content.

        Args:
            content: Text content to create flashcards from
            count: Number of flashcards to generate
            difficulty: Difficulty level (easy, medium, hard)
            custom_directions: Optional user instructions
            chapter: Optional chapter/topic to tag flashcards with

        Returns:
            Generated flashcards
        """
        if not content:
            return {
                "success": False,
                "error": "No content provided for flashcard generation",
            }

        logger.info(
            "generation_agent_flashcards",
            content_length=len(content),
            count=count,
            difficulty=difficulty,
            chapter=chapter,
        )

        prompt = self._build_flashcard_prompt(content, count, difficulty, custom_directions, chapter)

        try:
            response = await self.generate_json(prompt, max_tokens=3000)
            flashcards = self._parse_flashcards_response(response)

            logger.info(
                "flashcards_generated",
                count=len(flashcards),
            )

            return {
                "success": True,
                "flashcards": flashcards,
            }

        except Exception as e:
            logger.error("flashcard_generation_error", error=str(e))
            return {
                "success": False,
                "error": f"Flashcard generation failed: {str(e)}",
            }

    def _build_flashcard_prompt(
        self,
        content: str,
        count: int,
        difficulty: str = "medium",
        custom_directions: str = "",
        chapter: str = "",
    ) -> str:
        """Build prompt for flashcard generation."""
        max_content_length = 7000
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."

        custom_section = ""
        if custom_directions:
            custom_section = f"\nAdditional Instructions:\n{custom_directions}\n"

        # Chapter tagging instruction
        chapter_instruction = ""
        tags_value = '["vocabulary", "definition"]'
        if chapter:
            chapter_instruction = f'\nIMPORTANT: Tag ALL generated flashcards with the chapter/topic: "{chapter}"\n'
            tags_value = f'["{chapter}", "vocabulary"]'

        # Special handling for "concepts" mode - simple dictionary-style definitions
        if difficulty == "concepts":
            return f"""Create {count} SIMPLE VOCABULARY flashcards from this content:

{content}
{custom_section}{chapter_instruction}

MODE: DICTIONARY-STYLE - Like a vocabulary dictionary or glossary.

RULES (MUST FOLLOW):
1. SIMPLE questions only - no complex scenarios or applications
2. One concept per card
3. SHORT answers (1 sentence max, ideally just a few words)
4. Test BASIC RECALL, not understanding

FLASHCARD TYPES TO USE:

Type A - "What is X?" (50% of cards)
- Front: "What is [term]?"
- Back: "[Simple definition]"
- Example: Front: "What is photosynthesis?" → Back: "The process plants use to convert sunlight into food"

Type B - "What describes X?" (30% of cards)
- Front: "What is the [property/shape/type] of X?"
- Back: "[Answer]"
- Example: Front: "What is the electron geometry of a molecule with 4 bonding pairs and 1 lone pair?" → Back: "Trigonal bipyramidal with seesaw molecular shape"
- Example: Front: "What is the chemical formula for water?" → Back: "H2O"

Type C - "Definition → Term" (20% of cards)
- Front: "[Description of concept]"
- Back: "[Term name]"
- Example: Front: "The organelle that produces energy in cells" → Back: "Mitochondria"

KEEP IT SIMPLE! Think flashcards for studying vocabulary before an exam.

JSON format:
{{
    "flashcards": [
        {{
            "front_text": "Simple question",
            "back_text": "Short answer",
            "difficulty": "concepts",
            "tags": {tags_value}
        }}
    ]
}}"""

        # Difficulty guidance for standard modes
        difficulty_guidance = {
            "easy": "EASY: Basic definitions, simple concepts, straightforward facts that are easy to remember",
            "medium": "MEDIUM: Application of concepts, moderate complexity, requires some understanding",
            "hard": "HARD: Complex relationships, analysis required, challenging concepts that require deep understanding"
        }.get(difficulty, "MEDIUM")

        # Tags for standard mode
        standard_tags = f'["{chapter}"]' if chapter else '["topic1", "topic2"]'

        return f"""Create {count} {difficulty.upper()} difficulty educational flashcards from this content:

{content}
{custom_section}{chapter_instruction}

Difficulty Level: {difficulty_guidance}

Guidelines:
- Front should contain a clear question or term
- Back should contain a concise but complete answer
- Focus on key concepts, definitions, and important facts
- ALL flashcards MUST be {difficulty.upper()} difficulty - do NOT vary the difficulty
- Use clear, educational language

Respond with JSON in this format:
{{
    "flashcards": [
        {{
            "front_text": "Question or term",
            "back_text": "Answer or definition",
            "difficulty": "{difficulty}",
            "tags": {standard_tags}
        }}
    ]
}}"""

    def _parse_flashcards_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse the AI response into flashcards."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            flashcards = data.get("flashcards", [])

            valid_flashcards = []
            for f in flashcards:
                if f.get("front_text") and f.get("back_text"):
                    valid_flashcards.append({
                        "front_text": f["front_text"],
                        "back_text": f["back_text"],
                        "difficulty": f.get("difficulty", "medium"),
                        "tags": f.get("tags", []),
                    })

            return valid_flashcards

        except json.JSONDecodeError:
            logger.warning("flashcard_parse_failed", response_preview=response[:200])
            return []


async def generate_questions(
    db: AsyncSession,
    category_id: int,
    content: str,
    count: int = 5,
    difficulty: str = "medium",
    question_type: str = "multiple_choice",
    custom_directions: str = "",
    document_id: Optional[int] = None,
    chapter: str = "",
) -> Dict[str, Any]:
    """
    Generate questions for a category.

    Uses analysis patterns if available.

    Args:
        db: Database session
        category_id: Category to generate for
        content: Source content
        count: Number of questions
        difficulty: Difficulty level
        question_type: Type of questions
        custom_directions: User instructions
        document_id: Optional document to link questions to
        chapter: Optional chapter/topic to tag questions with

    Returns:
        Generation result with questions
    """
    # Get analysis patterns if available
    result = await db.execute(
        select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
    )
    analysis = result.scalar_one_or_none()

    style_guide = analysis.style_guide if analysis else None

    # Generate questions
    agent = GenerationAgent()
    result = await agent.process({
        "content": content,
        "count": count,
        "difficulty": difficulty,
        "question_type": question_type,
        "style_guide": style_guide,
        "custom_directions": custom_directions,
        "chapter": chapter,
    })

    if result["success"]:
        # Store generated questions
        questions = result["questions"]
        stored_questions = []

        for q_data in questions:
            question = Question(
                category_id=category_id,
                document_id=document_id,
                question_text=q_data["question_text"],
                question_type=q_data["question_type"],
                difficulty=q_data["difficulty"],
                options=q_data.get("options"),
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation", ""),
                tags=q_data.get("tags", []),
            )
            db.add(question)
            stored_questions.append(question)

        # Log agent message
        agent_msg = AgentMessageModel(
            category_id=category_id,
            from_agent="generation_agent",
            to_agent="controller",
            message_type="questions_generated",
            payload={
                "count": len(questions),
                "difficulty": difficulty,
                "question_type": question_type,
            },
            status="processed",
        )
        db.add(agent_msg)

        logger.info(
            "questions_generated_and_stored",
            category_id=category_id,
            count=len(stored_questions),
        )

        result["stored_questions"] = stored_questions

    return result


async def generate_flashcards(
    db: AsyncSession,
    category_id: int,
    content: str,
    count: int = 10,
    difficulty: str = "medium",
    custom_directions: str = "",
    document_id: Optional[int] = None,
    chapter: str = "",
) -> Dict[str, Any]:
    """
    Generate flashcards for a category.

    Args:
        db: Database session
        category_id: Category to generate for
        content: Source content
        count: Number of flashcards
        difficulty: Difficulty level (easy, medium, hard)
        custom_directions: User instructions
        document_id: Optional document to link flashcards to
        chapter: Optional chapter/topic to tag flashcards with

    Returns:
        Generation result with flashcards
    """
    agent = GenerationAgent()
    result = await agent.generate_flashcards(
        content=content,
        count=count,
        difficulty=difficulty,
        custom_directions=custom_directions,
        chapter=chapter,
    )

    if result["success"]:
        flashcards = result["flashcards"]
        stored_flashcards = []

        for f_data in flashcards:
            flashcard = Flashcard(
                category_id=category_id,
                document_id=document_id,
                front_text=f_data["front_text"],
                back_text=f_data["back_text"],
                difficulty=f_data.get("difficulty", "medium"),
                tags=f_data.get("tags", []),
            )
            db.add(flashcard)
            stored_flashcards.append(flashcard)

        logger.info(
            "flashcards_generated_and_stored",
            category_id=category_id,
            count=len(stored_flashcards),
        )

        result["stored_flashcards"] = stored_flashcards

    return result


# Singleton instance
generation_agent = GenerationAgent()
