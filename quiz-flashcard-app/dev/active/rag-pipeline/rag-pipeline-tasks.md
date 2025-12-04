# RAG Pipeline - Task Checklist

**Last Updated:** 2025-12-04

## Phase 1: Database & Chunking (Foundation) ✅ COMPLETE

### Database Setup
- [x] Create migration for pgvector extension
- [x] Create document_chunks table
- [x] Create document_topics table
- [x] Create document_concept_maps table
- [x] Add chunking columns to documents table

### Models
- [x] DocumentChunk model with embedding support
- [x] DocumentTopic model with hierarchy
- [x] DocumentConceptMap model with JSONB
- [x] Update Document model with chunking fields
- [x] Update models/__init__.py exports

### ChunkingService
- [x] Token counting with tiktoken
- [x] Page splitting (PDF, PPTX, plain text)
- [x] Phase 1: Page-level topic detection
- [x] Phase 2: Boundary refinement
- [x] Phase 3: Chunk formation with overlap
- [x] Phase 4: Multi-topic tagging per chunk
- [x] Concept map generation

### EmbeddingService
- [x] OpenAI ada-002 embedding generation
- [x] Batch embedding (100 at a time)
- [x] pgvector storage
- [x] Similarity search function
- [x] Concept-based retrieval

### Dependencies
- [x] Add pgvector==0.2.4 to requirements
- [x] Add tiktoken==0.5.2 to requirements

---

## Phase 2: Enhanced Style Guide ✅ COMPLETE

### Database Schema
- [x] Add few_shot_examples JSONB to ai_analysis
- [x] Add quality_criteria JSONB to ai_analysis (renamed from validation_rules)
- [x] Add bloom_taxonomy_targets JSONB to ai_analysis
- [x] Create migration (011_add_enhanced_style_guide_columns.py)

### AnalysisAgent Enhancement
- [x] Extract 3-5 best sample questions as few-shot examples (score >= 4.0)
- [x] 8-dimension quality scoring with research-backed weights
- [x] Detect Bloom's taxonomy levels being tested
- [x] Store structured output in enhanced schema

---

## Phase 3: RAG Generation ✅ COMPLETE

### Integration
- [x] Integrate chunking into document upload flow (API endpoints added)
- [x] RAG retrieval integrated into generation flow (optional via `useRag` param)
- [x] Question validation integrated (optional via `validate` param)

### RAG Retrieval
- [x] Create RAGService (`services/rag_service.py`) - ~320 lines
- [x] Topic extraction from user request (chapter parameter)
- [x] Vector search with category filtering via pgvector
- [x] Chunk ranking and selection with token budgeting
- [x] In-memory caching with MD5 keys

### GenerationAgent Updates
- [x] Use RAG-retrieved chunks via `rag_service.retrieve_context()`
- [x] Include few-shot examples from style guide
- [x] Generate 1.5x questions for filtering (when validate=true)
- [x] Store quality_score, bloom_level, quality_scores on Question model

### QuestionValidator
- [x] Create QuestionValidator (`services/question_validator.py`) - ~380 lines
- [x] 8-dimension quality scoring (same weights as AnalysisAgent)
- [x] Minimum threshold filtering (default: 3.5)
- [x] Batch scoring and refinement
- [x] Quality report generation

### API Updates
- [x] New chunk-related endpoints in documents router
  - POST `/api/documents/{id}/chunk` - Trigger chunking
  - POST `/api/documents/{id}/embed` - Generate embeddings
  - POST `/api/documents/{id}/index` - Full indexing (chunk + embed)
  - GET `/api/documents/{id}/chunks` - Get chunks
  - GET `/api/documents/{id}/concept-map` - Get concept map
  - POST `/api/categories/{id}/search-chunks` - Vector search
- [x] Updated generation endpoints in ai router
  - Added `useRag` parameter (enables RAG context retrieval)
  - Added `validate` parameter (enables quality validation)
  - Response includes `quality_score`, `bloom_level`, `quality_scores`
  - Response includes `validation` report (pass/fail counts)

---

## Phase 4: SLM Integration ✅ COMPLETE

### Cost Optimization
- [x] Add Groq as SLM provider (Llama 3.1 8B / Llama 3.3 70B)
- [x] Create TaskRouter for intelligent model selection
- [x] Route simple flashcards to SLM 8B
- [x] Route short explanations to SLM 70B
- [x] Keep quality-critical tasks on Claude Sonnet 4
- [x] Automatic fallback to Claude if SLM fails

### Files Created/Modified
- [x] `config/settings.py` - SLM provider settings
- [x] `services/ai_service.py` - Groq client + `generate_with_slm()`
- [x] `services/task_router.py` - New file for routing logic
- [x] `agents/generation_agent.py` - SLM for flashcards
- [x] `agents/explanation_agent.py` - SLM for short explanations

### Testing
- [x] Test Groq API connection (both 8B and 70B)
- [x] Test TaskRouter routing logic
- [x] Test ExplanationAgent with SLM
- [x] Verify Claude fallback works

## Phase 5: Deployment ✅ COMPLETE

### Test Environment
- [x] Deploy to test environment (Studyforge-test-backend)
- [x] Run migration 015 on test database
- [x] Verify pgvector extension works
- [x] Test RAG + validation end-to-end
- [x] Test backward compatibility (without useRag/validate)

### Production
- [ ] Deploy to production (pending final testing)
- [ ] Monitor for issues

---

## Notes

### Priority Order
1. Deploy Phase 1 to test environment
2. Test chunking with real documents
3. Implement Phase 2 (style guide)
4. Implement Phase 3 (RAG generation)
5. Full integration testing

### Risk Factors
- pgvector must be available on RDS (PostgreSQL 15+)
- OpenAI API costs for embeddings (minimal)
- AI model latency for topic detection
