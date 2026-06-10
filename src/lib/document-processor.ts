// Document Processing Service
// Handles text extraction, chunking, and embedding pipeline

import { db } from './db'
import { vectorStore } from './vector-store'

const CHUNK_SIZE = 500 // characters per chunk
const CHUNK_OVERLAP = 100 // overlap between chunks

export interface ProcessingResult {
  documentId: string
  status: 'indexed' | 'failed'
  chunkCount: number
  error?: string
}

function extractTextFromContent(content: string, type: string): string {
  // For the demo, we handle plain text and markdown directly
  // In production, you'd use pdf-parse, mammoth, etc.
  switch (type) {
    case 'txt':
    case 'md':
      return content
    case 'pdf':
    case 'docx':
      // For demo, we treat the raw content as text
      // In production, use actual parsers
      return content
    default:
      return content
  }
}

function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): Array<{ content: string; index: number }> {
  const chunks: Array<{ content: string; index: number }> = []
  
  if (!text || text.trim().length === 0) return chunks

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  let currentChunk = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({ content: currentChunk.trim(), index: chunkIndex })
      chunkIndex++
      
      // Keep overlap from end of current chunk
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + '\n\n' + paragraph
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({ content: currentChunk.trim(), index: chunkIndex })
  }

  return chunks
}

export async function processDocument(documentId: string): Promise<ProcessingResult> {
  try {
    // Update status to processing
    await db.document.update({
      where: { id: documentId },
      data: { status: 'processing' }
    })

    const document = await db.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      throw new Error('Document not found')
    }

    if (!document.content) {
      throw new Error('No content to process')
    }

    // Extract text
    const text = extractTextFromContent(document.content, document.type)
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document')
    }

    // Chunk the text
    const textChunks = chunkText(text)
    
    if (textChunks.length === 0) {
      throw new Error('No chunks could be created from the document')
    }

    // Delete existing chunks for this document (in case of re-processing)
    await db.chunk.deleteMany({
      where: { documentId }
    })

    // Create chunk records
    for (const chunk of textChunks) {
      const tokenCount = Math.ceil(chunk.content.split(/\s+/).length * 1.3) // rough estimate
      
      await db.chunk.create({
        data: {
          documentId,
          content: chunk.content,
          chunkIndex: chunk.index,
          tokenCount,
          metadata: JSON.stringify({
            charStart: 0,
            charEnd: chunk.content.length,
            wordCount: chunk.content.split(/\s+/).length
          })
        }
      })
    }

    // Update document status
    await db.document.update({
      where: { id: documentId },
      data: {
        status: 'indexed',
        chunkCount: textChunks.length,
        updatedAt: new Date()
      }
    })

    // Re-index vector store
    await vectorStore.indexAll()

    return {
      documentId,
      status: 'indexed',
      chunkCount: textChunks.length
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    await db.document.update({
      where: { id: documentId },
      data: {
        status: 'failed',
        errorMessage
      }
    })

    return {
      documentId,
      status: 'failed',
      chunkCount: 0,
      error: errorMessage
    }
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  await db.chunk.deleteMany({
    where: { documentId }
  })
  
  await db.document.delete({
    where: { id: documentId }
  })

  await vectorStore.removeChunksByDocument(documentId)
  await vectorStore.indexAll()
}

export async function reindexDocument(documentId: string): Promise<ProcessingResult> {
  return processDocument(documentId)
}

export { chunkText, extractTextFromContent }
