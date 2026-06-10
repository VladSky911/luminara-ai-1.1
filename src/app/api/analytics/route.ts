import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // ──────────────────────────────────────────────
    // 1. Document Analytics
    // ──────────────────────────────────────────────
    const [
      totalDocuments,
      documentsByTypeRaw,
      documentsByStatusRaw,
      docAggregate,
      totalKnowledgeSizeRaw,
    ] = await Promise.all([
      db.document.count(),
      db.document.groupBy({ by: ['type'], _count: { type: true } }),
      db.document.groupBy({ by: ['status'], _count: { status: true } }),
      db.document.aggregate({ _avg: { chunkCount: true } }),
      db.document.aggregate({ _sum: { fileSize: true } }),
    ])

    const documentsByType: Record<string, number> = {}
    for (const row of documentsByTypeRaw) {
      documentsByType[row.type] = row._count.type
    }

    const documentsByStatus: Record<string, number> = {}
    for (const row of documentsByStatusRaw) {
      documentsByStatus[row.status] = row._count.status
    }

    const averageChunksPerDocument = docAggregate._avg.chunkCount ?? 0
    const totalKnowledgeSize = totalKnowledgeSizeRaw._sum.fileSize ?? 0

    // ──────────────────────────────────────────────
    // 2. Chat Analytics
    // ──────────────────────────────────────────────
    const [
      totalSessions,
      totalMessages,
      messagesByRoleRaw,
      sessionsByModeRaw,
    ] = await Promise.all([
      db.chatSession.count(),
      db.chatMessage.count(),
      db.chatMessage.groupBy({ by: ['role'], _count: { role: true } }),
      db.chatSession.groupBy({ by: ['mode'], _count: { mode: true }, orderBy: { _count: { mode: 'desc' } } }),
    ])

    const messagesByRole: Record<string, number> = {}
    for (const row of messagesByRoleRaw) {
      messagesByRole[row.role] = row._count.role
    }

    const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0

    const mostCommonChatMode = sessionsByModeRaw.length > 0 ? sessionsByModeRaw[0].mode : 'balanced'

    // ──────────────────────────────────────────────
    // 3. Activity Timeline (last 30 days)
    // ──────────────────────────────────────────────
    // Prisma stores DateTime as millisecond integers in SQLite,
    // so we need to use (createdAt / 1000, 'unixepoch') for date() and
    // compare against millisecond timestamps for filtering.
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoMs = thirtyDaysAgo.getTime()

    // Build a map of all dates in the last 30 days initialized to 0
    const dateMap = new Map<string, { documents: number; sessions: number; messages: number }>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dateMap.set(key, { documents: 0, sessions: 0, messages: 0 })
    }

    // Use raw queries for date grouping in SQLite
    // Prisma stores DateTime as ms integers; divide by 1000 for unixepoch
    const documentsPerDay = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT date(createdAt / 1000, 'unixepoch') as date, COUNT(*) as count
      FROM Document
      WHERE createdAt >= ${thirtyDaysAgoMs}
      GROUP BY date(createdAt / 1000, 'unixepoch')
      ORDER BY date
    `

    const sessionsPerDay = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT date(createdAt / 1000, 'unixepoch') as date, COUNT(*) as count
      FROM ChatSession
      WHERE createdAt >= ${thirtyDaysAgoMs}
      GROUP BY date(createdAt / 1000, 'unixepoch')
      ORDER BY date
    `

    const messagesPerDay = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT date(createdAt / 1000, 'unixepoch') as date, COUNT(*) as count
      FROM ChatMessage
      WHERE createdAt >= ${thirtyDaysAgoMs}
      GROUP BY date(createdAt / 1000, 'unixepoch')
      ORDER BY date
    `

    // Fill in the date map with actual counts
    for (const row of documentsPerDay) {
      const entry = dateMap.get(row.date)
      if (entry) {
        entry.documents = Number(row.count)
      }
    }

    for (const row of sessionsPerDay) {
      const entry = dateMap.get(row.date)
      if (entry) {
        entry.sessions = Number(row.count)
      }
    }

    for (const row of messagesPerDay) {
      const entry = dateMap.get(row.date)
      if (entry) {
        entry.messages = Number(row.count)
      }
    }

    const activityTimeline = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      documents: counts.documents,
      sessions: counts.sessions,
      messages: counts.messages,
    }))

    // ──────────────────────────────────────────────
    // 4. Top Documents by chunk count
    // ──────────────────────────────────────────────
    const topDocuments = await db.document.findMany({
      orderBy: { chunkCount: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        type: true,
        chunkCount: true,
        fileSize: true,
        createdAt: true,
      },
    })

    // ──────────────────────────────────────────────
    // 5. Search Stats (placeholder)
    // ──────────────────────────────────────────────
    const searchStats = {
      totalSearches: 0,
      averageResultsPerSearch: 0,
      topSearchTerms: [] as string[],
      searchSuccessRate: 0,
      note: 'Search analytics tracking not yet implemented. This is a placeholder for future search query logging.',
    }

    // ──────────────────────────────────────────────
    // 6. System Health
    // ──────────────────────────────────────────────
    const [dbChunkCount, lastDocument] = await Promise.all([
      db.chunk.count(),
      db.document.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

    const indexedCount = await db.document.count({ where: { status: 'indexed' } })

    const systemHealth = {
      vectorStoreStatus: indexedCount > 0 ? 'active' : 'empty',
      vectorStoreChunks: dbChunkCount,
      vectorStoreIndexedDocuments: indexedCount,
      dbDocumentCount: totalDocuments,
      dbChunkCount: dbChunkCount,
      lastDocumentUploadTime: lastDocument?.createdAt?.toISOString() ?? null,
    }

    // ──────────────────────────────────────────────
    // Compose final response
    // ──────────────────────────────────────────────
    const analytics = {
      documentAnalytics: {
        totalDocuments,
        documentsByType,
        documentsByStatus,
        averageChunksPerDocument: Math.round(averageChunksPerDocument * 100) / 100,
        totalKnowledgeSize,
      },
      chatAnalytics: {
        totalSessions,
        totalMessages,
        messagesByRole,
        averageMessagesPerSession: Math.round(averageMessagesPerSession * 100) / 100,
        mostCommonChatMode,
      },
      activityTimeline,
      topDocuments: topDocuments.map((doc) => ({
        ...doc,
        createdAt: doc.createdAt.toISOString(),
      })),
      searchStats,
      systemHealth,
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
