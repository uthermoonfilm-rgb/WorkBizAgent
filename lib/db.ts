import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), '.apex-data')
const DB_PATH = path.join(DB_DIR, 'apex.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  initSchema(_db)
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      importance INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      niche TEXT DEFAULT 'video',
      estimated_value TEXT,
      status TEXT DEFAULT 'discovered',
      outcome TEXT,
      xp_awarded INTEGER DEFAULT 0,
      source TEXT DEFAULT 'agent',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      session_id TEXT DEFAULT 'default',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gamification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      xp_reward INTEGER DEFAULT 0,
      unlocked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      result TEXT,
      opportunities_found INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `)

  // Seed default gamification state
  const existing = db.prepare('SELECT value FROM gamification WHERE key = ?').get('xp')
  if (!existing) {
    const seedGamification = db.prepare(`
      INSERT OR IGNORE INTO gamification (key, value) VALUES (?, ?)
    `)
    const seedMany = db.transaction(() => {
      seedGamification.run('xp', '0')
      seedGamification.run('level', '1')
      seedGamification.run('win_streak', '0')
      seedGamification.run('total_wins', '0')
      seedGamification.run('total_opportunities', '0')
      seedGamification.run('persona_name', 'APEX')
      seedGamification.run('niche', 'video content')
    })
    seedMany()
  }

  // Seed achievements
  const achievementCount = (db.prepare('SELECT COUNT(*) as c FROM achievements').get() as { c: number }).c
  if (achievementCount === 0) {
    const seedAchievement = db.prepare(`
      INSERT INTO achievements (key, title, description, icon, xp_reward) VALUES (?, ?, ?, ?, ?)
    `)
    const seedAchievements = db.transaction(() => {
      seedAchievement.run('first_blood', 'First Blood', 'Had your first conversation with APEX', '⚡', 50)
      seedAchievement.run('opportunity_hunter', 'Opportunity Hunter', 'Discovered your first revenue opportunity', '🎯', 100)
      seedAchievement.run('win_streak_3', 'Hot Streak', 'Won 3 opportunities in a row', '🔥', 150)
      seedAchievement.run('win_streak_5', 'On Fire', 'Won 5 opportunities in a row', '🌟', 300)
      seedAchievement.run('level_5', 'Rising Star', 'Reached Level 5', '📈', 200)
      seedAchievement.run('level_10', 'Channel Authority', 'Reached Level 10', '👑', 500)
      seedAchievement.run('ten_opportunities', 'Scout', 'Discovered 10 opportunities', '🔭', 250)
      seedAchievement.run('fifty_wins', 'Dominator', 'Secured 50 wins', '🏆', 1000)
      seedAchievement.run('memory_keeper', 'Memory Keeper', 'Saved 10 memories', '🧠', 100)
    })
    seedAchievements()
  }
}
