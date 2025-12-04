# RAG Pipeline Phase 3 - RAG-Based Generation Plan

**Created:** 2025-12-02
**Status:** Planning

## Overview

Upgrade the GenerationAgent to use RAG retrieval and few-shot examples for dramatically improved question/flashcard quality. Research shows:
- RAG retrieval improves validity from 12-15% to 92-96% (Malaysian Math study)
- Few-shot examples improve accuracy from 16% to 80% (AI Assess Study)
- ~31% of generated questions need filtering (ScotGEM Medical)

## Current State

### GenerationAgent Limitations
1. **No RAG retrieval** - Uses content truncation (7000 chars), losing important material
2. **No few-shot examples** - Doesn't use the high-quality samples from AnalysisAgent
3. **No validation** - All generated questions are accepted, no quality filtering
4. **Basic style guide only** - Uses tone/vocabulary but not quality scoring

### What We Have (from Phase 1 & 2)
- `EmbeddingService.search_similar_chunks()` - Vector similarity search
- `AIAnalysisResult.few_shot_examples` - High-quality scored samples
- `AIAnalysisResult.quality_criteria` - Scoring rubric with weights
- `AIAnalysisResult.bloom_taxonomy_targets` - Targeted cognitive levels

---

## Architecture Changes

```
CURRENT FLOW:
┌─────────────────────────────────────────────────────────────┐
│  Request (count, difficulty, content)                       │
│                  ↓                                          │
│        Truncate content to 7000 chars                       │
│                  ↓                                          │
│          Generate ALL questions at once                     │
│                  ↓                                          │
│               Store all                                     │
└─────────────────────────────────────────────────────────────┘

NEW RAG FLOW:
┌─────────────────────────────────────────────────────────────┐
│  Request (count, difficulty, question_type)                 │
│                  ↓                                          │
│  Step 1: RAG Retrieval                                      │
│  - Generate query from request params                       │
│  - Retrieve top-k chunks (20 by default)                    │
│  - Filter by document_ids if specified                      │
│                  ↓                                          │
│  Step 2: Build Enhanced Prompt                              │
│  - Include few-shot examples (3-5 high-quality)             │
│  - Include quality criteria/rubric                          │
│  - Include retrieved chunks as context                      │
│  - Target Bloom's taxonomy levels                           │
│                  ↓                                          │
│  Step 3: Generate 1.5x Target Count                         │
│  - Over-generate to allow filtering                         │
│                  ↓                                          │
│  Step 4: Validate & Score                                   │
│  - Score each on 8 quality dimensions                       │
│  - Filter out low-quality (<3.0 threshold)                  │
│  - Select best up to target count                           │
│                  ↓                                          │
│  Step 5: Store validated questions                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Create RAGService

**Purpose:** Centralize RAG retrieval logic for generation.

**New File:** `services/rag_service.py`

**Methods:**
```python
class RAGService:
    async def retrieve_relevant_chunks(
        self,
        db: AsyncSession,
        category_id: int,
        query: str,
        topic: Optional[str] = None,
        document_ids: Optional[List[int]] = None,
        top_k: int = 20,
    ) -> List[Dict]:
        """Retrieve chunks relevant to generation request."""

    async def build_generation_context(
        self,
        chunks: List[Dict],
        max_tokens: int = 6000,
    ) -> str:
        """Format retrieved chunks into context string."""

    async def generate_retrieval_query(
        self,
        count: int,
        difficulty: str,
        question_type: str,
        topic: Optional[str] = None,
    ) -> str:
        """Generate optimal query for retrieval."""
```

**Estimated Time:** 30 minutes

---

### Task 2: Update GenerationAgent with Few-Shot Examples

**Purpose:** Include high-quality samples in generation prompt.

**File:** `agents/generation_agent.py`

**Changes:**
1. Add parameter for few-shot examples
2. Update `_build_generation_prompt()` to format examples
3. Include quality rubric in prompt

**New Prompt Structure:**
```
You are an expert educator. Generate questions following these examples.

## Quality Standards
Score each generated question mentally on these dimensions (1-5):
- Clarity (15%): Clear, unambiguous stem
- Content Accuracy (20%): Factually correct
- Answer Accuracy (15%): Correct answer is definitively right
- Distractor Quality (15%): Plausible distractors
- Cognitive Level (10%): Target {bloom_level}
- Rationale Quality (10%): Educational explanation
- Single Concept (10%): Tests one concept only
- Cover Test (5%): Can answer without seeing options

Only generate questions that would score >= 4.0 overall.

## Example Questions (Score >= 4.0)
{few_shot_examples formatted}

## Source Content
{retrieved_chunks}

Generate {count} {difficulty} {question_type} questions.
```

**Estimated Time:** 45 minutes

---

### Task 3: Create QuestionValidator

**Purpose:** Score and filter generated questions.

**New File:** `services/question_validator.py`

**Methods:**
```python
class QuestionValidator:
    async def score_question(
        self,
        question: Dict,
        source_content: str,
    ) -> Dict[str, float]:
        """Score a question on 8 quality dimensions."""

    async def validate_batch(
        self,
        questions: List[Dict],
        source_content: str,
        min_threshold: float = 3.0,
    ) -> List[Dict]:
        """Validate batch and return filtered list with scores."""

    def _calculate_overall_score(self, scores: Dict[str, float]) -> float:
        """Calculate weighted overall score."""
