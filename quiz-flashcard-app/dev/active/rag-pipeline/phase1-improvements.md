# RAG Pipeline Phase 1 - Code Improvements Plan

**Last Updated:** 2025-12-02
**Status:** Planning

## Overview

Code review of Phase 1 (semantic chunking + embeddings) identified 6 critical improvements needed before Phase 2 development.

## Priority Order

| # | Issue | Severity | Est. Time | Status |
|---|-------|----------|-----------|--------|
| 1 | SQL Injection in embedding storage | Critical | 15 min | ✅ Complete |
| 2 | Add async concurrency for AI calls | High | 30 min | Pending |
| 3 | Fix overlap position tracking | Medium | 15 min | Pending |
| 4 | Add semantic similarity for topic comparison | Medium | 1 hr | Pending |
| 5 | Add checkpointing/error recovery | Medium | 1 hr | Pending |
| 6 | Knowledge graph enhancement | Low | 4+ hrs | Pending (Phase 2) |

---

## Issue 1: SQL Injection Vulnerability

### Current Problem

```python
# embedding_service.py:242-254
embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
await db.execute(
    text(f"""
        UPDATE document_chunks
        SET embedding = '{embedding_str}'::vector,
            embedding_status = 'complete'
        WHERE id = :chunk_id
    """),
    {"chunk_id": chunk.id},
)
```

**Issue:** `embedding_str` is directly interpolated into SQL string. While embeddings come from trusted API sources currently, this pattern is dangerous if:
- Code is refactored
- Embedding source changes
- Another developer copies this pattern elsewhere

### Solution

Add validation helper + defensive formatting:

```python
def validate_and_format_embedding(embedding: List[float]) -> str:
    """Safely format embedding for pgvector with validation."""
    if not embedding:
        raise ValueError("Empty embedding")

    if not all(isinstance(x, (int, float)) for x in embedding):
        raise ValueError("Embedding must contain only numbers")

    if not all(-1e10 < x < 1e10 for x in embedding):
        raise ValueError("Embedding values out of range")

    return "[" + ",".join(f"{float(x):.8f}" for x in embedding) + "]"
```

### Files to Modify

- `services/embedding_service.py`

### Status: ✅ COMPLETE

---

## Issue 2: Sequential AI Calls are Slow

### Current Problem

```python
# chunking_service.py:619-623
for chunk in raw_chunks:
    topic_info = await self.extract_topics_for_chunk(chunk["content"])
    chunk.update(topic_info)
```

**Issue:** For 100 chunks with ~500ms/call = 50+ seconds. All calls are sequential when they could be parallel.

### Solution

Use `asyncio.gather` with semaphore for rate limiting:

```python
async def extract_topics_batch(self, chunks: List[Dict], max_concurrent: int = 10):
    semaphore = Semaphore(max_concurrent)

    async def process_one(chunk):
        async with semaphore:
            return await self.extract_topics_for_chunk(chunk["content"])

    tasks = [process_one(c) for c in chunks]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

**Expected improvement:** 50 seconds → ~5 seconds (10x faster)

### Files to Modify

- `services/chunking_service.py`

### Status: Pending Approval

---

## Issue 3: Overlap Position Tracking Bug

### Current Problem

```python
# chunking_service.py:457-459
chunks[i]["content"] = f"[...] {overlap_text}\n\n{chunks[i]['content']}"
chunks[i]["token_count"] += len(overlap_tokens)
# start_char and end_char are NOT updated - they're now WRONG
```

**Issue:** After prepending overlap, `start_char` and `end_char` no longer match the actual content positions. This breaks citation features.

### Solution

Track original positions separately:

```python
chunks[i]["original_start_char"] = chunks[i]["start_char"]
chunks[i]["original_end_char"] = chunks[i]["end_char"]
chunks[i]["overlap_length"] = len(overlap_text)
chunks[i]["overlap_source_chunk"] = i - 1
```

### Files to Modify

- `services/chunking_service.py`
- `models/document_chunk.py` (add optional fields if needed)

### Status: Pending Approval

---

## Issue 4: Topic Comparison Uses String Equality

### Current Problem

```python
# chunking_service.py:228, 246, 262
if start_topic.lower() != end_topic.lower():
```

**Issue:** String equality is brittle. "Mitochondria and ATP" vs "ATP and Mitochondria" are detected as different topics.

### Solution

Use embedding similarity instead:

```python
async def topics_are_similar(self, topic1: str, topic2: str, threshold: float = 0.85) -> bool:
    emb1 = await self.embedding_service.generate_embedding(topic1)
    emb2 = await self.embedding_service.generate_embedding(topic2)
    similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
    return similarity >= threshold
```

### Files to Modify

- `services/chunking_service.py`
- May need to inject `EmbeddingService` dependency

### Status: Pending Approval

---

## Issue 5: No Error Recovery for API Calls

### Current Problem

```python
# chunking_service.py:619-623
for chunk in raw_chunks:
    topic_info = await self.extract_topics_for_chunk(chunk["content"])
    # If this fails at chunk 47, the 46 successful calls are wasted
```

**Issue:** No checkpointing. If processing fails mid-way, all progress is lost.

### Solution

Add checkpoint after each successful extraction:

```python
async def chunk_document_with_recovery(self, db, document_id):
    # Check for existing partial progress
    existing = await get_processed_chunks(db, document_id)
    processed_indices = {c.chunk_index for c in existing}

    for chunk in raw_chunks:
        if chunk["chunk_index"] in processed_indices:
            continue  # Skip already processed

        for attempt in range(3):  # Retry logic
            try:
                topic_info = await self.extract_topics_for_chunk(chunk["content"])
                await save_chunk_immediately(db, document_id, chunk, topic_info)
                await db.commit()  # Checkpoint!
                break
            except Exception as e:
                if attempt == 2:
                    # Mark as failed but continue
                    chunk.update({"topics": [], "primary_topic": None})
                else:
                    await asyncio.sleep(2 ** attempt)  # Backoff
```

### Files to Modify

- `services/chunking_service.py`

### Status: Pending Approval

---

## Issue 6: Concept Map is Just Co-occurrence Index

### Current Problem

Current "concept map":
```json
{"mitochondria": {"chunk_ids": [1,2], "related": ["ATP", "energy"]}}
```

This is just tracking which concepts appear together - no real relationships.

### Real Knowledge Graph

```json
{
    "nodes": {
        "mitochondria": {"type": "concept", "chunk_ids": [1,2]}
    },
    "edges": [
        {"source": "mitochondria", "target": "ATP", "relationship": "produces"}
    ]
}
```

### Recommendation

**Defer to Phase 2** - This is a significant enhancement, not a bug fix. The current co-occurrence map is functional for Phase 1.

### Status: Deferred to Phase 2

---

## Progress Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created improvement plan | Identified 6 issues from code review |
| 2025-12-02 | ✅ Issue 1 Complete | Added `validate_and_format_embedding()` helper function with type checking, range validation, and fixed-precision formatting. Updated both usage sites in `embed_document_chunks()` and `search_similar_chunks()`. |