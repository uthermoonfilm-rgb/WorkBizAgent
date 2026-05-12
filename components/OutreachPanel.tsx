'use client'

import { useState, useEffect, useCallback } from 'react'
import { Send, Copy, Archive, ChevronDown, ChevronUp, Edit3, Check, Loader2, Mail, MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

interface OutreachDraft {
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
}

const PLATFORM_ICONS: Record<string, string> = {
  email: '✉️',
  instagram: '📸',
  twitter: '𝕏',
  linkedin: '💼',
  other: '💬',
}

const PROJECT_LABELS: Record<string, { label: string; color: string }> = {
  voyagers: { label: 'Voyagers', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  where_we_fade: { label: 'Where We Fade', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  both: { label: 'Both', color: 'text-apex-gold bg-apex-gold/10 border-apex-gold/20' },
  general: { label: 'General', color: 'text-apex-subtle bg-apex-border/30 border-apex-border/60' },
}

const TYPE_LABELS: Record<string, string> = {
  cold_email: 'Cold Email',
  collaboration_pitch: 'Collab Pitch',
  press_pitch: 'Press Pitch',
  label_submission: 'Label Sub',
  sponsor_pitch: 'Sponsor',
  instagram_dm: 'Instagram DM',
  twitter_dm: 'Twitter DM',
  linkedin_dm: 'LinkedIn DM',
}

interface OutreachPanelProps {
  onRequestDraft?: (prompt: string) => void
}

export function OutreachPanel({ onRequestDraft }: OutreachPanelProps) {
  const [drafts, setDrafts] = useState<OutreachDraft[]>([])
  const [sentDrafts, setSentDrafts] = useState<OutreachDraft[]>([])
  const [tab, setTab] = useState<'queue' | 'sent'>('queue')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [marking, setMarking] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  const loadDrafts = useCallback(async () => {
    try {
      const [draftRes, sentRes] = await Promise.all([
        fetch('/api/outreach?status=draft'),
        fetch('/api/outreach?status=sent&limit=10'),
      ])
      if (draftRes.ok) setDrafts((await draftRes.json()).drafts)
      if (sentRes.ok) setSentDrafts((await sentRes.json()).drafts)
    } catch {}
  }, [])

  useEffect(() => {
    loadDrafts()
    const interval = setInterval(loadDrafts, 15_000)
    return () => clearInterval(interval)
  }, [loadDrafts])

  const startEdit = (draft: OutreachDraft) => {
    setEditingId(draft.id)
    setEditBody(draft.body)
    setEditSubject(draft.subject ?? '')
    setExpandedId(draft.id)
  }

  const saveEdit = async (id: number) => {
    setSaving(id)
    await fetch('/api/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, body: editBody, subject: editSubject }),
    })
    setSaving(null)
    setEditingId(null)
    loadDrafts()
  }

  const markSent = async (id: number) => {
    setMarking(id)
    await fetch('/api/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'sent' }),
    })
    setMarking(null)
    loadDrafts()
  }

  const archive = async (id: number) => {
    await fetch(`/api/outreach?id=${id}`, { method: 'DELETE' })
    loadDrafts()
  }

  const copyToClipboard = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const quickDraftPrompts = [
    { label: 'Press pitch — Voyagers', prompt: 'Draft a press pitch email for The Voyagers project to a music blog or indie film site.' },
    { label: 'Collab DM — musician', prompt: 'Draft an Instagram DM to a musician about collaborating on The Voyagers or Where We Fade.' },
    { label: 'Label submission — Voyagers', prompt: 'Draft a label submission email for The Voyagers album biopic series.' },
    { label: 'Sponsor email', prompt: 'Draft a cold email to a potential brand sponsor for The Voyagers project.' },
    { label: 'Festival submission', prompt: 'Draft a film festival submission email for The Voyagers episode films.' },
    { label: 'Curator pitch — Where We Fade', prompt: 'Draft an Instagram or email pitch to a playlist curator or music blog for Where We Fade.' },
  ]

  const activeList = tab === 'queue' ? drafts : sentDrafts

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-apex-border/30 flex-shrink-0">
        <button
          onClick={() => setTab('queue')}
          className={cn(
            'flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            tab === 'queue'
              ? 'text-apex-primary border-b-2 border-apex-primary'
              : 'text-apex-muted hover:text-apex-subtle'
          )}
        >
          <Mail size={12} />
          Queue
          {drafts.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-apex-primary text-white text-xs flex items-center justify-center font-bold">
              {drafts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={cn(
            'flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            tab === 'sent'
              ? 'text-apex-win border-b-2 border-apex-win'
              : 'text-apex-muted hover:text-apex-subtle'
          )}
        >
          <Check size={12} />
          Sent ({sentDrafts.length})
        </button>
      </div>

      {/* Quick generate */}
      {tab === 'queue' && onRequestDraft && (
        <div className="p-3 border-b border-apex-border/20 flex-shrink-0">
          <p className="text-xs text-apex-muted mb-2 flex items-center gap-1.5">
            <Plus size={10} />
            Generate draft
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickDraftPrompts.map(({ label, prompt }) => (
              <button
                key={label}
                onClick={() => onRequestDraft(prompt)}
                className="text-xs px-2.5 py-1 rounded-full bg-apex-card border border-apex-border/50 text-apex-subtle hover:border-apex-primary/40 hover:text-apex-primary transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Draft list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeList.length === 0 && (
          <div className="text-center py-10 text-apex-muted text-sm">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            {tab === 'queue'
              ? <><p>No drafts yet.</p><p className="text-xs mt-1">Ask APEX to draft an outreach email or DM.</p></>
              : <p>Nothing sent yet.</p>
            }
          </div>
        )}

        {activeList.map(draft => {
          const isExpanded = expandedId === draft.id
          const isEditing = editingId === draft.id
          const proj = PROJECT_LABELS[draft.project] ?? PROJECT_LABELS.general

          return (
            <div
              key={draft.id}
              className={cn(
                'rounded-xl border transition-all',
                isExpanded
                  ? 'bg-apex-card border-apex-border'
                  : 'bg-apex-surface border-apex-border/40 hover:border-apex-border/70'
              )}
            >
              {/* Header row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                className="w-full flex items-start gap-3 p-3 text-left"
              >
                <span className="text-base mt-0.5 flex-shrink-0">{PLATFORM_ICONS[draft.platform] ?? '💬'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-apex-subtle font-medium">{TYPE_LABELS[draft.type] ?? draft.type}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', proj.color)}>{proj.label}</span>
                  </div>
                  <p className="text-sm text-apex-text font-medium truncate mt-0.5">
                    {draft.recipient ?? draft.subject ?? 'Untitled draft'}
                  </p>
                  {draft.subject && draft.recipient && (
                    <p className="text-xs text-apex-muted truncate">{draft.subject}</p>
                  )}
                  <p className="text-xs text-apex-muted mt-0.5">{timeAgo(draft.created_at)}</p>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-apex-muted flex-shrink-0 mt-1" /> : <ChevronDown size={14} className="text-apex-muted flex-shrink-0 mt-1" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Subject (email) */}
                  {draft.platform === 'email' && (
                    isEditing ? (
                      <div>
                        <p className="text-xs text-apex-muted mb-1">Subject</p>
                        <input
                          value={editSubject}
                          onChange={e => setEditSubject(e.target.value)}
                          className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm text-apex-text outline-none focus:border-apex-primary/50"
                        />
                      </div>
                    ) : draft.subject ? (
                      <div className="px-3 py-2 rounded-lg bg-apex-surface border border-apex-border/40">
                        <p className="text-xs text-apex-muted">Subject</p>
                        <p className="text-sm text-apex-text">{draft.subject}</p>
                      </div>
                    ) : null
                  )}

                  {/* Body */}
                  {isEditing ? (
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={10}
                      className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm text-apex-text outline-none resize-none focus:border-apex-primary/50 leading-relaxed"
                    />
                  ) : (
                    <div className="px-3 py-2.5 rounded-lg bg-apex-surface border border-apex-border/40 text-sm text-apex-subtle whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {draft.body}
                    </div>
                  )}

                  {/* Notes */}
                  {draft.notes && !isEditing && (
                    <p className="text-xs text-apex-muted italic px-1">Note: {draft.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {tab === 'queue' && (
                      <>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(draft.id)}
                              disabled={saving === draft.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-apex-primary text-white text-xs font-medium hover:bg-apex-primary-glow transition-all"
                            >
                              {saving === draft.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-2 rounded-lg border border-apex-border text-apex-muted text-xs hover:text-apex-subtle transition-all"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => copyToClipboard(
                                draft.platform === 'email' && draft.subject
                                  ? `Subject: ${draft.subject}\n\n${draft.body}`
                                  : draft.body,
                                draft.id
                              )}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-apex-border/40 text-apex-subtle text-xs hover:text-apex-text transition-all"
                            >
                              {copied === draft.id ? <Check size={11} className="text-apex-win" /> : <Copy size={11} />}
                              {copied === draft.id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => startEdit(draft)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-apex-border/40 text-apex-subtle text-xs hover:text-apex-text transition-all"
                            >
                              <Edit3 size={11} />
                              Edit
                            </button>
                            <button
                              onClick={() => markSent(draft.id)}
                              disabled={marking === draft.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-apex-win/10 border border-apex-win/30 text-apex-win text-xs font-medium hover:bg-apex-win/20 transition-all"
                            >
                              {marking === draft.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                              Mark Sent
                            </button>
                            <button
                              onClick={() => archive(draft.id)}
                              className="p-2 rounded-lg text-apex-muted hover:text-apex-subtle transition-all"
                              title="Archive"
                            >
                              <Archive size={13} />
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {tab === 'sent' && (
                      <div className="flex items-center gap-2 text-xs text-apex-muted">
                        <Check size={12} className="text-apex-win" />
                        Sent {draft.sent_at ? timeAgo(draft.sent_at) : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
