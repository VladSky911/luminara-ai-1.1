import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings - Get all workspace settings
export async function GET() {
  try {
    const settings = await db.workspaceSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value
    }
    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('[API] Error getting settings:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

// PUT /api/settings - Update workspace settings
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    
    for (const [key, value] of Object.entries(body)) {
      await db.workspaceSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    }

    const settings = await db.workspaceSetting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value
    }
    
    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('[API] Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
