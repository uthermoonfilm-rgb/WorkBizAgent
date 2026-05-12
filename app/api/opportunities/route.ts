import { NextRequest, NextResponse } from 'next/server'
import { getOpportunities, updateOpportunityStatus } from '@/lib/memory'
import { awardXp } from '@/lib/gamification'
import { saveMemory } from '@/lib/memory'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const opps = getOpportunities(status, limit)
  return NextResponse.json({ opportunities: opps })
}

export async function PATCH(req: NextRequest) {
  const { id, status, outcome } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  updateOpportunityStatus(id, status, outcome)

  const xp = status === 'won' ? 200 : status === 'lost' ? 25 : 10
  const xpResult = awardXp(xp, `opportunity ${status}`)

  if (status === 'won') {
    saveMemory('win', `Won opportunity #${id}${outcome ? ': ' + outcome : ''}`, ['win'], 8)
  } else if (status === 'lost') {
    saveMemory('lesson', `Lost opportunity #${id}${outcome ? ': ' + outcome : ''}. Analyze and adapt.`, ['loss', 'lesson'], 7)
  }

  return NextResponse.json({ success: true, xp_gained: xp, level_up: xpResult.leveled_up })
}
