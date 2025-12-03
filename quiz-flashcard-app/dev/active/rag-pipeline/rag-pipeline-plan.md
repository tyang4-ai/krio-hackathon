# RAG Pipeline Implementation Plan

**Last Updated:** 2025-12-01

## Executive Summary

Implement a research-backed 3-pipeline architecture for improved quiz/flashcard generation:
1. **Pipeline 1:** Semantic document indexing (chunking + embeddings)
2. **Pipeline 2:** Enhanced style guide extraction from samples
3. **Pipeline 3:** RAG-based generation with validation

---

## Research Foundation

This implementation is based on findings from 12 academic papers.

### Chunking Research

| Paper | Citation | Key Finding | Application |
|-------|----------|-------------|-------------|
| MC-Indexing | arXiv:2404.15103v1 | Content-aware chunking + multi-view indexing achieves 42.8% recall improvement | Topic-based boundary detection |
| SuperRAG | arXiv:2503.04790v1 | Knowledge graphs preserve document structure | Concept map generation |
| SCAN | arXiv:2505.14381v1 | Coarse-grained > fine-grained for knowledge retention | 800-1200 token chunks |
| Vision-Guided | arXiv:2506.16035v2 | PDF visual structure detection improves quality | Page layout awareness |

### Quiz Generation Research

| Paper | Key Finding | Application |
|-------|-------------|-------------|
| Malaysian Math Education | RAG improves validity from 12-15% to 92-96% | RAG retrieval mandatory |
| AI Assess Study | Few-shot improves accuracy from 16% to 80% | Few-shot examples in style guide |
| ScotGEM Medical | 69% usable, 31% require review | Generate 1.5x, filter to target |
| Harvard Field Study | Validated AI questions improve engagement | Include validation pipeline |
| Macedonia/BU Framework | Structured prompts + taxonomy essential | Bloom's taxonomy targeting |
| Maeda Field Testing | r=0.82 correlation with human questions | RAG validates approach |
| KAG System | Knowledge-augmented > pure LLM | Concept map enriches generation |
| Health Science Review | Domain-specific patterns critical | Style guide extraction |

### Key Research Insights Applied

1. **Chunking Size:** SCAN shows coarse-grained (800-1200 tokens) > fine-grained
2. **RAG Essential:** Malaysian Math shows 92-96% validity with RAG vs 12-15% without
3. **Few-Shot Critical:** AI Assess shows 16%→80% accuracy with few-shot examples
4. **Expect Rejection:** ScotGEM shows ~31% need filtering
5. **Structure Matters:** MC-Indexing shows 42.8% improvement with content-aware chunking

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE 1: INDEXING                         │
│                                                                 │
│  Document Upload → Text Extraction → Semantic Chunking          │
│                          ↓                                      │
│               Embedding Generation (OpenAI ada-002)             │
│                          ↓                                      │
│         Store: chunks + embeddings + concept map                │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                 PIPELINE 2: STYLE GUIDE                         │
│                                                                 │
│  Sample Questions → Pattern Extraction → Structured Guide       │
│                          ↓                                      │
│       Store few-shot examples + validation rules                │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                 PIPELINE 3: GENERATION                          │
│                                                                 │
│  User Request → RAG Retrieval → Focused Generation              │
│                          ↓                                      │
│        Validation → Refinement → Final Questions                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Status

### Phase 1: Database & Chunking ✅ COMPLETE

| Task | Status | Files |
|------|--------|-------|
| pgvector extension migration | ✅ | `alembic/versions/20251201_000001_009_add_chunking_tables.py` |
| document_chunks table | ✅ | `models/document_chunk.py` |
| document_topics table | ✅ | `models/document_topic.py` |
| document_concept_maps table | ✅ | `models/document_concept_map.py` |
| ChunkingService - page-level topic detection | ✅ | `services/chunking_service.py` |
| ChunkingService - boundary refinement | ✅ | `services/chunking_service.py` |
| ChunkingService - overlap + multi-topic tagging | ✅ | `services/chunking_service.py` |
| EmbeddingService - OpenAI ada-002 | ✅ | `services/embedding_service.py` |
| Concept map generator | ✅ | `services/chunking_service.py` |

### Phase 2: Enhanced Style Guide 🔄 IN PROGRESS

