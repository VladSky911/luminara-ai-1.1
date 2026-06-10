import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deleteDocument } from '@/lib/document-processor'

// POST /api/documents/bulk-delete - Delete multiple documents
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: ids (non-empty array of document IDs)' },
        { status: 400 }
      )
    }

    // Validate all IDs are strings
    const validIds = ids.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid document IDs provided' },
        { status: 400 }
      )
    }

    // Check which documents exist
    const existingDocs = await db.document.findMany({
      where: { id: { in: validIds } },
      select: { id: true }
    })
    const existingIds = new Set(existingDocs.map(d => d.id))

    // Delete each document using the existing deleteDocument function
    // which handles chunk deletion, vector store cleanup, and re-indexing
    let deleted = 0
    for (const id of validIds) {
      if (existingIds.has(id)) {
        try {
          await deleteDocument(id)
          deleted++
        } catch (error) {
          console.error(`[API] Error deleting document ${id}:`, error)
          // Continue with remaining documents even if one fails
        }
      }
    }

    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('[API] Error bulk deleting documents:', error)
    return NextResponse.json({ error: 'Failed to bulk delete documents' }, { status: 500 })
  }
}
