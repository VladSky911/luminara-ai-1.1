import { NextResponse } from 'next/server'
import { reindexDocument } from '@/lib/document-processor'

// POST /api/documents/[id]/reindex - Reindex a document
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await reindexDocument(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Error reindexing document:', error)
    return NextResponse.json({ error: 'Failed to reindex document' }, { status: 500 })
  }
}
