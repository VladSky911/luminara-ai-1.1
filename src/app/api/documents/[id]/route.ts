import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deleteDocument, reindexDocument } from '@/lib/document-processor'

// GET /api/documents/[id] - Get document details with chunks
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const document = await db.document.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            content: true,
            chunkIndex: true,
            tokenCount: true,
            metadata: true,
            createdAt: true,
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('[API] Error getting document:', error)
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 })
  }
}

// PATCH /api/documents/[id] - Update document (tags, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tags } = body

    const updateData: Record<string, string> = {}
    if (typeof tags === 'string') updateData.tags = tags

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const document = await db.document.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('[API] Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteDocument(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
