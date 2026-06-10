import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; chunks?: number; docs?: number; totalSize?: number; documentCount?: number; vocabularySize?: number; isIndexed?: boolean }> = {
    database: { status: 'unknown' },
    vectorStore: { status: 'unknown' },
    llm: { status: 'unknown' },
    storage: { status: 'unknown' },
  }

  // Check database
  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'healthy', latency: Date.now() - start }
  } catch {
    checks.database = { status: 'error', latency: -1 }
  }

  // Check vector store
  try {
    const { vectorStore } = await import('@/lib/vector-store')
    const stats = vectorStore.getStats()
    checks.vectorStore = {
      status: stats.totalChunks > 0 ? 'healthy' : 'degraded',
      chunks: stats.totalChunks,
      docs: stats.totalChunks > 0 ? -1 : 0,
      vocabularySize: stats.vocabularySize,
      isIndexed: stats.isIndexed,
    }
    // Try to get document count from vector store's internal data
    const docIds = new Set<string>()
    // We can count distinct documents from the database instead
    const docCount = await db.document.count()
    checks.vectorStore.docs = docCount
    if (docCount > 0 && stats.totalChunks === 0) checks.vectorStore.status = 'degraded'
  } catch {
    checks.vectorStore = { status: 'error', chunks: 0, docs: 0 }
  }

  // Check LLM (try to create an instance)
  try {
    const start = Date.now()
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    await ZAI.create()
    checks.llm = { status: 'healthy', latency: Date.now() - start }
  } catch {
    checks.llm = { status: 'error', latency: -1 }
  }

  // Storage info
  try {
    const docs = await db.document.findMany({ select: { fileSize: true } })
    const totalSize = docs.reduce((s, d) => s + d.fileSize, 0)
    checks.storage = { status: 'healthy', totalSize, documentCount: docs.length }
  } catch {
    checks.storage = { status: 'error', totalSize: 0, documentCount: 0 }
  }

  const allStatuses = Object.values(checks).map(c => c.status)
  const overallStatus = allStatuses.every(s => s === 'healthy') ? 'healthy'
    : allStatuses.some(s => s === 'error') ? 'degraded'
    : 'degraded'

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  })
}
