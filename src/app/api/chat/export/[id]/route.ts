import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/chat/export/[id] - Export a chat session as markdown
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

    // Build markdown content
    const lines: string[] = []

    // Title
    lines.push(`# Chat Session: ${session.title}`)
    lines.push('')

    // Metadata
    lines.push('**Metadata**')
    lines.push('')
    lines.push(`- **Mode**: ${session.mode}`)
    lines.push(`- **Date**: ${session.createdAt.toISOString()}`)
    lines.push(`- **Messages**: ${session.messages.length}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Messages
    for (const message of session.messages) {
      const heading = message.role === 'user' ? '## User' : '## Luminara AI'
      lines.push(heading)
      lines.push('')
      lines.push(message.content)
      lines.push('')

      // If assistant message has sources, list them as citations
      if (message.role === 'assistant' && message.sources) {
        try {
          const sources = JSON.parse(message.sources)
          if (Array.isArray(sources) && sources.length > 0) {
            lines.push('**Sources:**')
            lines.push('')
            sources.forEach((source: { documentName?: string; content?: string; chunkIndex?: number }, index: number) => {
              const docName = source.documentName || 'Unknown Document'
              const snippet = source.content
                ? source.content.substring(0, 150).replace(/\n/g, ' ') + (source.content.length > 150 ? '...' : '')
                : ''
              lines.push(`${index + 1}. **${docName}**${snippet ? ` — "${snippet}"` : ''}`)
            })
            lines.push('')
          }
        } catch {
          // If sources can't be parsed, skip citations
        }
      }

      // If assistant message has citations, list them
      if (message.role === 'assistant' && message.citations) {
        try {
          const citations = JSON.parse(message.citations)
          if (Array.isArray(citations) && citations.length > 0) {
            lines.push('**Citations:**')
            lines.push('')
            citations.forEach((citation: { text?: string; source?: string; documentId?: string }, index: number) => {
              const text = citation.text || ''
              const source = citation.source || 'Unknown'
              lines.push(`${index + 1}. [${source}] ${text}`)
            })
            lines.push('')
          }
        } catch {
          // If citations can't be parsed, skip
        }
      }

      lines.push('---')
      lines.push('')
    }

    const markdown = lines.join('\n')

    // Sanitize title for filename
    const safeTitle = session.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="chat-${safeTitle}.md"`,
      },
    })
  } catch (error) {
    console.error('[API] Error exporting chat session:', error)
    return NextResponse.json({ error: 'Failed to export chat session' }, { status: 500 })
  }
}
