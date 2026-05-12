import { getDb } from './db'
import { getMemories, getOpportunities, saveMemory } from './memory'
import { getState } from './gamification'

export type BriefingType = 'morning' | 'evening'
export type BriefingStatus = 'pending' | 'delivered' | 'missed' | 'combined'

export interface Briefing {
  id: number
  type: BriefingType
  status: BriefingStatus
  content: string
  pending_items: string
  scheduled_for: string
  delivered_at: string | null
  created_at: string
}

export function ensureBriefingTable() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      content TEXT DEFAULT '',
      pending_items TEXT DEFAULT '[]',
      scheduled_for TEXT NOT NULL,
      delivered_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
}

export function getNextBriefing(): Briefing | null {
  ensureBriefingTable()
  const db = getDb()
  return db.prepare(`
    SELECT * FROM briefings WHERE status = 'pending' ORDER BY scheduled_for ASC LIMIT 1
  `).get() as Briefing | null
}

export function getPendingBriefings(): Briefing[] {
  ensureBriefingTable()
  const db = getDb()
  return db.prepare(`
    SELECT * FROM briefings WHERE status IN ('pending', 'missed') ORDER BY scheduled_for ASC
  `).all() as Briefing[]
}

export function getRecentBriefings(limit = 10): Briefing[] {
  ensureBriefingTable()
  const db = getDb()
  return db.prepare(`
    SELECT * FROM briefings ORDER BY created_at DESC LIMIT ?
  `).all(limit) as Briefing[]
}

export function markBriefingMissed(id: number): void {
  const db = getDb()
  db.prepare(`UPDATE briefings SET status = 'missed' WHERE id = ?`).run(id)
}

export function markBriefingDelivered(id: number): void {
  const db = getDb()
  db.prepare(`
    UPDATE briefings SET status = 'delivered', delivered_at = datetime('now') WHERE id = ?
  `).run(id)
}

export function generateBriefingContent(type: BriefingType, includeMissed = false): string {
  const memories = getMemories(undefined, 10)
  const opps = getOpportunities(undefined, 5)
  const state = getState()

  const now = new Date()
  const greeting = type === 'morning'
    ? `Good morning. Here's your ${includeMissed ? 'combined' : 'morning'} briefing.`
    : `Good evening. Here's your ${includeMissed ? 'combined' : 'evening'} briefing.`

  const recentMemories = memories.slice(0, 3).map(m => `• ${m.content}`).join('\n')
  const activeOpps = opps.filter(o => o.status === 'discovered' || o.status === 'pursuing')
  const oppSummary = activeOpps.length > 0
    ? activeOpps.slice(0, 3).map(o => `• ${o.title} (${o.estimated_value})`).join('\n')
    : 'No active opportunities in pipeline.'

  const content = `${greeting}

**Progress**: Level ${state.level} ${state.rank} · ${state.total_wins} wins · ${state.win_streak} win streak

**Active Pipeline** (${activeOpps.length} opportunities):
${oppSummary}

**Recent context**:
${recentMemories || 'No recent memories saved yet.'}

**Today's focus areas**:
${type === 'morning'
  ? '1. Review opportunities and pick one to pursue\n2. Check your content/workout plans\n3. What are the top 3 things you want to accomplish today?'
  : '1. What did you accomplish today?\n2. Any opportunities to update or close?\n3. What needs to carry over to tomorrow?'
}`

  return content
}

export function scheduleBriefings(): void {
  ensureBriefingTable()
  const db = getDb()

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Schedule morning (8:00 AM) and evening (8:00 PM)
  const morningTime = `${today}T08:00:00`
  const eveningTime = `${today}T20:00:00`

  const existingMorning = db.prepare(`
    SELECT id FROM briefings WHERE type = 'morning' AND scheduled_for LIKE ?
  `).get(`${today}%`)

  const existingEvening = db.prepare(`
    SELECT id FROM briefings WHERE type = 'evening' AND scheduled_for LIKE ?
  `).get(`${today}%`)

  if (!existingMorning) {
    db.prepare(`
      INSERT INTO briefings (type, scheduled_for) VALUES ('morning', ?)
    `).run(morningTime)
  }

  if (!existingEvening) {
    db.prepare(`
      INSERT INTO briefings (type, scheduled_for) VALUES ('evening', ?)
    `).run(eveningTime)
  }
}

export function getDueBriefing(): { briefing: Briefing; content: string; missed: Briefing[] } | null {
  ensureBriefingTable()
  scheduleBriefings()

  const db = getDb()
  const now = new Date().toISOString()

  // Find overdue pending briefings
  const overdue = db.prepare(`
    SELECT * FROM briefings
    WHERE status = 'pending' AND scheduled_for <= ?
    ORDER BY scheduled_for ASC
  `).all(now) as Briefing[]

  if (overdue.length === 0) return null

  const primary = overdue[0]
  const missed = overdue.slice(1)

  const content = generateBriefingContent(primary.type, missed.length > 0)

  // Mark missed ones
  for (const m of missed) {
    markBriefingMissed(m.id)
    saveMemory('lesson', `Missed ${m.type} briefing on ${m.scheduled_for}. Items carried forward.`, ['briefing', 'missed'], 3)
  }

  return { briefing: primary, content, missed }
}
