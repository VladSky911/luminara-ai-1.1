// RAG Pipeline Service
// Combines vector search with LLM answer generation

import { db } from './db'
import { vectorStore, type ChunkWithScore } from './vector-store'
import { processDocument } from './document-processor'

export interface RAGResponse {
  answer: string
  sources: Array<{
    chunkId: string
    documentId: string
    documentName: string
    documentType: string
    content: string
    score: number
    chunkIndex: number
  }>
  retrievalTrace: {
    query: string
    mode: string
    totalCandidates: number
    selectedChunks: number
    searchMode: string
    processingTime: number
  }
  warnings: string[]
}

const SYSTEM_PROMPTS: Record<string, string> = {
  strict: `You are Luminara AI, a precise knowledge-base assistant. You MUST only answer based on the provided context from the team's documents.

RULES:
- Only use information from the provided context
- If the context doesn't contain enough information, say "I don't have enough information in the knowledge base to answer this question."
- Always cite your sources using [Source N] format
- Be factual and precise
- Never add information not present in the context
- If you're unsure, express uncertainty clearly`,

  balanced: `You are Luminara AI, a helpful knowledge-base assistant. Answer based primarily on the provided context, but you may use general knowledge to supplement when the context is incomplete.

RULES:
- Prioritize information from the provided context
- You may add general knowledge, but clearly mark it as such
- Always cite document sources using [Source N] format
- If context is insufficient, provide what you can and note the limitations
- Be helpful while maintaining accuracy`,

  creative: `You are Luminara AI, a knowledgeable assistant. Use the provided context as a foundation, and expand with relevant insights.

RULES:
- Use the provided context as your primary source
- Feel free to expand with relevant knowledge and connections
- Cite document sources using [Source N] format when drawing from them
- Provide rich, detailed answers with context and connections
- Note when you're going beyond the provided documents`
}

export async function ragQuery(params: {
  query: string
  sessionId?: string
  mode?: 'strict' | 'balanced' | 'creative'
  documentIds?: string[]
  topK?: number
}): Promise<RAGResponse> {
  const startTime = Date.now()
  const { query, sessionId, mode = 'balanced', documentIds, topK = 5 } = params

  // Search for relevant chunks
  const searchResults = await vectorStore.search(query, {
    topK,
    minScore: 0.02,
    documentIds,
    mode: 'hybrid'
  })

  const warnings: string[] = []

  if (searchResults.length === 0) {
    warnings.push('No relevant documents found in the knowledge base')
  }

  if (mode === 'strict' && searchResults.length > 0 && searchResults[0].score < 0.15) {
    warnings.push('Low confidence in retrieved sources — the answer may not be well-supported by the knowledge base')
  }

  // Build context from search results
  const contextParts = searchResults.map((chunk, i) => {
    return `[Source ${i + 1}] (Document: "${chunk.sourceName}", Relevance: ${(chunk.score * 100).toFixed(1)}%)\n${chunk.content}`
  })
  const context = contextParts.join('\n\n---\n\n')

  // Get chat history for context
  let historyMessages: Array<{ role: string; content: string }> = []
  if (sessionId) {
    const messages = await db.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10 // Last 10 messages for context window
    })
    historyMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
  }

  // Build LLM messages
  const systemPrompt = SYSTEM_PROMPTS[mode]
  const contextMessage = searchResults.length > 0
    ? `Here are the relevant documents from the knowledge base:\n\n${context}`
    : 'No relevant documents were found in the knowledge base for this query.'

  const messages = [
    { role: 'assistant' as const, content: systemPrompt },
    { role: 'user' as const, content: contextMessage },
    ...historyMessages.slice(-6).map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content
    })),
    { role: 'user' as const, content: query }
  ]

  // Call LLM via z-ai-web-dev-sdk
  let answer = ''
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' }
    })
    
    answer = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
  } catch (error) {
    console.error('[RAG] LLM error:', error)
    answer = 'I apologize, but I encountered an error generating a response. Please try again.'
    warnings.push('LLM service error — response generation failed')
  }

  const processingTime = Date.now() - startTime

  const sources = searchResults.map(chunk => ({
    chunkId: chunk.id,
    documentId: chunk.documentId,
    documentName: chunk.sourceName,
    documentType: chunk.sourceType,
    content: chunk.content,
    score: chunk.score,
    chunkIndex: chunk.chunkIndex
  }))

  const retrievalTrace = {
    query,
    mode,
    totalCandidates: vectorStore.getStats().totalChunks,
    selectedChunks: searchResults.length,
    searchMode: 'hybrid',
    processingTime
  }

  // Save messages to chat session
  if (sessionId) {
    await db.chatMessage.createMany({
      data: [
        {
          sessionId,
          role: 'user',
          content: query,
          mode
        },
        {
          sessionId,
          role: 'assistant',
          content: answer,
          citations: JSON.stringify(sources.map((s, i) => ({
            index: i + 1,
            documentName: s.documentName,
            documentType: s.documentType,
            score: s.score
          }))),
          sources: JSON.stringify(sources),
          mode
        }
      ]
    })
  }

  return {
    answer,
    sources,
    retrievalTrace,
    warnings
  }
}

export async function indexUploadedContent(params: {
  name: string
  type: string
  content: string
  fileSize: number
}): Promise<{ documentId: string; status: string; chunkCount: number }> {
  // Create document record
  const document = await db.document.create({
    data: {
      name: params.name,
      type: params.type,
      content: params.content,
      fileSize: params.fileSize,
      status: 'pending'
    }
  })

  // Process the document (chunking + indexing)
  const result = await processDocument(document.id)

  return {
    documentId: document.id,
    status: result.status,
    chunkCount: result.chunkCount
  }
}