```

**Validation Prompt:**
```
Evaluate this question against quality criteria. Return JSON scores (1-5):

Question: {question_text}
Options: {options}
Answer: {correct_answer}
Explanation: {explanation}

Source content excerpt: {relevant_chunk}

Return:
{
    "clarity": 4,
    "content_accuracy": 5,
    "answer_accuracy": 5,
    "distractor_quality": 3,
    "cognitive_level": 4,
    "rationale_quality": 4,
    "single_concept": 5,
    "cover_test": 4,
    "issues": ["Minor issues found..."],
    "bloom_level": "apply"
}
```

**Estimated Time:** 1 hour

---

### Task 4: Update generate_questions Flow

**Purpose:** Integrate RAG retrieval and validation.

**File:** `agents/generation_agent.py` (function `generate_questions`)

**New Flow:**
```python
async def generate_questions_with_rag(
    db: AsyncSession,
    category_id: int,
    count: int = 5,
    difficulty: str = "medium",
    question_type: str = "multiple_choice",
    custom_directions: str = "",
    document_ids: Optional[List[int]] = None,
    chapter: str = "",
    validate: bool = True,
) -> Dict[str, Any]:
    """
    Generate questions using RAG retrieval and validation.

    Steps:
    1. Get analysis (few-shot examples, quality criteria)
    2. Build retrieval query
    3. Retrieve relevant chunks
    4. Generate 1.5x target with few-shot examples
    5. Validate and filter (if validate=True)
    6. Store best questions up to target count
    """
```

**Estimated Time:** 1 hour

---

### Task 5: Update Flashcard Generation

**Purpose:** Apply same RAG pattern to flashcards.

**File:** `agents/generation_agent.py`

**Changes:**
- Update `generate_flashcards()` to use RAG retrieval
- Simpler validation (no distractors, no options)
- Focus on clarity, accuracy, single concept

**Estimated Time:** 45 minutes

---

### Task 6: Add Refinement Loop (Optional)

**Purpose:** Automatically improve low-scoring questions.

**File:** `services/question_validator.py`

**Method:**
```python
async def refine_question(
    self,
    question: Dict,
    scores: Dict[str, float],
    source_content: str,
) -> Dict:
    """
    Attempt to improve a question that scored between 3.0-3.9.

    Uses targeted prompts based on lowest-scoring dimensions.
    """
```

**Estimated Time:** 1 hour (optional, can defer)

---

## Database Changes

No database schema changes required. All existing tables support the new flow.

---

## API Changes

### New Parameters for /api/categories/{id}/generate-questions

```python
class GenerateQuestionsRequest:
    count: int = 5
    difficulty: str = "medium"
    question_type: str = "multiple_choice"
    custom_directions: str = ""
    document_ids: Optional[List[int]] = None  # NEW: Filter to specific documents
    chapter: Optional[str] = None
    use_rag: bool = True  # NEW: Enable/disable RAG (default True)
    validate: bool = True  # NEW: Enable/disable validation (default True)
```

### New Response Fields

```python
{
    "success": True,
    "questions": [...],
    "generation_stats": {
        "generated_count": 8,  # Before validation
        "validated_count": 5,  # After validation
        "filtered_count": 3,   # Removed by validation
        "average_score": 4.2,
        "chunks_used": 12,
    }
}
```

---

## Testing Plan

### Unit Tests
1. `test_rag_service.py`
   - Test chunk retrieval
   - Test query generation
   - Test context building

2. `test_question_validator.py`
   - Test scoring
   - Test batch validation
   - Test threshold filtering

### Integration Tests
1. Full RAG generation flow
2. Comparison: RAG vs non-RAG quality
3. Few-shot impact measurement

---

## Implementation Order

| # | Task | Dependencies | Est. Time |
|---|------|--------------|-----------|
| 1 | Create RAGService | Phase 1 complete | 30 min |
| 2 | Update GenerationAgent with few-shot | Phase 2 complete | 45 min |
| 3 | Create QuestionValidator | None | 1 hr |
| 4 | Update generate_questions flow | Tasks 1-3 | 1 hr |
| 5 | Update flashcard generation | Tasks 1-3 | 45 min |
| 6 | Add refinement loop | Task 3 | 1 hr (optional) |
| 7 | Add tests | All above | 1 hr |

**Total Estimated Time:** 5-6 hours

---

## Success Metrics

1. **Quality Score Improvement**
   - Target: Average question score >= 4.0
   - Current baseline: Unknown (no scoring)

2. **Rejection Rate**
   - Target: ~20-30% filtered (matching ScotGEM research)
   - Indicates validation is working

3. **Content Coverage**
   - Generated questions cover retrieved chunk topics
   - No "hallucinated" content not in source

4. **User Satisfaction**
   - Questions match style of samples (if provided)
   - Appropriate difficulty level

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-filtering leaves too few questions | High | Lower threshold or disable validation |
| RAG retrieval slow | Medium | Cache embeddings, limit chunk count |
| Few-shot increases token usage | Low | Limit to 3-5 examples |
| Validation API costs | Medium | Batch validation, optional toggle |

---

## Next Steps After Approval

1. Create `services/rag_service.py` with RAGService class
2. Test retrieval independently with existing chunks
3. Update GenerationAgent prompt structure
4. Create QuestionValidator
5. Wire together in generate_questions flow
6. Test end-to-end
