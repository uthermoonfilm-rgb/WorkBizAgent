import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export interface OutreachDraft {
  id: number
  type: string
  platform: string
  recipient: string | null
  recipient_handle: string | null
  subject: string | null
  body: string
  project: string
  status: 'draft' | 'sent' | 'archived'
  sent_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'draft'
  const project = searchParams.get('project') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const db = getDb()
  const drafts = project
    ? db.prepare('SELECT * FROM outreach_drafts WHERE status = ? AND project = ? ORDER BY created_at DESC LIMIT ?').all(status, project, limit)
    : db.prepare('SELECT * FROM outreach_drafts WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit)

  return NextResponse.json({ drafts, total: drafts.length })
}

export async function PATCH(req: NextRequest) {
  const { id, status, body, subject, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getDb()
  const sets: string[] = ['updated_at = datetime(\'now\')']
  const vals: unknown[] = []

  if (status !== undefined) {
    sets.push('status = ?')
    vals.push(status)
    if (status === 'sent') {
      sets.push('sent_at = datetime(\'now\')')
    }
  }
  if (body !== undefined) { sets.push('body = ?'); vals.push(body) }
  if (subject !== undefined) { sets.push('subject = ?'); vals.push(subject) }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes) }

  vals.push(id)
  db.prepare(`UPDATE outreach_drafts SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '0')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  getDb().prepare('UPDATE outreach_drafts SET status = ? WHERE id = ?').run('archived', id)
  return NextResponse.json({ success: true })
}
