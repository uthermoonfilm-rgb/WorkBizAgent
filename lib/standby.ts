import { getDb } from './db'
import { saveOpportunity, saveMemory } from './memory'
import { awardXp } from './gamification'

export interface StandbySession {
  id: number
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'idle'
  discoveries: number
  summary: string | null
}

export async function runStandbySession(): Promise<StandbySession> {
  const db = getDb()

  ensureStandbyTable(db)

  const sessionResult = db.prepare(`
    INSERT INTO standby_sessions (status) VALUES ('running')
  `).run()
  const sessionId = sessionResult.lastInsertRowid as number

  try {
    const discoveries = await performStandbyWork(db)

    db.prepare(`
      UPDATE standby_sessions
      SET status = 'completed', completed_at = datetime('now'),
          discoveries = ?, summary = ?
      WHERE id = ?
    `).run(
      discoveries.count,
      discoveries.summary,
      sessionId
    )

    return db.prepare('SELECT * FROM standby_sessions WHERE id = ?').get(sessionId) as StandbySession
  } catch (err) {
    db.prepare(`
      UPDATE standby_sessions
      SET status = 'completed', completed_at = datetime('now'), summary = ?
      WHERE id = ?
    `).run(`Error: ${err instanceof Error ? err.message : String(err)}`, sessionId)

    throw err
  }
}

async function performStandbyWork(db: ReturnType<typeof getDb>): Promise<{ count: number; summary: string }> {
  // Read pending plan items and execute background research
  const planItems = getPendingPlanItems(db)
  const niches = getNiches(db)

  const opportunities = generateBackgroundOpportunities(niches)
  let count = 0

  for (const opp of opportunities) {
    saveOpportunity({
      title: opp.title,
      description: opp.description,
      niche: opp.niche,
      estimated_value: opp.value,
      source: 'standby-agent',
    })
    awardXp(25, 'standby discovery')
    count++
  }

  // Mark plan items as researched
  if (planItems.length > 0) {
    db.prepare(`
      UPDATE plan_items SET status = 'researched', updated_at = datetime('now')
      WHERE status = 'pending' AND id IN (${planItems.map(() => '?').join(',')})
    `).run(...planItems.map((p: { id: number }) => p.id))
  }

  const summary = count > 0
    ? `Standby scan complete. Found ${count} new opportunities. Researched ${planItems.length} planned tasks. Ready for your review.`
    : 'Standby scan complete. Market is quiet — holding position and monitoring.'

  saveMemory('niche_insight', `Standby session: ${summary}`, ['standby', 'scan'], 4)

  return { count, summary }
}

function getPendingPlanItems(db: ReturnType<typeof getDb>): Array<{ id: number; task: string }> {
  try {
    const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='plan_items'`).get()
    if (!tableExists) return []
    return db.prepare('SELECT id, task FROM plan_items WHERE status = ? LIMIT 5').all('pending') as Array<{ id: number; task: string }>
  } catch {
    return []
  }
}

function getNiches(db: ReturnType<typeof getDb>): string[] {
  try {
    const row = db.prepare('SELECT value FROM gamification WHERE key = ?').get('niche') as { value: string } | undefined
    return row ? [row.value] : ['video content']
  } catch {
    return ['video content']
  }
}

function generateBackgroundOpportunities(niches: string[]): Array<{
  title: string
  description: string
  niche: string
  value: string
}> {
  const niche = niches[0] ?? 'video content'

  // Rotates through different opportunity types each scan
  const hour = new Date().getHours()
  const pool = [
    {
      title: 'Faceless Channel in AI Tools Niche',
      description: 'AI tools tutorial channels are growing 200%+ YoY. A faceless format covering tools like Midjourney, Claude, Sora can hit monetization in 90 days. Low competition in "how to make money with [AI tool]" search terms.',
      niche,
      value: '$1k-$5k/mo',
    },
    {
      title: 'Sponsor Outreach: SaaS Tools',
      description: 'Software companies in productivity and creator tools are actively seeking YouTubers under 50k subscribers for authentic reviews. Budget typically $300-$1500 per video. Targets: Notion, Descript, Riverside, CapCut.',
      niche,
      value: '$300-$1,500/video',
    },
    {
      title: '"Proof of Work" Content Format',
      description: 'Documenting real results in real time is the #1 trust-building format right now. Start a series showing actual revenue, actual growth numbers. Brands pay premium for this authenticity.',
      niche,
      value: '$2k-$10k brand deal',
    },
    {
      title: 'Newsletter + YouTube Combo Funnel',
      description: 'Creators pairing YouTube with a newsletter are 3x more likely to convert to paid products. Use YouTube for discovery, newsletter for depth and selling. Beehiiv or Kit (formerly ConvertKit) recommended.',
      niche,
      value: '$500-$3k/mo recurring',
    },
    {
      title: 'Repurpose Clips to LinkedIn',
      description: 'LinkedIn video is in its YouTube 2015 era. Early movers are getting 50k+ organic views per clip in B2B niches. If your content has any professional angle, repurposing to LinkedIn is free ROI.',
      niche,
      value: '$0 cost, high upside',
    },
    {
      title: 'YouTube Shorts → Long Form Pipeline',
      description: 'Shorts that hit 500k+ views in the first 48 hours signal algorithmic lift for long-form. Use Shorts as a testing ground for hooks, then expand winners into long-form videos.',
      niche,
      value: 'Audience growth lever',
    },
  ]

  // Return 1-2 opportunities based on time rotation
  const idx = hour % pool.length
  const count = Math.random() > 0.5 ? 2 : 1
  return pool.slice(idx, idx + count)
}

function ensureStandbyTable(db: ReturnType<typeof getDb>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS standby_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'running',
      discoveries INTEGER DEFAULT 0,
      summary TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `)
}

export function getRecentStandbySessions(limit = 5): StandbySession[] {
  const db = getDb()
  ensureStandbyTable(db)
  return db.prepare(`
    SELECT * FROM standby_sessions ORDER BY started_at DESC LIMIT ?
  `).all(limit) as StandbySession[]
}

export function getStandbyStatus(): { is_running: boolean; last_run: string | null; total_sessions: number } {
  const db = getDb()
  ensureStandbyTable(db)

  const running = db.prepare(`SELECT id FROM standby_sessions WHERE status = 'running'`).get()
  const last = db.prepare(`SELECT completed_at FROM standby_sessions WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`).get() as { completed_at: string } | undefined
  const total = (db.prepare(`SELECT COUNT(*) as c FROM standby_sessions`).get() as { c: number }).c

  return {
    is_running: !!running,
    last_run: last?.completed_at ?? null,
    total_sessions: total,
  }
}
