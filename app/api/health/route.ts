import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'


export async function GET() {
  try {
    
    await db
      .select()
      .from(users)
      .limit(1)

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[health] Error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
        },
      },
      { status: 503 }
    )
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
