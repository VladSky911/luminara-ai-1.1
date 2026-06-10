// Luminara AI - Type definitions

export type PageView = 'dashboard' | 'documents' | 'search' | 'chat' | 'settings' | 'analytics'
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed'
export type ChatMode = 'strict' | 'balanced' | 'creative'
export type SearchMode = 'semantic' | 'keyword' | 'hybrid'

export interface Document {
  id: string
  name: string
  type: string
  status: DocumentStatus
  fileSize: number
  chunkCount: number
  content?: string | null
  tags?: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  _count?: { chunks: number }
}

export interface DocumentStats {
  total: number
  indexed: number
  processing: number
  pending: number
  failed: number
}

export interface ChunkResult {
  id: string
  documentId: string
  content: string
  chunkIndex: number
  score: number
  sourceName: string
  sourceType: string
  documentName?: string
  documentType?: string
  metadata: Record<string, unknown>
}

export interface RAGResponse {
  answer: string
  sources: SourceCitation[]
  retrievalTrace: RetrievalTrace
  warnings: string[]
}

export interface SourceCitation {
  chunkId: string
  documentId: string
  documentName: string
  documentType: string
  content: string
  score: number
  chunkIndex: number
}

export interface RetrievalTrace {
  query: string
  mode: string
  totalCandidates: number
  selectedChunks: number
  searchMode: string
  processingTime: number
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  citations: string | null
  sources: string | null
  mode: string | null
  createdAt: string
}

export interface ChatSession {
  id: string
  title: string
  mode: ChatMode
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
}

export interface WorkspaceSettings {
  chat_mode: string
  chunk_size: string
  chunk_overlap: string
  search_mode: string
  top_k: string
  min_score: string
  workspace_name: string
  [key: string]: string
}

export interface AnalyticsData {
  documentAnalytics: {
    totalDocuments: number
    documentsByType: Record<string, number>
    documentsByStatus: Record<string, number>
    averageChunksPerDocument: number
    totalKnowledgeSize: number
  }
  chatAnalytics: {
    totalSessions: number
    totalMessages: number
    messagesByRole: Record<string, number>
    averageMessagesPerSession: number
    mostCommonChatMode: string
  }
  activityTimeline: Array<{
    date: string
    documents: number
    sessions: number
    messages: number
  }>
  topDocuments: Array<{
    id: string
    name: string
    type: string
    chunkCount: number
    createdAt: string
  }>
  systemHealth: {
    vectorStoreStatus: string
    vectorStoreChunks: number
    vectorStoreIndexedDocuments: number
    dbDocumentCount: number
    dbChunkCount: number
    lastDocumentUploadTime: string | null
  }
}
