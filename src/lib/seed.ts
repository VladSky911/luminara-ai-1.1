// Seed data for demo purposes
import { db } from './db'
import { processDocument } from './document-processor'

const DEMO_DOCUMENTS = [
  {
    name: 'Product Requirements - Q1 2025',
    type: 'md',
    content: `# Product Requirements Document - Q1 2025

## Overview
This document outlines the product requirements for the Q1 2025 release cycle. Our focus is on improving user engagement and expanding the platform's AI capabilities.

## Key Features

### 1. Enhanced Search Experience
- Implement semantic search across all content types
- Add auto-suggestions based on user behavior
- Support natural language queries
- Display relevance scores for search results
- Enable filtering by content type, date range, and author

### 2. AI-Powered Document Analysis
- Automatic document summarization
- Key insight extraction from long-form content
- Trend detection across document collections
- Anomaly detection in data-heavy documents

### 3. Collaboration Improvements
- Real-time document co-editing
- Inline comments and annotations
- Version history with diff view
- Role-based access control per document section

## Technical Requirements

### Performance
- Search queries must return results within 200ms
- Document upload and processing under 30 seconds for files up to 50MB
- Real-time collaboration with less than 100ms latency
- System must handle 10,000 concurrent users

### Security
- End-to-end encryption for sensitive documents
- SOC 2 Type II compliance
- GDPR data handling procedures
- Regular penetration testing schedule

### Scalability
- Horizontal scaling for document processing workers
- CDN distribution for static assets
- Database sharding strategy for user data
- Caching layer for frequently accessed documents

## Success Metrics
- Search satisfaction score > 85%
- Document processing time < 15 seconds (p95)
- User retention improvement of 20%
- Reduced support tickets by 30%

## Timeline
- Phase 1 (Jan): Search infrastructure and indexing
- Phase 2 (Feb): AI analysis features
- Phase 3 (Mar): Collaboration features and polish`
  },
  {
    name: 'API Documentation v3.2',
    type: 'md',
    content: `# API Documentation v3.2

## Authentication
All API requests require authentication via Bearer token. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

### Obtaining a Token
Send a POST request to /api/auth/token with your client credentials:
- client_id: Your application's client ID
- client_secret: Your application's client secret
- grant_type: "client_credentials"

Tokens expire after 3600 seconds. Use the refresh endpoint to obtain a new token.

## Core Endpoints

### Documents

#### POST /api/documents
Upload a new document for processing.

Request body (multipart/form-data):
- file: The document file (PDF, DOCX, TXT, MD)
- metadata: Optional JSON metadata string
- collection_id: Optional collection to add the document to

Response:
\`\`\`json
{
  "id": "doc_abc123",
  "status": "processing",
  "filename": "report.pdf",
  "created_at": "2025-01-15T10:30:00Z"
}
\`\`\`

#### GET /api/documents/:id
Retrieve document details and processing status.

#### DELETE /api/documents/:id
Remove a document and all its associated chunks from the index.

### Search

#### POST /api/search
Perform semantic search across indexed documents.

Request body:
\`\`\`json
{
  "query": "How does the authentication system work?",
  "mode": "hybrid",
  "top_k": 5,
  "filters": {
    "document_ids": ["doc_abc123"],
    "date_range": {"start": "2025-01-01", "end": "2025-03-31"}
  }
}
\`\`\`

Response includes ranked results with relevance scores and source citations.

### Chat

#### POST /api/chat
Send a message to the AI assistant and receive a grounded response.

Request body:
\`\`\`json
{
  "message": "What are our Q1 priorities?",
  "session_id": "sess_xyz789",
  "mode": "balanced",
  "document_filter": []
}
\`\`\`

## Rate Limits
- Free tier: 100 requests/hour
- Pro tier: 1,000 requests/hour
- Enterprise: Custom limits

## Error Codes
- 400: Bad Request - Invalid parameters
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource does not exist
- 429: Too Many Requests - Rate limit exceeded
- 500: Internal Server Error`
  },
  {
    name: 'Team Onboarding Guide',
    type: 'md',
    content: `# Team Onboarding Guide

Welcome to the team! This guide will help you get set up and productive as quickly as possible.

## First Day Setup

### Accounts and Access
1. Check your email for login credentials to the following systems:
   - Company email (Gmail)
   - Slack workspace
   - GitHub organization
   - Project management tool (Linear)
   - Design system (Figma)
   - Documentation wiki (Notion)

2. Set up two-factor authentication on all accounts
3. Add your profile picture and update your bio
4. Join relevant Slack channels: #general, #engineering, #product, #random

### Development Environment
1. Install the following tools:
   - VS Code with recommended extensions
   - Docker Desktop
   - Node.js 20+ and bun
   - Git with SSH keys configured
   - PostgreSQL client

2. Clone the main repository:
   \`\`\`
   git clone git@github.com:company/main-app.git
   \`\`\`

3. Set up environment variables by copying .env.example to .env
4. Run the development server: bun run dev
5. Verify you can access the app at localhost:3000

## Team Structure

### Engineering
- Backend Team: API development, database design, infrastructure
- Frontend Team: UI components, user experience, performance
- Platform Team: CI/CD, monitoring, developer tools
- AI/ML Team: Model development, RAG pipeline, embeddings

### Product
- Product Managers: Feature prioritization and roadmap
- Designers: UI/UX design, user research
- Data Analysts: Metrics, experiments, insights

## Communication Norms

### Slack
- Keep conversations in public channels when possible
- Use threads for detailed discussions
- Set your working hours and status
- Respond to direct messages within 4 hours during work hours

### Meetings
- Daily standup: 9:30 AM, 15 minutes max
- Sprint planning: Every other Monday, 1 hour
- Retrospective: Every other Friday, 45 minutes
- 1:1 with manager: Weekly, 30 minutes

### Documentation
- Document decisions in the wiki
- Write ADRs (Architecture Decision Records) for significant changes
- Keep README files up to date
- Use PR descriptions to explain changes

## Working with AI Tools

Our team uses AI-powered tools to boost productivity:

### Code Assistant
- Use the AI code assistant for boilerplate, tests, and documentation
- Always review AI-generated code before committing
- Never paste sensitive data into AI tools

### Knowledge Base (Luminara AI)
- Search the knowledge base before asking questions in Slack
- Upload relevant documents to the shared workspace
- Use citations when referencing information from the knowledge base
- Report outdated or incorrect information

## Security Best Practices

- Never commit secrets, API keys, or passwords to git
- Use environment variables for all configuration
- Report security vulnerabilities to security@company.com
- Complete annual security training
- Use a password manager for all work accounts
- Lock your screen when stepping away from your desk`
  },
  {
    name: 'Architecture Decision Records',
    type: 'md',
    content: `# Architecture Decision Records

## ADR-001: Microservices over Monolith

### Status: Accepted

### Context
Our application has grown to serve over 50,000 users. The monolithic architecture is becoming difficult to scale and deploy independently. Teams are blocked waiting for deployments from other teams.

### Decision
We will transition to a microservices architecture with the following service boundaries:
- Authentication Service: User management, sessions, tokens
- Document Service: Upload, storage, processing
- Search Service: Indexing, vector search, ranking
- Chat Service: AI interactions, session management
- Notification Service: Email, push, in-app notifications

### Consequences
**Positive:**
- Independent deployment and scaling
- Team ownership of services
- Technology flexibility per service
- Fault isolation

**Negative:**
- Increased operational complexity
- Network latency between services
- Data consistency challenges
- More complex monitoring and debugging

### Implementation
- Start with Document Service and Search Service
- Use event-driven communication via message queue
- API Gateway for external access
- Shared authentication via JWT tokens
- Gradual migration from monolith

## ADR-002: Qdrant for Vector Storage

### Status: Accepted

### Context
We need a vector database for storing document embeddings and performing similarity search. Options considered: Qdrant, Chroma, pgvector, Pinecone, Weaviate.

### Decision
We chose Qdrant for the following reasons:
- Open source with excellent performance benchmarks
- Rich filtering capabilities
- Supports hybrid search (vector + keyword)
- Strong Rust-based core for reliability
- Active community and good documentation
- Can be self-hosted (important for data sovereignty)

### Consequences
**Positive:**
- Fast and memory-efficient vector search
- Flexible payload filtering
- Horizontal scaling with sharding
- No vendor lock-in

**Negative:**
- Additional infrastructure to manage
- Learning curve for the team
- Need monitoring and backup strategy

## ADR-003: RAG Architecture with Transparency

### Status: Accepted

### Context
Users need to trust AI-generated answers. Black-box responses lead to skepticism and reduced adoption. We need a way to show users how answers are derived.

### Decision
Implement RAG with full transparency:
- Show source documents and chunks for every answer
- Display confidence/relevance scores for each source
- Provide retrieval trace showing the search process
- Allow users to filter by document and verify sources
- Warn when answer confidence is low
- Clear indication when knowledge base lacks information

### Consequences
**Positive:**
- Increased user trust and adoption
- Easier debugging of incorrect answers
- Users can verify information independently
- Competitive differentiator

**Negative:**
- More complex UI implementation
- Additional API response data
- May expose internal document structure

## ADR-004: Chunk Size Strategy

### Status: Accepted

### Context
Choosing the right chunk size affects both retrieval quality and answer generation. Too small = lost context. Too large = diluted relevance.

### Decision
Use 500-character chunks with 100-character overlap:
- Preserves paragraph-level context
- Overlap ensures no information is lost at boundaries
- Works well with our embedding model (text-embedding-3-small)
- Allows for ~100-150 tokens per chunk (suitable for context window management)

### Consequences
- Good balance between precision and context
- May need adjustment based on document types
- Metadata helps reassemble context when needed`
  },
  {
    name: 'Security Policy 2025',
    type: 'txt',
    content: `SECURITY POLICY 2025

1. DATA CLASSIFICATION

All company data must be classified into one of four tiers:

Tier 1 - Public: Marketing materials, public documentation, press releases
Tier 2 - Internal: Team processes, meeting notes, project timelines
Tier 3 - Confidential: Product roadmaps, financial data, customer information
Tier 4 - Restricted: Encryption keys, authentication secrets, PII

Each tier has specific handling requirements:

Tier 1: No restrictions on storage or sharing
Tier 2: Must stay within company systems, no external sharing without approval
Tier 3: Encrypted at rest and in transit, access logging required, need-to-know basis
Tier 4: Hardware security modules, multi-person access, audit trails, DLP monitoring

2. ACCESS CONTROL

All systems must implement role-based access control (RBAC):
- Admin: Full system access, user management, configuration
- Editor: Create and modify content, manage collections
- Viewer: Read-only access to permitted resources
- API User: Programmatic access with scoped permissions

Password requirements:
- Minimum 12 characters
- Must include uppercase, lowercase, number, and symbol
- Changed every 90 days
- No password reuse for last 12 passwords
- Multi-factor authentication required for all accounts

3. INCIDENT RESPONSE

Severity levels:
- P0 (Critical): Active data breach, complete service outage
- P1 (High): Partial service degradation, potential data exposure
- P2 (Medium): Non-critical feature failure, performance degradation
- P3 (Low): Cosmetic issues, minor bugs

Response times:
- P0: Immediate response, all-hands
- P1: Within 30 minutes, on-call engineer
- P2: Within 4 hours, next available engineer
- P3: Within 24 hours, scheduled fix

4. COMPLIANCE

We maintain compliance with:
- SOC 2 Type II: Annual audit, continuous monitoring
- GDPR: Data protection, right to erasure, DPO appointed
- CCPA: Consumer privacy rights, data disclosure
- HIPAA: For healthcare-adjacent features (if applicable)

5. VULNERABILITY MANAGEMENT

- Weekly automated vulnerability scans
- Monthly penetration testing by external firm
- Bug bounty program for responsible disclosure
- 48-hour SLA for critical vulnerability patching
- Dependency update policy: security patches within 24 hours

6. ENCRYPTION STANDARDS

Data at rest: AES-256
Data in transit: TLS 1.3
Key management: AWS KMS with automatic rotation
Database: Column-level encryption for PII
Backups: Encrypted with separate key hierarchy`
  }
]

