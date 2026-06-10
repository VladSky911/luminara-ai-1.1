// Vector Store Service - In-memory TF-IDF + Keyword search
// In production, this would be replaced with Qdrant/Chroma/pgvector

import { db } from './db'

interface ChunkWithScore {
  id: string
  documentId: string
  content: string
  chunkIndex: number
  score: number
  sourceName: string
  sourceType: string
  metadata: Record<string, unknown>
}

// TF-IDF calculation helpers
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  const total = tokens.length
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }
  for (const [key, val] of tf) {
    tf.set(key, val / total)
  }
  return tf
}

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>()
  const N = documents.length
  const docFreq = new Map<string, number>()
  
  for (const doc of documents) {
    const unique = new Set(doc)
    for (const token of unique) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1)
    }
  }
  
  for (const [token, freq] of docFreq) {
    idf.set(token, Math.log((N + 1) / (freq + 1)) + 1)
  }
  
  return idf
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

class VectorStore {
  private chunks: Map<string, { content: string; documentId: string; chunkIndex: number; sourceName: string; sourceType: string; metadata: Record<string, unknown> }> = new Map()
  private tfidfVectors: Map<string, number[]> = new Map()
  private vocabulary: string[] = []
  private idf: Map<string, number> = new Map()
  private isIndexed = false

  async indexAll() {
    const chunks = await db.chunk.findMany({
      include: { document: true }
    })

    this.chunks.clear()
    this.tfidfVectors.clear()
    
    if (chunks.length === 0) {
      this.isIndexed = true
      return
    }

    // Build vocabulary and IDF
    const allTokens: string[][] = []
    const chunkEntries: Array<{
      id: string
      content: string
      documentId: string
      chunkIndex: number
      sourceName: string
      sourceType: string
      metadata: Record<string, unknown>
      tokens: string[]
    }> = []

    for (const chunk of chunks) {
      const tokens = tokenize(chunk.content)
      allTokens.push(tokens)
      
      let metadata = {}
      try {
        metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {}
      } catch { /* ignore */ }

      chunkEntries.push({
        id: chunk.id,
        content: chunk.content,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        sourceName: chunk.document.name,
        sourceType: chunk.document.type,
        metadata,
        tokens
      })
    }

    this.idf = computeIDF(allTokens)
    this.vocabulary = Array.from(this.idf.keys()).sort()

    // Compute TF-IDF vectors
    for (const entry of chunkEntries) {
      const tf = computeTF(entry.tokens)
      const vector = this.vocabulary.map(word => {
        const tfVal = tf.get(word) || 0
        const idfVal = this.idf.get(word) || 0
        return tfVal * idfVal
      })

      this.chunks.set(entry.id, {
        content: entry.content,
        documentId: entry.documentId,
        chunkIndex: entry.chunkIndex,
        sourceName: entry.sourceName,
        sourceType: entry.sourceType,
        metadata: entry.metadata
      })
      this.tfidfVectors.set(entry.id, vector)
    }

    this.isIndexed = true
    console.log(`[VectorStore] Indexed ${chunkEntries.length} chunks with vocabulary size ${this.vocabulary.length}`)
  }

  async search(query: string, options: {
    topK?: number
    minScore?: number
    documentIds?: string[]
    mode?: 'semantic' | 'keyword' | 'hybrid'
  } = {}): Promise<ChunkWithScore[]> {
    if (!this.isIndexed) {
      await this.indexAll()
    }

    const { topK = 5, minScore = 0.05, documentIds, mode = 'hybrid' } = options

    if (this.chunks.size === 0) return []

    const queryTokens = tokenize(query)
    
    // Semantic score (TF-IDF cosine similarity)
    const queryTF = computeTF(queryTokens)
    const queryVector = this.vocabulary.map(word => {
      const tfVal = queryTF.get(word) || 0
      const idfVal = this.idf.get(word) || 0
      return tfVal * idfVal
    })

    const semanticScores: Map<string, number> = new Map()
    for (const [chunkId, vector] of this.tfidfVectors) {
      semanticScores.set(chunkId, cosineSimilarity(queryVector, vector))
    }

    // Keyword score (exact match bonus)
    const keywordScores: Map<string, number> = new Map()
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
    
    for (const [chunkId, chunkData] of this.chunks) {
      const contentLower = chunkData.content.toLowerCase()
      let score = 0
      
      // Exact phrase match
      if (contentLower.includes(queryLower)) {
        score += 0.5
      }
      
      // Individual word matches
      for (const word of queryWords) {
        const regex = new RegExp(word, 'gi')
        const matches = contentLower.match(regex)
        if (matches) {
          score += 0.1 * Math.min(matches.length, 5)
        }
      }
      
      keywordScores.set(chunkId, Math.min(score, 1))
    }

    // Combine scores based on mode
    const results: ChunkWithScore[] = []
    
    for (const [chunkId, chunkData] of this.chunks) {
      // Filter by document IDs if specified
      if (documentIds && documentIds.length > 0 && !documentIds.includes(chunkData.documentId)) {
        continue
      }

      const semanticScore = semanticScores.get(chunkId) || 0
      const keywordScore = keywordScores.get(chunkId) || 0

      let combinedScore: number
      switch (mode) {
        case 'semantic':
          combinedScore = semanticScore
          break
        case 'keyword':
          combinedScore = keywordScore
          break
        case 'hybrid':
        default:
          combinedScore = 0.6 * semanticScore + 0.4 * keywordScore
          break
      }

      if (combinedScore >= minScore) {
        results.push({
          id: chunkId,
          documentId: chunkData.documentId,
          content: chunkData.content,
          chunkIndex: chunkData.chunkIndex,
          score: combinedScore,
          sourceName: chunkData.sourceName,
          sourceType: chunkData.sourceType,
          metadata: chunkData.metadata
        })
      }
    }

    // Sort by score descending and return top K
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  async addChunk(chunkId: string) {
    const chunk = await db.chunk.findUnique({
      where: { id: chunkId },
      include: { document: true }
    })
    
    if (!chunk) return
    
    const tokens = tokenize(chunk.content)
    
    // If we have no vocabulary yet, just re-index everything
    if (this.vocabulary.length === 0) {
      await this.indexAll()
      return
    }

    let metadata = {}
    try {
      metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {}
    } catch { /* ignore */ }

    this.chunks.set(chunk.id, {
      content: chunk.content,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      sourceName: chunk.document.name,
      sourceType: chunk.document.type,
      metadata
    })

    // Compute TF-IDF for the new chunk using existing vocabulary and IDF
    const tf = computeTF(tokens)
    const vector = this.vocabulary.map(word => {
      const tfVal = tf.get(word) || 0
      const idfVal = this.idf.get(word) || 0
      return tfVal * idfVal
    })
    this.tfidfVectors.set(chunk.id, vector)
  }

  async removeChunksByDocument(documentId: string) {
    for (const [chunkId, chunkData] of this.chunks) {
      if (chunkData.documentId === documentId) {
        this.chunks.delete(chunkId)
        this.tfidfVectors.delete(chunkId)
      }
    }
  }

  getStats() {
    return {
      totalChunks: this.chunks.size,
      vocabularySize: this.vocabulary.length,
      isIndexed: this.isIndexed
    }
  }
}

// Singleton
export const vectorStore = new VectorStore()
export type { ChunkWithScore }
