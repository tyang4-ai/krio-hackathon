"""
Embedding service for generating and storing vector embeddings.

Supports multiple embedding providers:
- OpenAI: text-embedding-ada-002 (1536 dimensions)
- Moonshot/Kimi: moonshot-v1-embedding (1024 dimensions)
- Voyage AI: voyage-3 (1024 dimensions) - excellent quality, good fallback

Embeddings are stored in PostgreSQL using pgvector extension.
"""
from typing import List, Optional

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.document_chunk import DocumentChunk
from config.settings import settings

logger = structlog.get_logger()

# Embedding model configurations
EMBEDDING_CONFIGS = {
    "openai": {
        "model": "text-embedding-ada-002",
        "dimension": 1536,
        "max_chars": 32000,  # ~8000 tokens
    },
    "moonshot": {
        "model": "moonshot-v1-embedding",
        "dimension": 1024,
        "max_chars": 32000,  # Similar limit
    },
    "voyage": {
        "model": "voyage-3",
        "dimension": 1024,
        "max_chars": 32000,  # ~8000 tokens
    },
}

BATCH_SIZE = 100  # Process embeddings in batches


class EmbeddingService:
    """
    Service for generating and managing vector embeddings.

    Supports multiple providers:
    - OpenAI: text-embedding-ada-002 (1536 dimensions)
    - Moonshot/Kimi: moonshot-v1-embedding (1024 dimensions)
    - Voyage AI: voyage-3 (1024 dimensions)
    """

    def __init__(self, batch_size: int = BATCH_SIZE):
        """Initialize embedding service."""
        self.batch_size = batch_size
        self._openai_client = None
        self._moonshot_client = None
        self._voyage_client = None
        self.provider = settings.embedding_provider

    @property
    def config(self) -> dict:
        """Get current provider configuration."""
        return EMBEDDING_CONFIGS.get(self.provider, EMBEDDING_CONFIGS["openai"])

    @property
    def openai_client(self):
        """Lazy-load OpenAI client."""
        if self._openai_client is None:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._openai_client

    @property
    def moonshot_client(self):
        """Lazy-load Moonshot/Kimi client (OpenAI-compatible API)."""
        if self._moonshot_client is None:
            from openai import AsyncOpenAI
            self._moonshot_client = AsyncOpenAI(
                api_key=settings.moonshot_api_key,
                base_url=settings.moonshot_base_url,
            )
        return self._moonshot_client

    @property
    def voyage_client(self):
        """Lazy-load Voyage AI client."""
        if self._voyage_client is None:
            import voyageai
            self._voyage_client = voyageai.AsyncClient(api_key=settings.voyage_api_key)
        return self._voyage_client

    @property
    def client(self):
        """Get the appropriate client based on provider setting (OpenAI-compatible only)."""
        if self.provider == "moonshot":
            return self.moonshot_client
        return self.openai_client

    @property
    def model(self) -> str:
        """Get the embedding model name for current provider."""
        if self.provider == "moonshot":
            return settings.moonshot_embedding_model
        if self.provider == "voyage":
            return settings.voyage_embedding_model
        return settings.embedding_model

    @property
    def dimension(self) -> int:
        """Get embedding dimension for current provider."""
        return self.config["dimension"]

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            List of floats (dimension depends on provider)
        """
        max_chars = self.config["max_chars"]
        if len(text) > max_chars:
            text = text[:max_chars]

        logger.debug(
            "generating_embedding",
            provider=self.provider,
            model=self.model,
            text_length=len(text),
        )

        # Voyage AI has a different API
        if self.provider == "voyage":
            result = await self.voyage_client.embed(
                texts=[text],
                model=self.model,
                input_type="document",
            )
            return result.embeddings[0]

        # OpenAI-compatible APIs (OpenAI, Moonshot)
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
        )

        return response.data[0].embedding

    async def generate_embeddings_batch(
        self,
        texts: List[str],
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in a batch.

        Args:
            texts: List of texts to embed

        Returns:
            List of embeddings
        """
        max_chars = self.config["max_chars"]
        truncated_texts = [t[:max_chars] if len(t) > max_chars else t for t in texts]

        logger.debug(
            "generating_batch_embeddings",
            provider=self.provider,
            model=self.model,
            batch_size=len(texts),
        )

        # Voyage AI has a different API
        if self.provider == "voyage":
            result = await self.voyage_client.embed(
                texts=truncated_texts,
                model=self.model,
                input_type="document",
            )
            return result.embeddings

        # OpenAI-compatible APIs (OpenAI, Moonshot)
        response = await self.client.embeddings.create(
            model=self.model,
            input=truncated_texts,
        )

        # Sort by index to ensure order matches input
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [d.embedding for d in sorted_data]

    async def embed_document_chunks(
        self,
        db: AsyncSession,
        document_id: int,
    ) -> int:
        """
        Generate and store embeddings for all chunks of a document.

        Args:
            db: Database session
            document_id: Document ID

        Returns:
            Number of chunks embedded
        """
        # Get pending chunks
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .where(DocumentChunk.embedding_status == "pending")
            .order_by(DocumentChunk.chunk_index)
        )
        chunks = list(result.scalars().all())

        if not chunks:
            logger.info("no_chunks_to_embed", document_id=document_id)
            return 0

        logger.info(
            "embedding_started",
            document_id=document_id,
            num_chunks=len(chunks),
            provider=self.provider,
            model=self.model,
            dimension=self.dimension,
        )

        # Process in batches
        total_embedded = 0
        for i in range(0, len(chunks), self.batch_size):
            batch = chunks[i:i + self.batch_size]
            texts = [chunk.content for chunk in batch]

            try:
                embeddings = await self.generate_embeddings_batch(texts)

                # Store embeddings using raw SQL (pgvector)
                for chunk, embedding in zip(batch, embeddings):
                    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
                    # Use string formatting for the vector cast since asyncpg
                    # doesn't support ::vector with parameterized queries
                    await db.execute(
                        text(f"""
                            UPDATE document_chunks
                            SET embedding = '{embedding_str}'::vector,
                                embedding_status = 'complete'
                            WHERE id = :chunk_id
                        """),
                        {"chunk_id": chunk.id},
                    )

                total_embedded += len(batch)

                logger.debug(
                    "embedding_batch_complete",
                    document_id=document_id,
                    batch_start=i,
                    batch_size=len(batch),
                )

            except Exception as e:
                logger.error(
                    "embedding_batch_failed",
                    document_id=document_id,
                    batch_start=i,
                    error=str(e),
                )
                # Mark batch as failed
                for chunk in batch:
                    chunk.embedding_status = "failed"
                raise

        # Update document with embedding metadata
        await db.execute(
            text("""
                UPDATE documents
                SET embedding_provider = :provider,
                    embedding_dimension = :dimension
                WHERE id = :document_id
            """),
            {
                "provider": self.provider,
                "dimension": self.dimension,
                "document_id": document_id,
            },
        )

        await db.flush()

        logger.info(
            "embedding_complete",
            document_id=document_id,
            total_embedded=total_embedded,
            provider=self.provider,
            dimension=self.dimension,
        )

        return total_embedded

    async def search_similar_chunks(
        self,
        db: AsyncSession,
        query: str,
        category_id: int,
        top_k: int = 20,
        document_ids: Optional[List[int]] = None,
        similarity_threshold: float = 0.3,
    ) -> List[dict]:
        """
        Search for chunks similar to a query using vector similarity.

        Args:
            db: Database session
            query: Search query
            category_id: Category to search within
            top_k: Number of results to return
            document_ids: Optional filter to specific documents
            similarity_threshold: Minimum similarity score (0-1)

        Returns:
            List of chunk dictionaries with similarity scores
        """
        # Generate embedding for query
        query_embedding = await self.generate_embedding(query)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # Build query with optional document filter
        doc_filter = ""
        params = {
            "category_id": category_id,
            "top_k": top_k,
            "threshold": 1 - similarity_threshold,  # Convert to distance
        }

        if document_ids:
            doc_filter = "AND dc.document_id = ANY(:doc_ids)"
            params["doc_ids"] = document_ids

        # Execute similarity search
        # Note: embedding_str is embedded directly because asyncpg doesn't support
        # the ::vector cast with parameterized queries
        result = await db.execute(
            text(f"""
                SELECT
                    dc.id,
                    dc.document_id,
                    dc.chunk_index,
                    dc.content,
                    dc.section_title,
                    dc.primary_topic,
                    dc.topics,
                    dc.key_concepts,
                    dc.page_numbers,
                    1 - (dc.embedding <=> '{embedding_str}'::vector) as similarity
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE d.category_id = :category_id
                    AND dc.embedding_status = 'complete'
                    AND (dc.embedding <=> '{embedding_str}'::vector) <= :threshold
                    {doc_filter}
                ORDER BY dc.embedding <=> '{embedding_str}'::vector
                LIMIT :top_k
            """),
            params,
        )

        rows = result.fetchall()

        return [
            {
                "id": row.id,
                "document_id": row.document_id,
                "chunk_index": row.chunk_index,
                "content": row.content,
                "section_title": row.section_title,
                "primary_topic": row.primary_topic,
                "topics": row.topics,
                "key_concepts": row.key_concepts,
                "page_numbers": row.page_numbers,
                "similarity": row.similarity,
            }
            for row in rows
        ]

    async def get_chunks_by_concept(
        self,
        db: AsyncSession,
        document_id: int,
        concept: str,
    ) -> List[DocumentChunk]:
        """
        Get chunks that contain a specific concept.

        Args:
            db: Database session
            document_id: Document ID
            concept: Concept to search for

        Returns:
            List of matching chunks
        """
        # Use array contains operator for topics/key_concepts
        result = await db.execute(
            text("""
                SELECT * FROM document_chunks
                WHERE document_id = :doc_id
                AND (
                    :concept = ANY(topics)
                    OR :concept = ANY(key_concepts)
                    OR primary_topic ILIKE :concept_pattern
                )
                ORDER BY chunk_index
            """),
            {
                "doc_id": document_id,
                "concept": concept.lower(),
                "concept_pattern": f"%{concept}%",
            },
        )

        return list(result.fetchall())


# Global service instance
embedding_service = EmbeddingService()
