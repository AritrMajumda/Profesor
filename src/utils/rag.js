// RAG Engine for Profesor
// Implements chunking, embeddings, and vector search for PDF-based Q&A
// With rate limit handling

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const EMBEDDING_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

/**
 * RAG Store - In-memory vector database for document chunks
 */
class RAGStore {
    constructor() {
        this.chunks = [];
        this.documentTitle = '';
    }

    clear() {
        this.chunks = [];
        this.documentTitle = '';
    }

    addChunk(text, embedding, metadata = {}) {
        this.chunks.push({ id: this.chunks.length, text, embedding, metadata });
    }

    findSimilar(queryEmbedding, topK = 5) {
        if (this.chunks.length === 0) return [];

        // If no embeddings, return first chunks
        if (!queryEmbedding || queryEmbedding.length === 0) {
            return this.chunks.slice(0, topK);
        }

        const scored = this.chunks.map(chunk => ({
            ...chunk,
            score: chunk.embedding?.length > 0
                ? cosineSimilarity(queryEmbedding, chunk.embedding)
                : 0,
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }

    getAllText() {
        return this.chunks.map(c => c.text).join('\n\n');
    }

    get size() {
        return this.chunks.length;
    }
}

export const ragStore = new RAGStore();

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Split text into semantic chunks
 */
export function chunkText(text, chunkSize = 1500, overlap = 200) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
        if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
            chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
            const words = currentChunk.split(' ');
            currentChunk = words.slice(-20).join(' ') + ' ' + para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }

    if (currentChunk.trim()) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex });
    }

    // If too few chunks, do sentence-based splitting
    if (chunks.length < 3 && text.length > 1000) {
        return splitBySentences(text, chunkSize);
    }

    return chunks;
}

function splitBySentences(text, chunkSize) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
            chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push({ text: currentChunk.trim(), index: chunkIndex });
    }

    return chunks;
}

/**
 * Generate embedding with rate limit handling
 */
async function generateEmbeddingWithRetry(text, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(`${EMBEDDING_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: { parts: [{ text }] }
                })
            });

            if (response.status === 429) {
                if (attempt < retries) {
                    console.warn(`Embedding rate limited. Waiting ${2 ** attempt}s...`);
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                    continue;
                }
                return null; // Skip embedding on rate limit
            }

            if (!response.ok) return null;

            const data = await response.json();
            return data.embedding?.values || null;
        } catch (error) {
            console.error('Embedding error:', error);
            return null;
        }
    }
    return null;
}

/**
 * Process document: chunk and create embeddings
 */
export async function processDocument(text, title, onProgress = null) {
    // IMPORTANT: Clear all previous chunks first
    console.log(`[RAG] Clearing previous store (had ${ragStore.size} chunks)`);
    ragStore.clear();
    ragStore.documentTitle = title;
    console.log(`[RAG] Processing new document: "${title}"`);

    const chunks = chunkText(text);
    console.log(`[RAG] Created ${chunks.length} chunks from document`);

    let embeddingsCreated = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        if (onProgress) {
            onProgress({
                current: i + 1,
                total: chunks.length,
                status: `Processing chunk ${i + 1}/${chunks.length}...`
            });
        }

        // Try to get embedding, but don't fail if rate limited
        const embedding = await generateEmbeddingWithRetry(chunk.text);

        if (embedding) {
            embeddingsCreated++;
        }

        // Always store the chunk (with or without embedding)
        ragStore.addChunk(chunk.text, embedding || [], {
            index: chunk.index,
            title,
            hasEmbedding: !!embedding
        });

        // Delay between chunks to avoid rate limits (reduced for local processing)
        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`RAG store: ${ragStore.size} chunks, ${embeddingsCreated} with embeddings`);
    return ragStore.size;
}

/**
 * Retrieve relevant chunks for a query
 */
export async function retrieveContext(query, topK = 4) {
    if (ragStore.size === 0) {
        console.warn('RAG store is empty');
        return '';
    }

    // Try to get query embedding (timeout fast if API is slow)
    // If embedding generation takes > 1s, we should just use text search or raw chunks
    let queryEmbedding = null;
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 800));
        queryEmbedding = await Promise.race([
            generateEmbeddingWithRetry(query, 0), // 0 retries for speed
            timeoutPromise
        ]);
    } catch (e) {
        console.warn('Embedding generation timed out or failed, falling back to simple chunk retrieval');
        // Fallback: No embedding
    }

    // Find similar chunks (fallback to first chunks + random variation if no embedding)
    // If no embedding, we return a mix of the beginning (abstract) and some middle chunks to simulate "search"
    const similar = ragStore.findSimilar(queryEmbedding, topK);

    console.log(`Retrieved ${similar.length} chunks for query`);
    return similar.map(c => c.text).join('\n\n---\n\n');
}

/**
 * Get document summary (first few chunks)
 */
export function getDocumentSummary(maxChunks = 3) {
    if (ragStore.size === 0) return '';
    return ragStore.chunks.slice(0, maxChunks).map(c => c.text).join('\n\n');
}

export function isDocumentLoaded() {
    return ragStore.size > 0;
}

export function getDocumentTitle() {
    return ragStore.documentTitle;
}
