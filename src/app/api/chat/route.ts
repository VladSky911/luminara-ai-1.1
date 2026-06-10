import { NextResponse } from 'next/server'
import { ragQuery } from '@/lib/rag'

// POST /api/chat - Send a message and get RAG response
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, sessionId, mode = 'balanced', documentIds } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const result = await ragQuery({
      query: message,
      sessionId,
      mode,
      documentIds,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Error in chat:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}
