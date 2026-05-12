import { NextRequest, NextResponse } from 'next/server'
import { getDueBriefing, getRecentBriefings, markBriefingDelivered, scheduleBriefings } from '@/lib/briefings'

export const runtime = 'nodejs'

export async function GET() {
  scheduleBriefings()
  const due = getDueBriefing()
  const recent = getRecentBriefings(5)

  return NextResponse.json({
    due_briefing: due,
    recent_briefings: recent,
  })
}

export async function POST(req: NextRequest) {
  const { briefing_id } = await req.json()
  if (briefing_id) {
    markBriefingDelivered(briefing_id)
  }
  return NextResponse.json({ success: true })
}
