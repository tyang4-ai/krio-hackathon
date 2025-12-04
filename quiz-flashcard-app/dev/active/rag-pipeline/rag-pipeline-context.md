# RAG Pipeline - Development Context

**Last Updated:** 2025-12-04

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database & Chunking | ✅ Complete |
| Phase 2 | Enhanced Style Guide | ✅ Complete |
| Phase 3 | RAG Generation | ✅ Complete |
| Phase 4 | SLM Integration | ✅ Complete |
| Phase 5 | Deployment | ✅ Test Deployed |

## Key Files Reference

### New Models (Phase 1)

| File | Purpose |
|------|---------|
| [document_chunk.py](../../../backend-python/models/document_chunk.py) | Chunk model with embedding support |
| [document_topic.py](../../../backend-python/models/document_topic.py) | Topic hierarchy model |
| [document_concept_map.py](../../../backend-python/models/document_concept_map.py) | Concept relationship mapping |

### New Services (Phase 1-4)

| File | Purpose |
|------|---------|
| [chunking_service.py](../../../backend-python/services/chunking_service.py) | 4-phase semantic chunking |
| [embedding_service.py](../../../backend-python/services/embedding_service.py) | OpenAI ada-002 embeddings |
| [rag_service.py](../../../backend-python/services/rag_service.py) | RAG context retrieval with pgvector (Phase 3) |
| [question_validator.py](../../../backend-python/services/question_validator.py) | 8-dimension quality validation (Phase 3) |
| [task_router.py](../../../backend-python-slm-copy/services/task_router.py) | SLM/LLM routing logic (Phase 4) |

### Migrations

| File | Content |
|------|---------|
| [009_add_chunking_tables.py](../../../backend-python/alembic/versions/20251201_000001_009_add_chunking_tables.py) | pgvector + chunking tables (Phase 1) |
| [011_add_enhanced_style_guide.py](../../../backend-python/alembic/versions/20251201_000003_011_add_enhanced_style_guide_columns.py) | few_shot_examples, quality_criteria, bloom_taxonomy (Phase 2) |
| [015_add_question_quality.py](../../../backend-python/alembic/versions/20251203_000000_015_add_question_quality_columns.py) | quality_score, bloom_level, quality_scores on questions (Phase 3) |

### Modified Files (Phase 2-4)

| File | Changes Made |
|------|--------------|
| [agents/analysis_agent.py](../../../backend-python/agents/analysis_agent.py) | ✅ 8-dimension quality scoring, few-shot extraction, Bloom's taxonomy |
| [agents/generation_agent.py](../../../backend-python/agents/generation_agent.py) | ✅ RAG retrieval, validation, SLM routing for flashcards |
| [agents/explanation_agent.py](../../../backend-python/agents/explanation_agent.py) | ✅ SLM routing for short explanations |
| [services/ai_service.py](../../../backend-python/services/ai_service.py) | ✅ Groq client, `generate_with_slm()` method |
| [routers/documents.py](../../../backend-python/routers/documents.py) | ✅ Chunk endpoints (chunk, embed, index, search) |
| [routers/ai.py](../../../backend-python/routers/ai.py) | ✅ useRag/validate params, quality fields in response |
| [config/settings.py](../../../backend-python/config/settings.py) | ✅ Embedding provider, SLM settings, Claude Sonnet 4 |

---

## Research Paper Summary

### Chunking (4 papers)

**MC-Indexing (arXiv:2404.15103v1)**
- Content-aware chunking beats fixed-size by 42.8% recall
- Multi-view indexing for different retrieval needs
- Applied: Topic-based boundary detection

**SuperRAG (arXiv:2503.04790v1)**
- Knowledge graphs preserve document structure
- Concept relationships improve retrieval
- Applied: Concept map generation

**SCAN (arXiv:2505.14381v1)**
- Coarse-grained (800-1200 tokens) > fine-grained
- Structure preservation over granularity
- Applied: Target 1000 tokens per chunk

**Vision-Guided (arXiv:2506.16035v2)**
- PDF visual structure detection
- Layout-aware chunking
- Applied: Page-based detection with markers

### Quiz Generation (8 papers)

**Malaysian Math Education Study**
- RAG improves validity: 12-15% → 92-96%
- Critical finding for quiz generation
- Applied: RAG retrieval mandatory

**AI Assess Study**
- Few-shot examples: 16% → 80% accuracy
- Dramatic improvement with examples
- Applied: Store and use few-shot examples

**ScotGEM Medical Study**
- 69% questions usable without editing
- 31% require expert review
- Applied: Generate 1.5x, filter to target

**Harvard Field Study**
- Validated AI questions improve engagement
- Students prefer validated content
- Applied: Include validation pipeline

**Macedonia/BU Framework**
- Structured prompts essential
- Bloom's taxonomy targeting
- Applied: Taxonomy-aware generation