export async function seedDemoData() {
  // Check if already seeded
  const existingCount = await db.document.count()
  if (existingCount > 0) {
    console.log('[Seed] Demo data already exists, skipping')
    return
  }

  console.log('[Seed] Seeding demo documents...')

  for (const doc of DEMO_DOCUMENTS) {
    const document = await db.document.create({
      data: {
        name: doc.name,
        type: doc.type,
        content: doc.content,
        fileSize: new TextEncoder().encode(doc.content).length,
        status: 'pending'
      }
    })

    const result = await processDocument(document.id)
    console.log(`[Seed] Processed "${doc.name}": ${result.status} (${result.chunkCount} chunks)`)
  }

  // Create a demo chat session
  await db.chatSession.create({
    data: {
      title: 'Product Knowledge Q&A',
      mode: 'balanced'
    }
  })

  // Create default workspace settings
  const settings = [
    { key: 'chat_mode', value: 'balanced' },
    { key: 'chunk_size', value: '500' },
    { key: 'chunk_overlap', value: '100' },
    { key: 'search_mode', value: 'hybrid' },
    { key: 'top_k', value: '5' },
    { key: 'min_score', value: '0.02' },
    { key: 'workspace_name', value: 'Luminara AI Demo' },
  ]

  for (const setting of settings) {
    await db.workspaceSetting.create({ data: setting })
  }

  console.log('[Seed] Demo data seeded successfully')
}
