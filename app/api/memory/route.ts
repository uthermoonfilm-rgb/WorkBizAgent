import { NextRequest, NextResponse } from 'next/server'
import { getMemories, saveMemory, deleteMemory, searchMemories } from '@/lib/memory'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '30')

  const memories = q ? searchMemories(q, limit) : getMemories(type, limit)
  return NextResponse.json({ memories })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, content, tags, importance } = body

  if (!type || !content) {
    return NextResponse.json({ error: 'type and content required' }, { status: 400 })
  }

  const mem = saveMemory(type, content, tags ?? [], importance ?? 5)
  return NextResponse.json({ memory: mem })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '0')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  deleteMemory(id)
  return NextResponse.json({ success: true })
}

// Apple Notes sync endpoint
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { notes } = body

  if (!Array.isArray(notes)) {
    return NextResponse.json({ error: 'notes array required' }, { status: 400 })
  }

  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS apple_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      note_id TEXT UNIQUE,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  const upsert = db.prepare(`
    INSERT INTO apple_notes (title, content, note_id, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(note_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
  `)

  const upsertMany = db.transaction((noteList: Array<{ title?: string; content: string; id?: string }>) => {
    for (const note of noteList) {
      upsert.run(note.title ?? null, note.content, note.id ?? `note-${Date.now()}-${Math.random()}`)
    }
  })

  upsertMany(notes)

  return NextResponse.json({ success: true, synced: notes.length })
}
