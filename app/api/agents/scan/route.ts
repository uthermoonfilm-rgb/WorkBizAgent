import { NextResponse } from 'next/server'
import { runStandbySession, getRecentStandbySessions, getStandbyStatus } from '@/lib/standby'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST() {
  try {
    const session = await runStandbySession()
    return NextResponse.json({ success: true, session })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const status = getStandbyStatus()
  const recent = getRecentStandbySessions(5)
  return NextResponse.json({ status, recent_sessions: recent })
}
