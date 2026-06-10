import { NextResponse } from 'next/server'
import { vectorStore } from '@/lib/vector-store'
import { db } from '@/lib/db'

// POST /api/search - Search the knowledge base
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, mode = 'hybrid', topK = 5, documentIds } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const results = await vectorStore.search(query, {
      topK,
      minScore: 0.02,
      documentIds,
      mode
    })

    const enrichedResults = await Promise.all(
      results.map(async (chunk) => {
        const doc = await db.document.findUnique({
          where: { id: chunk.documentId },
          select: { name: true, type: true, status: true }
        })
        return {
          ...chunk,
          documentName: doc?.name || 'Unknown',
          documentType: doc?.type || 'unknown',
        }
      })
    )

    return NextResponse.json({
      results: enrichedResults,
      total: results.length,
      vectorStoreStats: vectorStore.getStats()
    })
  } catch (error) {
    console.error('[API] Error searching:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