**Maeda Field Testing**
- r=0.82 correlation with human questions
- RAG validates approach quality
- Applied: Quality benchmarking

**KAG System**
- Knowledge-augmented > pure LLM
- Concept relationships improve quality
- Applied: Concept map in generation

**Health Science Review**
- Domain-specific patterns critical
- Clinical vignette style needs extraction
- Applied: Style guide extraction

---

## Technical Decisions

### Chunking Strategy
- **Target size:** 1000 tokens (per SCAN research)
- **Range:** 500-1500 tokens acceptable
- **Overlap:** 100 tokens between adjacent chunks
- **Multi-topic:** Each chunk tagged with ALL topics

### Embedding Choice
- **Model:** OpenAI text-embedding-ada-002
- **Dimensions:** 1536
- **Cost:** ~$0.0001/1K tokens (negligible)
- **Index:** HNSW for fast similarity search

### AI Provider for Chunking
- Uses existing anthropic/openai settings
- Claude Sonnet 4 for quality-critical tasks
- Batch processing for efficiency

### Model Selection (Phase 4)
| Task | Model | Rationale |
|------|-------|-----------|
| Question generation | Claude Sonnet 4 | Quality-critical |
| Document organization | Claude Sonnet 4 | Semantic understanding |
| Quality scoring | Claude Sonnet 4 | 8-dimension judgment |
| Written grading | Claude Sonnet 4 | Partial credit logic |
| Simple flashcards | Groq Llama 8B | Low-risk, structured |
| Short explanations | Groq Llama 70B | Basic tutoring |
| MCQ/TF grading | Hardcoded | No AI needed |

### Quality Scoring Weights (Phase 2-3)
```python
QUALITY_WEIGHTS = {
    "clarity": 0.15,
    "content_accuracy": 0.20,
    "answer_accuracy": 0.15,
    "distractor_quality": 0.10,
    "cognitive_level": 0.10,
    "rationale_quality": 0.10,
    "single_concept": 0.10,
    "cover_test": 0.10,
}
```

---

## Configuration

```python
# ChunkingService defaults
target_tokens: int = 1000
min_tokens: int = 500
max_tokens: int = 1500
overlap_tokens: int = 100

# EmbeddingService defaults
batch_size: int = 100
embedding_model: str = "text-embedding-ada-002"
```

---

## API Usage

### Chunk a document
```python
from services.chunking_service import chunking_service

result = await chunking_service.chunk_document(db, document_id)
# Returns: ChunkResult with chunks, topics, concept_map, total_tokens
```

### Generate embeddings
```python
from services.embedding_service import embedding_service

count = await embedding_service.embed_document_chunks(db, document_id)
# Returns: number of chunks embedded
```

### Search similar chunks
```python
chunks = await embedding_service.search_similar_chunks(
    db,
    query="cell membrane transport",
    category_id=1,
    top_k=20,
)
# Returns: List of chunks with similarity scores
```

---

## REST API Endpoints

### Chunking & Embedding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/{id}/chunk` | Trigger semantic chunking for a document |
| POST | `/api/documents/{id}/embed` | Generate embeddings for document chunks |
| POST | `/api/documents/{id}/index` | Full indexing: chunk + embed in one call |
| GET | `/api/documents/{id}/chunks` | Get all chunks with metadata |
| GET | `/api/documents/{id}/concept-map` | Get concept relationship map |
| POST | `/api/categories/{id}/search-chunks` | Vector similarity search |

### Example: Index a document

```bash
# Full indexing (chunk + embed)
curl -X POST "https://api.example.com/api/documents/123/index"

# Response:
{
  "success": true,
  "document_id": 123,
  "chunking": {
    "status": "complete",
    "total_chunks": 15,
    "total_tokens": 12500,
    "topics": ["Cell Biology", "Membrane Transport", "Osmosis"]
  },
  "embedding": {
    "status": "complete",
    "chunks_embedded": 15
  }
}
```

### Example: Search chunks

```bash
curl -X POST "https://api.example.com/api/categories/1/search-chunks" \
  -H "Content-Type: application/json" \
  -d '{"query": "how does osmosis work", "top_k": 10}'

# Response:
{
  "query": "how does osmosis work",
  "category_id": 1,
  "total_results": 10,
  "chunks": [
    {
      "id": 45,
      "content": "Osmosis is the movement of water...",
      "similarity": 0.92,
      "primary_topic": "Membrane Transport",
      "key_concepts": ["osmosis", "water potential", "semi-permeable"]
    }
  ]
}
```

---

## Environment Variables

No new environment variables required. Uses existing:
- `OPENAI_API_KEY` - for embeddings
- `ANTHROPIC_API_KEY` - for topic extraction
- `DATABASE_URL` - must be PostgreSQL with pgvector
