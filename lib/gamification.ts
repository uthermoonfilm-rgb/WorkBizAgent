import { getDb } from './db'

export interface GamificationState {
  xp: number
  level: number
  win_streak: number
  total_wins: number
  total_opportunities: number
  xp_to_next_level: number
  xp_progress_pct: number
  rank: string
}

export interface Achievement {
  id: number
  key: string
  title: string
  description: string
  icon: string
  xp_reward: number
  unlocked_at: string | null
}

const XP_PER_LEVEL = 500
const XP_SCALING = 1.15

const RANKS = [
  { min: 0, name: 'Rookie' },
  { min: 5, name: 'Contender' },
  { min: 10, name: 'Strategist' },
  { min: 15, name: 'Operator' },
  { min: 20, name: 'Dominator' },
  { min: 30, name: 'Legend' },
  { min: 40, name: 'APEX Elite' },
  { min: 50, name: 'Immortal' },
]

function xpForLevel(level: number): number {
  return Math.floor(XP_PER_LEVEL * Math.pow(XP_SCALING, level - 1))
}

function totalXpForLevel(level: number): number {
  let total = 0
  for (let i = 1; i < level; i++) total += xpForLevel(i)
  return total
}

function levelFromXp(xp: number): number {
  let level = 1
  while (totalXpForLevel(level + 1) <= xp) level++
  return level
}

function rankFromLevel(level: number): string {
  let rank = RANKS[0].name
  for (const r of RANKS) {
    if (level >= r.min) rank = r.name
  }
  return rank
}

export function getState(): GamificationState {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM gamification').all() as Array<{ key: string; value: string }>
  const state: Record<string, string> = {}
  for (const row of rows) state[row.key] = row.value

  const xp = parseInt(state.xp ?? '0')
  const level = levelFromXp(xp)
  const currentLevelXp = totalXpForLevel(level)
  const nextLevelXp = totalXpForLevel(level + 1)
  const xpIntoLevel = xp - currentLevelXp
  const xpNeeded = nextLevelXp - currentLevelXp

  return {
    xp,
    level,
    win_streak: parseInt(state.win_streak ?? '0'),
    total_wins: parseInt(state.total_wins ?? '0'),
    total_opportunities: parseInt(state.total_opportunities ?? '0'),
    xp_to_next_level: xpNeeded - xpIntoLevel,
    xp_progress_pct: Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100)),
    rank: rankFromLevel(level),
  }
}

export function awardXp(amount: number, reason?: string): { new_xp: number; leveled_up: boolean; new_level: number; unlocked_achievements: Achievement[] } {
  const db = getDb()
  const before = getState()

  db.prepare(`
    UPDATE gamification SET value = CAST(CAST(value AS INTEGER) + ? AS TEXT), updated_at = datetime('now')
    WHERE key = 'xp'
  `).run(amount)

  const after = getState()
  const leveled_up = after.level > before.level

  const unlocked = checkAndUnlockAchievements(after)

  return {
    new_xp: after.xp,
    leveled_up,
    new_level: after.level,
    unlocked_achievements: unlocked,
  }
}

export function getAchievements(): Achievement[] {
  const db = getDb()
  return db.prepare('SELECT * FROM achievements ORDER BY unlocked_at IS NULL, unlocked_at DESC').all() as Achievement[]
}

function checkAndUnlockAchievements(state: GamificationState): Achievement[] {
  const db = getDb()
  const unlocked: Achievement[] = []

  const conditions: Array<{ key: string; condition: boolean }> = [
    { key: 'level_5', condition: state.level >= 5 },
    { key: 'level_10', condition: state.level >= 10 },
    { key: 'win_streak_3', condition: state.win_streak >= 3 },
    { key: 'win_streak_5', condition: state.win_streak >= 5 },
    { key: 'ten_opportunities', condition: state.total_opportunities >= 10 },
    { key: 'fifty_wins', condition: state.total_wins >= 50 },
  ]

  for (const { key, condition } of conditions) {
    if (!condition) continue
    const ach = db.prepare('SELECT * FROM achievements WHERE key = ? AND unlocked_at IS NULL').get(key) as Achievement | undefined
    if (!ach) continue

    db.prepare(`
      UPDATE achievements SET unlocked_at = datetime('now') WHERE key = ?
    `).run(key)

    if (ach.xp_reward > 0) {
      db.prepare(`
        UPDATE gamification SET value = CAST(CAST(value AS INTEGER) + ? AS TEXT), updated_at = datetime('now')
        WHERE key = 'xp'
      `).run(ach.xp_reward)
    }

    unlocked.push({ ...ach, unlocked_at: new Date().toISOString() })
  }

  return unlocked
}

export function unlockAchievement(key: string): Achievement | null {
  const db = getDb()
  const ach = db.prepare('SELECT * FROM achievements WHERE key = ? AND unlocked_at IS NULL').get(key) as Achievement | undefined
  if (!ach) return null

  db.prepare('UPDATE achievements SET unlocked_at = datetime(\'now\') WHERE key = ?').run(key)

  if (ach.xp_reward > 0) {
    db.prepare(`
      UPDATE gamification SET value = CAST(CAST(value AS INTEGER) + ? AS TEXT), updated_at = datetime('now')
      WHERE key = 'xp'
    `).run(ach.xp_reward)
  }

  return { ...ach, unlocked_at: new Date().toISOString() }
}
