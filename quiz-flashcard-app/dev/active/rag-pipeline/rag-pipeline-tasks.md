# RAG Pipeline - Task Checklist

**Last Updated:** 2025-12-01

## Phase 1: Database & Chunking (Foundation)

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

## Phase 2: Enhanced Style Guide

### Database Schema
- [ ] Add few_shot_examples JSONB to ai_analysis
- [ ] Add validation_rules JSONB to ai_analysis
- [ ] Add bloom_taxonomy_targets TEXT[] to ai_analysis
- [ ] Create migration (010)

### AnalysisAgent Enhancement
- [ ] Extract 3-5 best sample questions as few-shot examples
- [ ] Identify validation rules from patterns
- [ ] Detect Bloom's taxonomy levels being tested
- [ ] Store structured output in enhanced schema

---

## Phase 3: RAG Generation

### Integration
- [x] Integrate chunking into document upload flow (API endpoints added)
- [ ] Add background task for chunking
- [ ] Add background task for embedding

### RAG Retrieval
- [ ] Create RAGService for retrieval
- [ ] Topic extraction from user request
- [ ] Vector search with category filtering
- [ ] Chunk ranking and selection

### GenerationAgent Updates
- [ ] Use RAG-retrieved chunks instead of full doc
- [ ] Include few-shot examples from style guide
- [ ] Generate 1.5x questions for filtering

### QuestionValidator
- [ ] Check against validation_rules
- [ ] Verify factual accuracy against source chunks
- [ ] Check for duplicates (semantic similarity)
- [ ] Style rule enforcement

### Refinement Loop
- [ ] Fix style violations automatically
- [ ] Regenerate failed questions
- [ ] Max 2 refinement attempts

### API Updates
- [x] New chunk-related endpoints in documents router
  - POST `/api/documents/{id}/chunk` - Trigger chunking
  - POST `/api/documents/{id}/embed` - Generate embeddings
  - POST `/api/documents/{id}/index` - Full indexing (chunk + embed)
  - GET `/api/documents/{id}/chunks` - Get chunks
  - GET `/api/documents/{id}/concept-map` - Get concept map
  - POST `/api/categories/{id}/search-chunks` - Vector search
- [ ] Updated generation endpoints in ai router

---

## Phase 4: Testing & Optimization

### Testing
- [ ] Test with PDF documents
- [ ] Test with PowerPoint documents
- [ ] Test with plain text documents
- [ ] Test chunking accuracy
- [ ] Test embedding quality
- [ ] Test RAG retrieval relevance

### Optimization
- [ ] Tune chunking parameters (tokens, overlap)
- [ ] Optimize embedding batch size
- [ ] Add caching for embeddings
- [ ] Performance benchmarking

### Deployment
- [ ] Deploy to test environment
- [ ] Run migration on test database
- [ ] Verify pgvector extension works
- [ ] Test full pipeline end-to-end
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