**Research Foundation:** Based on 6 academic papers on question quality evaluation:
- Ahmed et al. (BMC Medical Education 2025) - Facility/Discrimination metrics
- Sultan (PDQI-9 Framework) - 9-item quality rubric
- Abouzeid et al. (JMIR Medical Education 2025) - Technical item flaws + Bloom's
- Zelikman et al. (Stanford 2023) - Item calibration with LLMs
- Nielsen et al. (Diagnostics 2025) - 6-criteria MCQ assessment
- Cherrez-Ojeda et al. (World Allergy 2025) - DISCERN/JAMA benchmarks

**Quality Scoring Schema (Weighted Dimensions):**
| Dimension | Weight | Description |
|-----------|--------|-------------|
| Clarity | 15% | Clear, unambiguous, grammatically correct |
| Content Accuracy | 20% | Factually correct and up-to-date |
| Answer Accuracy | 15% | Correct answer definitively right |
| Distractor Quality | 15% | Plausible, homogeneous distractors |
| Cognitive Level | 10% | Bloom's taxonomy targeting |
| Rationale Quality | 10% | Educational explanation |
| Single Concept | 10% | Tests one concept only |
| Cover Test | 5% | Can answer without seeing options |

**Quality Thresholds:** ≥4.0 high (few-shot), 3.0-3.9 medium, <3.0 low

| Task | Status |
|------|--------|
| Add few_shot_examples JSONB to ai_analysis | ✅ |
| Add quality_criteria JSONB to ai_analysis | ✅ |
| Add bloom_taxonomy_targets to ai_analysis | ✅ |
| Create migration (011) | ✅ |
| Update AIAnalysisResult model | ✅ |
| Enhance AnalysisAgent - explicit quality scoring | 🔲 |
| Enhance AnalysisAgent - extract best samples as few-shot | 🔲 |
| Enhance AnalysisAgent - Bloom's taxonomy detection | 🔲 |
| Add input validation for samples | 🔲 |
| Add retry logic with exponential backoff | 🔲 |
| Add checkpointing (commit after success) | 🔲 |
| Update get_analysis_status response | 🔲 |

### Phase 3: RAG Generation 🔲 TODO

| Task | Status |
|------|--------|
| Integrate chunking into document upload | 🔲 |
| Update GenerationAgent - use RAG retrieval | 🔲 |
| Update GenerationAgent - include few-shot | 🔲 |
| Implement QuestionValidator | 🔲 |
| Add refinement loop | 🔲 |

---

## Database Schema

### document_chunks
```sql
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    section_title VARCHAR(500),
    chunk_type VARCHAR(50) DEFAULT 'text',
    page_numbers INTEGER[],
    topics TEXT[],
    primary_topic VARCHAR(500),
    key_concepts TEXT[],
    embedding vector(1536),
    embedding_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);
```

### document_topics
```sql
CREATE TABLE document_topics (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    topic_name VARCHAR(500) NOT NULL,
    parent_topic_id INTEGER REFERENCES document_topics(id),
    chunk_ids INTEGER[],
    key_concepts TEXT[],
    related_topics TEXT[],
    difficulty_estimate VARCHAR(20),
    importance_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### document_concept_maps
```sql
CREATE TABLE document_concept_maps (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE UNIQUE,
    concept_map JSONB NOT NULL DEFAULT '{}',
    total_concepts INTEGER DEFAULT 0,
    total_relationships INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Test Environment

- **Backend URL:** studyforge-backend-test.eba-rufp4rir.us-west-1.elasticbeanstalk.com
- **Database:** studyforge-db-test.cfgimwcmaemg.us-west-1.rds.amazonaws.com
- **Region:** us-west-1

---

## New Files Created

| File | Purpose |
|------|---------|
| `alembic/versions/20251201_000001_009_add_chunking_tables.py` | Migration for pgvector + tables |
| `models/document_chunk.py` | SQLAlchemy model for chunks |
| `models/document_topic.py` | SQLAlchemy model for topics |
| `models/document_concept_map.py` | SQLAlchemy model for concept map |
| `services/chunking_service.py` | Semantic chunking logic |
| `services/embedding_service.py` | OpenAI embedding generation |

## Modified Files

| File | Changes |
|------|---------|
| `models/__init__.py` | Added new model imports |
| `models/document.py` | Added chunking_status, total_chunks, total_tokens |
| `requirements.txt` | Added pgvector==0.2.4, tiktoken==0.5.2 |

---

## Dependencies Added

```
pgvector==0.2.4      # PostgreSQL vector extension
tiktoken==0.5.2      # Token counting for OpenAI
```

---

## Next Steps

1. Deploy migration to test database (enable pgvector)
2. Integrate chunking into document upload flow
3. Test chunking with sample documents
4. Implement Phase 2: Enhanced Style Guide
5. Implement Phase 3: RAG Generation
