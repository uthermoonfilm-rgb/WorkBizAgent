import { NextResponse } from 'next/server'
import { getState, getAchievements } from '@/lib/gamification'
import { getOpportunities } from '@/lib/memory'

export const runtime = 'nodejs'

export async function GET() {
  const state = getState()
  const achievements = getAchievements()
  const recentOpps = getOpportunities(undefined, 5)

  return NextResponse.json({
    ...state,
    achievements,
    recent_opportunities: recentOpps,
  })
}
