/**
 * Seed script — imports all Voyagers project context from MINDSHARE conversations
 * Run: npx tsx scripts/seed-voyagers.ts
 */
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = process.env.APEX_DATA_DIR ?? path.join(process.cwd(), '.apex-data')
const DB_PATH = path.join(DB_DIR, 'apex.db')

if (!fs.existsSync(DB_DIR)) {
  console.error('No APEX database found. Run the app first to initialize it.')
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const insert = db.prepare(`
  INSERT INTO memories (type, content, tags, importance, created_at, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
`)

const memories: Array<{ type: string; content: string; tags: string[]; importance: number }> = [

  // ── EPISODE STATUS ──────────────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'THE VOYAGERS — Episode Status:\nEp 1 "Game of Love" — scripted, filming May 31 & June 1 (Maine). NYC shoot (Pete scene, payphone, montage) happening May 23-30.\nEp 2 "Rainbow Nightmare" — COMPLETE. Already filmed, currently in film festivals.\nEp 3 "Fantasia" — needs concept and filming.\nEp 4 "Running Away" — needs concept and filming.\nEp 5 "Boothbay Memories" — needs concept and filming.\nEp 6 "I Can\'t Wait" — needs concept and filming.',
    tags: ['voyagers', 'episodes', 'status', 'production'],
    importance: 10,
  },
  {
    type: 'niche_insight',
    content: 'THE VOYAGERS — Album track order (episodes follow this sequence):\n1. Game of Love\n2. Rainbow Nightmare\n3. Fantasia\n4. Running Away\n5. Boothbay Memories\n6. I Can\'t Wait\nEach episode is named after its song. Music video plays at episode end.',
    tags: ['voyagers', 'tracklist', 'structure'],
    importance: 10,
  },

  // ── CHARACTERS ───────────────────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS CHARACTER — TODD (lead vocals & guitar): The main character the series gradually centers on. Level-headed but confident, rockstar energy, mega music nerd. Dropped out of college to chase music in NYC for two years — didn\'t work out. Returning to Boothbay Harbor slightly embarrassed but happy to be home. Family backstory: his family exiled him (revealed in Ep 2; in Ep 1 we plant: Ned asks "can\'t you stay with your folks?" Todd just says "No." and moves on). Based on real Todd (the user\'s dad).',
    tags: ['voyagers', 'character', 'todd', 'protagonist'],
    importance: 10,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS CHARACTER — NATE (lead guitar): Relaxed, a musical prodigy — the music god of the group. Series arc: he has a secret crush. He wrote "Game of Love" for her without saying it. Gains courage to ask her out across the series; she\'s eventually wowed by him at a show. His introduction: group hears him shredding guitar inside his camper before knocking. He opens the door squinting like he\'s high, sees the group posed like the Breakfast Club. His key lines: "...Yeah. Obviously." and smirks when asked where Game of Love came from.',
    tags: ['voyagers', 'character', 'nate', 'arc', 'game-of-love'],
    importance: 10,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS CHARACTER — JASON (keys & vocals): Smart ass leader. Confident, socially locked in. Natural leader — people gravitate toward him. Perceptive. Has a little smart ass energy but it\'s earned. He\'s been in Boothbay, knows people. In Ep 1 he plants the backyard show idea: "Before Dennis blows us all up with his fireworks, let\'s just start small. I know someone who\'ll let us play their backyard. Get the rust off first." He\'s the one who notices Nate\'s smirk and asks "Where\'d that come from?"',
    tags: ['voyagers', 'character', 'jason'],
    importance: 9,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS CHARACTER — DENNIS (drums): Hothead but smart. Wants everything top-notch and professionally presented. Worries about how Boothbay will receive original music — "You know how Boothbay is. We play some rinky dink backyard show nobody\'s gonna take us seriously. I\'m not setting up my kit for a backyard." Has stuff going on in his garage (fireworks/pyro). Recently got his own apartment in Boothbay fresh out of college. Works cutting stones "on the rocks." He and Jason are the 80s music culture nerds.',
    tags: ['voyagers', 'character', 'dennis'],
    importance: 9,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS CHARACTER — GEORGE (bass): Goofball. Doesn\'t really know how to play bass — it\'s a running gag throughout the series. Performer, always making fun of people. Social butterfly — can pull 30 people to a show just by asking. He hummed what sounds like a bad "Jessie\'s Girl" impression when demonstrating a bassline. Classic George moment: "NATE COME ON." — which works. He says it, and that\'s what gets Nate to say yes.',
    tags: ['voyagers', 'character', 'george'],
    importance: 9,
  },

  // ── EPISODE 1 SCENE BREAKDOWN ────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS EP1 "GAME OF LOVE" — Full Scene Breakdown:\n\nCOLD OPEN: NYC montage — Todd\'s struggle in Brooklyn. Ends at a payphone at 2am. He calls Dennis half-asleep: "Can I stay for a couple weeks? Maybe longer." Dennis: "...Yeah. Sure." Not enthusiastic, but not a no. Hard cut to Maine.\n\nTITLE CARD: ONE WEEK LATER\n\nSCENE 1 — DENNIS\'S APARTMENT (filmed at grandma\'s house): Todd walks up a hill carrying guitar case, arriving midday. Dennis opens door. They catch up — casual, warm, doing character work: Todd explains the NYC failure, Dennis reveals his situation (just got the apartment, works cutting stones). The Police on a tape player (Dennis mouths along briefly). Beer crack — both open them in natural sync. Dennis calls George: "Todd\'s back." George: "Todd\'s back?" Dennis: "Yeah." George is helping his dad — will pull up to [restaurant name] at 7. Dennis says "almost the full band" like an old joke.\n\nAlso in this scene: Ned (someone in NYC, earlier scene) asks "can\'t you stay with your folks?" Todd goes quiet: "No." — plants family exile without explaining it.',
    tags: ['voyagers', 'episode-1', 'scenes', 'breakdown'],
    importance: 10,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS EP1 "GAME OF LOVE" — Scene Breakdown continued:\n\nSCENE 2 — THE DOCKS: Todd and Dennis find Jason getting off shift, holding court with coworkers. He breaks away. They reunite. Cut to coastal rocks or restaurant at golden hour — whichever works visually. Jason lore dump tastefully. Todd asks if anyone\'s been playing. Everyone: yeah, but it hasn\'t clicked. Todd pitches The Voyagers. Lands like a joke. Then it doesn\'t. Then:\n\nBACKYARD EXCHANGE (key anchor dialogue):\nJASON: "Before Dennis blows us all up with his fireworks, let\'s just start small. I know someone who\'ll let us play their backyard. Get the rust off first."\nDENNIS: "A backyard? Come on man. You know how Boothbay is. We play some rinky dink backyard show nobody\'s gonna take us seriously. I\'m not setting up my kit for a backyard."\nTODD: "The Clash didn\'t start in someone\'s backyard."\nDENNIS: "The Clash literally started in a squat in Notting Hill, Dennis." [Todd corrects himself or this is the joke]\nGEORGE: "I can get like 30 people there easy."\nEnds on: "We need to find Nate."',
    tags: ['voyagers', 'episode-1', 'scenes', 'dialogue', 'anchor-lines'],
    importance: 10,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS EP1 "GAME OF LOVE" — Nate Scene (trailer park):\nGroup pulls up. Hear guitar being shredded inside. Dennis: "Still at it." They knock. Nate opens door squinting. Then POV — the four of them posed like the Breakfast Club.\nNATE: "Hey Todd. Hey Dennis. Hey Jason. Hey—"\nGEORGE: "SUP FOOL."\nTodd pitches The Voyagers. Awkward pause — Nate just stares.\nNATE: "I don\'t know man... things are pretty good right now. Pretty peaceful."\nGEORGE: "NATE COME ON."\nNate looks at George. At the rest. NATE: "...Yeah. Obviously."\nTodd mentions the backyard show. Nate picks up guitar.\nNATE: "Actually — I just wrote something."\nPlays opening of Game of Love. Group goes quiet.\nJASON: "Where\'d that come from?"\nNate smirks. Keeps playing. George: "ohhhh." Everyone laughs. Nate plays on like he didn\'t hear it.\nTodd: "Let\'s not waste it." or similar closing line.\nSmash cut to: MUSIC VIDEO — "Game of Love" by The Voyagers.',
    tags: ['voyagers', 'episode-1', 'nate-scene', 'anchor-lines', 'game-of-love'],
    importance: 10,
  },

  // ── EPISODE 2 THREADING ────────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS EP2 "RAINBOW NIGHTMARE" — Already filmed and in festivals. Key threading notes from Ep1: The backyard concert in Ep2 must be clearly established in Ep1 as a small first gig (NOT the battle of the bands). In Ep1 Jason suggests it as a low-key first show. In Ep2 they also get a poster for "battle of the bands" — the backyard show is separate. The backyard concert is their first time playing Rainbow Nightmare for a crowd — they\'re nervous about it. This needs to be clear from Ep1 setup.',
    tags: ['voyagers', 'episode-2', 'rainbow-nightmare', 'threading'],
    importance: 9,
  },

  // ── PRODUCTION & LOGISTICS ────────────────────────────────────────────────
  {
    type: 'strategy',
    content: 'VOYAGERS PRODUCTION LOGISTICS:\n— Director: Uther Moon Dadaleares / Cratermoon Productions\n— Full cast and crew confirmed, all unpaid/passion project\n— Scheduling is the only real variable (dates with cast/crew)\n— Maine shoot: two consecutive days, early June (wrangling 5 actors + crew)\n— NYC shoot: May 23-30, night shoot (Pete scene, payphone, NYC montage)\n— Lenses: Blazar anamorphics from professor (confirmed loan, need exact dates)\n— Post: all handled by director (editing, color grading, sound mix)\n— Goal: complete all 6 episodes this year\n— Google Drive: CRATERMOON > Projects > THE VOYAGERS (Scripts / Shot Lists / Shooting Schedules folders)',
    tags: ['voyagers', 'production', 'logistics', 'schedule'],
    importance: 9,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS SCRIPT APPROACH — Dialogue is mostly improvised. Script is a blueprint with ANCHOR LINES that must land exactly as written, surrounded by loose improvised conversation. Anchor lines: F string moment (George doesn\'t know there\'s no F string on bass), Nate\'s "Yeah. Obviously.", Dennis "Still at it", Breakfast Club POV pose, Nate\'s smirk when asked about Game of Love, "The Clash literally started in a squat in Notting Hill Dennis", Todd "No." (family exile), George "NATE COME ON", George "SUP FOOL".',
    tags: ['voyagers', 'script', 'improv', 'anchor-lines'],
    importance: 8,
  },
  {
    type: 'niche_insight',
    content: 'VOYAGERS SHOT LIST FORMAT (from existing Game of Love shot list template):\nColumns: DAY # | INT/EXT | Location | Scene Title | Scene # | Shot # | Reference Photo | Shot Type | Shot Description | Lens | Camera Angle | Camera Move | Camera Support | FPS | Talent | Audio | VFX | Time | COMMENTS\nThis format should be used for all episodes.',
    tags: ['voyagers', 'production', 'shot-list', 'format'],
    importance: 7,
  },

  // ── 80S REFERENCES BAKED INTO EP1 ────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS EP1 — 80s cultural references baked in:\n— The Police on tape player in Dennis\'s apartment (Dennis mouths along)\n— Clash reference: "The Clash didn\'t start in someone\'s backyard" / "The Clash literally started in a squat in Notting Hill"\n— Dennis calls UMA jam guys "total Flock of Seagulls types" (or "total posers")\n— George humming wrong bassline sounds like a bad "Jessie\'s Girl" impression\n— Springsteen reference: someone at golden hour says "I\'ve been listening to so much Springsteen up here man"\n— Breakfast Club pose reveal (cinematic 80s reference)\n— Period accurate wardrobe and props (1986 Maine)',
    tags: ['voyagers', '80s', 'references', 'episode-1'],
    importance: 7,
  },

  // ── NATE'S SERIES ARC ────────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS — NATE\'S SERIES ARC: Nate wrote "Game of Love" for a girl he has a crush on. This is NOT stated outright in Episode 1 — only hinted at with his smirk when Jason asks "Where\'d that come from?" Across the series he gains the courage to ask her out. She is eventually wowed by his performance at a show. This is one of the key emotional throughlines of the series.',
    tags: ['voyagers', 'nate', 'arc', 'romance', 'series-throughline'],
    importance: 9,
  },

  // ── GEORGE'S RUNNING GAG ──────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS — GEORGE\'S BASS GAG: George doesn\'t know how to play bass. This is a running gag. Key moment: he says something like "how hard can it be, it\'s like four strings right?" — Dennis just stares. He also doesn\'t know there\'s no F string on a bass guitar. This should recur as a throughline across episodes — George always enthusiastic, always slightly wrong.',
    tags: ['voyagers', 'george', 'comedy', 'running-gag'],
    importance: 7,
  },

  // ── EP1 PREPRODUCTION CHECKLIST ──────────────────────────────────────────
  {
    type: 'goal',
    content: 'VOYAGERS EP1 PRE-PRODUCTION — Outstanding items:\n[ ] Confirm Blazar anamorphic lens pickup dates with professor\n[ ] Lock Maine shoot dates (two consecutive days, early June) — awaiting cast availability\n[ ] NYC shoot (May 23-30): confirm Pete/Ned scene location, payphone location, shot list\n[ ] 80s wardrobe for all 5 cast members + Todd for NYC\n[ ] Props: guitar cases, tape player, The Police tape, period beer cans, fridge photos of the band, payphone quarter\n[ ] Set dressing: Dennis\'s apartment (grandma\'s house) — period dressing, fridge photos printed\n[ ] Car decision: practical period cars vs AI set extension for background dressing\n[ ] Shot list: complete scene by scene, share with DP\n[ ] Call sheet: built and sent 48hrs before each shoot',
    tags: ['voyagers', 'episode-1', 'preproduction', 'checklist', 'urgent'],
    importance: 10,
  },

  // ── MUSIC VIDEO ──────────────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS EP1 — "Game of Love" music video: concept NOT yet decided. Needs 4 in-depth scenes. Question still open: narrative, performance-based, or both. Music video plays at the END of Episode 1. Music rights/usage needs confirmation with Todd (the real band member).',
    tags: ['voyagers', 'music-video', 'game-of-love', 'todo'],
    importance: 8,
  },

  // ── BROADER SERIES TONE ──────────────────────────────────────────────────
  {
    type: 'niche_insight',
    content: 'VOYAGERS SERIES TONE & AESTHETIC: Warm, funny, slightly surreal "getting the band back together" energy. Coastal Maine summer, early 20s. Comic book aesthetic but grounded and raw. Almost a comedy. Not heavily dramatic — the tension is low-stakes and character-based. Think: prime early-20s in coastal Maine. The emotional core is: accepting yourself, believing in your art, doing it without fail. A love letter to making music and giving a damn about it. Boothbay Harbor locals are skeptical of original music — this is a real tension the band navigates.',
    tags: ['voyagers', 'tone', 'aesthetic', 'series-bible'],
    importance: 9,
  },
]

const seedMany = db.transaction(() => {
  let count = 0
  for (const m of memories) {
    // Check if this memory already exists (by content prefix to avoid duplication)
    const exists = db.prepare('SELECT id FROM memories WHERE content LIKE ?').get(m.content.substring(0, 80) + '%')
    if (exists) {
      console.log(`  SKIP (exists): ${m.content.substring(0, 60)}...`)
      continue
    }
    insert.run(m.type, m.content, JSON.stringify(m.tags), m.importance)
    count++
    console.log(`  ✓ ${m.content.substring(0, 70)}...`)
  }
  return count
})

console.log('\n🎬 Seeding Voyagers project memories into APEX...\n')
const count = seedMany()
console.log(`\n✅ Done. Seeded ${count} new memories (${memories.length - count} already existed).\n`)

db.close()
