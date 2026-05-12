import { getDb } from './db'

export interface Memory {
  id: number
  type: string
  content: string
  tags: string[]
  importance: number
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: number
  title: string
  description: string
  niche: string
  estimated_value: string
  status: 'discovered' | 'pursuing' | 'won' | 'lost' | 'passed'
  outcome: string | null
  xp_awarded: number
  source: string
  created_at: string
  updated_at: string
}

export function saveMemory(type: string, content: string, tags: string[] = [], importance = 5): Memory {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO memories (type, content, tags, importance)
    VALUES (?, ?, ?, ?)
  `).run(type, content, JSON.stringify(tags), importance)

  return db.prepare('SELECT * FROM memories WHERE id = ?').get(result.lastInsertRowid) as Memory
}

export function getMemories(type?: string, limit = 20): Memory[] {
  const db = getDb()
  const rows = type
    ? db.prepare('SELECT * FROM memories WHERE type = ? ORDER BY importance DESC, updated_at DESC LIMIT ?').all(type, limit)
    : db.prepare('SELECT * FROM memories ORDER BY importance DESC, updated_at DESC LIMIT ?').all(limit)

  return rows.map(parseMemory)
}

export function searchMemories(query: string, limit = 10): Memory[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM memories
    WHERE content LIKE ? OR tags LIKE ?
    ORDER BY importance DESC, updated_at DESC
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, limit)

  return rows.map(parseMemory)
}

export function updateMemory(id: number, updates: Partial<Pick<Memory, 'content' | 'importance' | 'tags'>>): void {
  const db = getDb()
  const sets: string[] = ['updated_at = datetime(\'now\')']
  const vals: unknown[] = []

  if (updates.content !== undefined) { sets.push('content = ?'); vals.push(updates.content) }
  if (updates.importance !== undefined) { sets.push('importance = ?'); vals.push(updates.importance) }
  if (updates.tags !== undefined) { sets.push('tags = ?'); vals.push(JSON.stringify(updates.tags)) }

  vals.push(id)
  db.prepare(`UPDATE memories SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
}

export function deleteMemory(id: number): void {
  getDb().prepare('DELETE FROM memories WHERE id = ?').run(id)
}

export function saveOpportunity(data: {
  title: string
  description: string
  niche?: string
  estimated_value?: string
  source?: string
}): Opportunity {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO opportunities (title, description, niche, estimated_value, source)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    data.title,
    data.description,
    data.niche ?? 'video',
    data.estimated_value ?? 'TBD',
    data.source ?? 'agent'
  )

  db.prepare(`
    UPDATE gamification SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = datetime('now')
    WHERE key = 'total_opportunities'
  `).run()

  return db.prepare('SELECT * FROM opportunities WHERE id = ?').get(result.lastInsertRowid) as Opportunity
}

export function updateOpportunityStatus(
  id: number,
  status: Opportunity['status'],
  outcome?: string
): void {
  const db = getDb()
  db.prepare(`
    UPDATE opportunities
    SET status = ?, outcome = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, outcome ?? null, id)

  if (status === 'won') {
    db.prepare(`
      UPDATE gamification SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = datetime('now')
      WHERE key IN ('total_wins', 'win_streak')
    `).run()
  } else if (status === 'lost') {
    db.prepare(`
      UPDATE gamification SET value = '0', updated_at = datetime('now')
      WHERE key = 'win_streak'
    `).run()
  }
}

export function getOpportunities(status?: string, limit = 20): Opportunity[] {
  const db = getDb()
  const rows = status
    ? db.prepare('SELECT * FROM opportunities WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit)
    : db.prepare('SELECT * FROM opportunities ORDER BY created_at DESC LIMIT ?').all(limit)
  return rows as Opportunity[]
}

export function getMessages(sessionId = 'default', limit = 50): Array<{ role: string; content: string }> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT role, content FROM messages
    WHERE session_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `).all(sessionId, limit)
  return rows as Array<{ role: string; content: string }>
}

export function saveMessage(role: string, content: string, sessionId = 'default'): void {
  getDb().prepare(`
    INSERT INTO messages (role, content, session_id) VALUES (?, ?, ?)
  `).run(role, content, sessionId)
}

function parseMemory(row: unknown): Memory {
  const r = row as Memory & { tags: string }
  return { ...r, tags: JSON.parse(r.tags || '[]') }
}
