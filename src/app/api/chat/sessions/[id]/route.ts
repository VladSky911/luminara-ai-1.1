import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/chat/sessions/[id] - Get session with messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await db.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('[API] Error getting session:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

// PATCH /api/chat/sessions/[id] - Rename a session
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const session = await db.chatSession.update({
      where: { id },
      data: { title: title.trim() }
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('[API] Error renaming session:', error)
    return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 })
  }
}

// DELETE /api/chat/sessions/[id] - Delete a session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.chatMessage.deleteMany({ where: { sessionId: id } })
    await db.chatSession.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
