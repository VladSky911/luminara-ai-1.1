import { db } from '@/lib/db'
import { vectorStore } from '@/lib/vector-store'

// System prompts for RAG modes
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

// POST /api/chat/stream - Stream a RAG response using SSE
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, sessionId, mode = 'balanced', documentIds } = body

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const startTime = Date.now()

    // --- RAG Retrieval (same as non-streaming) ---
    const searchResults = await vectorStore.search(message, {
      topK: 5,
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
        take: 10
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
      { role: 'user' as const, content: message }
    ]

    // Prepare sources for metadata
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
      query: message,
      mode,
      totalCandidates: vectorStore.getStats().totalChunks,
      selectedChunks: searchResults.length,
      searchMode: 'hybrid',
      processingTime: Date.now() - startTime
    }

    // --- Stream the LLM response using SSE ---
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        let fullAnswer = ''

        try {
          // Use z-ai-web-dev-sdk with stream: true
          const ZAI = (await import('z-ai-web-dev-sdk')).default
          const zai = await ZAI.create()

          const streamBody = await zai.chat.completions.create({
            messages,
            stream: true,
            thinking: { type: 'disabled' }
          })

          // streamBody is a ReadableStream when streaming
          if (streamBody && typeof streamBody === 'object' && 'getReader' in streamBody) {
            const reader = (streamBody as ReadableStream).getReader()
            const decoder = new TextDecoder()
            let buffer = '' // Buffer for partial lines

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              // Parse SSE lines from the upstream
              const lines = buffer.split('\n')
              // Keep the last incomplete line in buffer
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmedLine = line.trim()
                if (!trimmedLine) continue
                if (trimmedLine.startsWith('data: ')) {
                  const dataStr = trimmedLine.slice(6).trim()
                  if (dataStr === '[DONE]') continue
                  try {
                    const parsed = JSON.parse(dataStr)
                    const content = parsed.choices?.[0]?.delta?.content || ''
                    if (content) {
                      fullAnswer += content
                      sendEvent('token', { content })
                    }
                  } catch {
                    // Malformed JSON chunk - skip it
                    // Don't send raw data as content since it's likely partial JSON
                  }
                }
              }
            }
            // Process any remaining buffer
            if (buffer.trim().startsWith('data: ')) {
              const dataStr = buffer.trim().slice(6).trim()
              if (dataStr !== '[DONE]') {
                try {
                  const parsed = JSON.parse(dataStr)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  if (content) {
                    fullAnswer += content
                    sendEvent('token', { content })
                  }
                } catch {
                  // Skip malformed
                }
              }
            }
          } else {
            // Non-streaming fallback: the SDK returned a complete response object
            const completion = streamBody as { choices?: Array<{ message?: { content?: string } }> }
            fullAnswer = completion.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
            sendEvent('token', { content: fullAnswer })
          }
        } catch (error) {
          console.error('[Stream API] LLM error:', error)
          // Fallback: try non-streaming call
          try {
            const ZAI = (await import('z-ai-web-dev-sdk')).default
            const zai = await ZAI.create()
            const completion = await zai.chat.completions.create({
              messages,
              thinking: { type: 'disabled' }
            })
            fullAnswer = completion.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
            sendEvent('token', { content: fullAnswer })
          } catch (fallbackError) {
            console.error('[Stream API] Fallback LLM error:', fallbackError)
            fullAnswer = 'I apologize, but I encountered an error generating a response. Please try again.'
            warnings.push('LLM service error — response generation failed')
            sendEvent('token', { content: fullAnswer })
          }
        }

        // Send metadata after streaming is complete
        sendEvent('metadata', {
          sources,
          retrievalTrace: {
            ...retrievalTrace,
            processingTime: Date.now() - startTime
          },
          warnings
        })

        // Save messages to chat session
        if (sessionId) {
          try {
            await db.chatMessage.createMany({
              data: [
                {
                  sessionId,
                  role: 'user',
                  content: message,
                  mode
                },
                {
                  sessionId,
                  role: 'assistant',
                  content: fullAnswer,
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
          } catch (dbError) {
            console.error('[Stream API] DB save error:', dbError)
          }
        }

        sendEvent('done', {})
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('[API] Error in chat stream:', error)
    return new Response(JSON.stringify({ error: 'Failed to process chat message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
