#!/bin/bash
set -e

echo ""
echo "████████████████████████████████████████"
echo "          APEX — Setup Script           "
echo "████████████████████████████████████████"
echo ""

# ── 1. Check dependencies ─────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found. Install it from https://nodejs.org (v18 or higher) then run this again."
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌  Git not found. Install it from https://git-scm.com then run this again."
  exit 1
fi

echo "✓  Node $(node -v) detected"
echo "✓  Git detected"
echo ""

# ── 2. Clone repo ─────────────────────────────────────────────────────────────
DEST="$HOME/apex-assistant"

if [ -d "$DEST" ]; then
  echo "📁  Found existing folder at $DEST — pulling latest..."
  cd "$DEST"
  git pull origin claude/virtual-assistant-app-yHvIu --quiet
else
  echo "📥  Cloning repo..."
  git clone --branch claude/virtual-assistant-app-yHvIu \
    https://github.com/uthermoonfilm-rgb/workbizagent "$DEST" --quiet
  cd "$DEST"
fi

echo "✓  Code ready at $DEST"
echo ""

# ── 3. API key ────────────────────────────────────────────────────────────────
if [ -f ".env" ] && grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
  echo "✓  API key already set"
else
  echo "🔑  You need an Anthropic API key."
  echo "    Get one free at: https://console.anthropic.com"
  echo ""
  read -rp "   Paste your API key here: " API_KEY
  if [ -z "$API_KEY" ]; then
    echo "❌  No key entered. Add it manually to .env later:"
    echo "    ANTHROPIC_API_KEY=your_key_here"
    echo "ANTHROPIC_API_KEY=placeholder" > .env
  else
    echo "ANTHROPIC_API_KEY=$API_KEY" > .env
    echo "✓  API key saved"
  fi
fi
echo ""

# ── 4. Install packages ───────────────────────────────────────────────────────
echo "📦  Installing packages (this takes ~1 min the first time)..."
npm install --silent
echo "✓  Packages installed"
echo ""

# ── 5. Seed Voyagers memories ─────────────────────────────────────────────────
echo "🎬  Seeding Voyagers & Where We Fade project memory..."
mkdir -p .apex-data

# Initialize DB tables first via a quick node script
node -e "
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join('.apex-data', 'apex.db'));
db.pragma('journal_mode = WAL');
db.exec(\`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    importance INTEGER DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
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
\`);
const existing = db.prepare('SELECT value FROM gamification WHERE key = ?').get('xp');
if (!existing) {
  const seed = db.prepare('INSERT OR IGNORE INTO gamification (key, value) VALUES (?, ?)');
  const tx = db.transaction(() => {
    seed.run('xp','0'); seed.run('level','1'); seed.run('win_streak','0');
    seed.run('total_wins','0'); seed.run('total_opportunities','0');
    seed.run('persona_name','APEX'); seed.run('niche','video content');
  });
  tx();
}
const achCount = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;
if (achCount === 0) {
  const sa = db.prepare('INSERT INTO achievements (key,title,description,icon,xp_reward) VALUES (?,?,?,?,?)');
  const tx = db.transaction(() => {
    sa.run('first_blood','First Blood','Had your first conversation with APEX','⚡',50);
    sa.run('opportunity_hunter','Opportunity Hunter','Discovered your first revenue opportunity','🎯',100);
    sa.run('win_streak_3','Hot Streak','Won 3 opportunities in a row','🔥',150);
    sa.run('win_streak_5','On Fire','Won 5 opportunities in a row','🌟',300);
    sa.run('level_5','Rising Star','Reached Level 5','📈',200);
    sa.run('level_10','Channel Authority','Reached Level 10','👑',500);
    sa.run('ten_opportunities','Scout','Discovered 10 opportunities','🔭',250);
    sa.run('fifty_wins','Dominator','Secured 50 wins','🏆',1000);
    sa.run('memory_keeper','Memory Keeper','Saved 10 memories','🧠',100);
  });
  tx();
}
db.close();
console.log('DB initialized.');
"

npm run seed:voyagers
echo ""

# ── 6. Done — start app ───────────────────────────────────────────────────────
echo "████████████████████████████████████████"
echo "          ✅  APEX is ready!            "
echo "████████████████████████████████████████"
echo ""
echo "  Open this in your browser:"
echo "  👉  http://localhost:3000"
echo ""
echo "  Starting now..."
echo ""
npm run dev
