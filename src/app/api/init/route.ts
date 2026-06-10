import { NextResponse } from 'next/server'
import { seedDemoData } from '@/lib/seed'
import { vectorStore } from '@/lib/vector-store'

// POST /api/init - Initialize the database with demo data
export async function POST() {
  try {
    await seedDemoData()
    await vectorStore.indexAll()
    
    const stats = vectorStore.getStats()
    return NextResponse.json({ 
      success: true, 
      message: 'Demo data initialized',
      vectorStoreStats: stats
    })
  } catch (error) {
    console.error('[API] Error initializing:', error)
    return NextResponse.json({ error: 'Failed to initialize demo data' }, { status: 500 })
  }
}
