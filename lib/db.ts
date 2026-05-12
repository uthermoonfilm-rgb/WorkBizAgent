import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// In production (Railway) use APEX_DATA_DIR env var pointing to the mounted volume
const DB_DIR = process.env.APEX_DATA_DIR ?? path.join(process.cwd(), '.apex-data')
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

    CREATE TABLE IF NOT EXISTS outreach_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      platform TEXT NOT NULL,
      recipient TEXT,
      recipient_handle TEXT,
      subject TEXT,
      body TEXT NOT NULL,
      project TEXT,
      status TEXT DEFAULT 'draft',
      sent_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Seed project memories on first run
  const memoryCount = (db.prepare('SELECT COUNT(*) as c FROM memories').get() as { c: number }).c
  if (memoryCount === 0) {
    const seedMem = db.prepare(`
      INSERT INTO memories (type, content, tags, importance) VALUES (?, ?, ?, ?)
    `)
    const seedProjectMemories = db.transaction(() => {
      seedMem.run('goal', 'PRIMARY PROJECT: The Voyagers — An album biopic series about Todd (dad) and his band in 1986 Boothbay Harbor, Maine. Each single is paired with a short film episode. Episode 2 is complete. Episodes 1, 3, 4, 5, and possibly 6 still need filming, extending into fall. HIGHEST PRIORITY.', JSON.stringify(['voyagers', 'project', 'film', 'music', 'priority']), 10)
      seedMem.run('niche_insight', 'The Voyagers emotional core: Accepting yourself, believing in your art, doing it without fail. A love letter to making music and giving a damn about it. Todd is the central character. All band members have integral arcs. Episodes match the album sequence. Arc must feel whole — clear journey, beginning to end.', JSON.stringify(['voyagers', 'tone', 'theme', 'narrative']), 10)
      seedMem.run('goal', 'SECONDARY PROJECT: Where We Fade — A techno album set in an original world where AI has taken over and banned natural human creativity and music. Timeline more fluid than Voyagers. Visuals: real iPhone footage blended with heavily stylized overlays — not pure 3D. Should feel like another world bleeding into this one.', JSON.stringify(['where-we-fade', 'project', 'techno', 'worldbuilding']), 9)
      seedMem.run('niche_insight', 'Where We Fade tone: Eclectic techno — not fixed to one end of the spectrum. Promo spans all platforms; hero formats TBD. Worldbuilding not fully documented; moodboards and PDFs exist. Themes: rebellion through art, human creativity as resistance, dystopia felt from the inside.', JSON.stringify(['where-we-fade', 'tone', 'theme']), 9)
      seedMem.run('strategy', '80/20 rule: 80% of time on creative work (Voyagers + Where We Fade). 20% on outreach — finding clients, collaborators, press, sponsors, labels. Goal is inbound — clients come to us. APEX drafts all outreach; operator just reviews, edits, and sends.', JSON.stringify(['strategy', 'outreach', '80/20', 'workflow']), 10)
      seedMem.run('preference', 'Outreach targets: brands/sponsors, artists/collaborators, labels/distributors/festivals, press/blogs/playlists/curators. Draft emails and DMs ready to send — operator reviews and presses send.', JSON.stringify(['outreach', 'targets', 'email', 'dm']), 9)
    })
    seedProjectMemories()
  }

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
