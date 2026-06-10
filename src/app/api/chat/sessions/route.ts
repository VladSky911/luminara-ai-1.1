import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/chat/sessions - List all chat sessions
export async function GET() {
  try {
    const sessions = await db.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } }
      }
    })
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('[API] Error listing sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}

// POST /api/chat/sessions - Create a new chat session
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, mode = 'balanced' } = body

    const session = await db.chatSession.create({
      data: { title: title || 'New Chat', mode }
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
