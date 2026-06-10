import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { indexUploadedContent } from '@/lib/rag'

// GET /api/documents - List all documents
export async function GET() {
  try {
    const documents = await db.document.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        fileSize: true,
        chunkCount: true,
        tags: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { chunks: true } }
      }
    })

    const stats = {
      total: documents.length,
      indexed: documents.filter(d => d.status === 'indexed').length,
      processing: documents.filter(d => d.status === 'processing').length,
      pending: documents.filter(d => d.status === 'pending').length,
      failed: documents.filter(d => d.status === 'failed').length,
    }

    return NextResponse.json({ documents, stats })
  } catch (error) {
    console.error('[API] Error listing documents:', error)
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, content } = body

    if (!name || !type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, content' },
        { status: 400 }
      )
    }

    const validTypes = ['pdf', 'docx', 'txt', 'md']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid document type. Supported: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const fileSize = new TextEncoder().encode(content).length

    const result = await indexUploadedContent({
      name,
      type,
      content,
      fileSize
    })

    return NextResponse.json({
      id: result.documentId,
      status: result.status,
      chunkCount: result.chunkCount
    }, { status: 201 })
  } catch (error) {
    console.error('[API] Error uploading document:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
