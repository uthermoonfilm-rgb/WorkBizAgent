'use client'

import { useState } from 'react'
import { StickyNote, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  showPanel: boolean
  onTogglePanel: () => void
}

export function Header({ showPanel, onTogglePanel }: HeaderProps) {
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [notesContent, setNotesContent] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  const syncNotes = async () => {
    if (!notesContent.trim()) return
    setSyncing(true)

    const lines = notesContent.split('\n').filter(l => l.trim())
    const notes = lines.map((line, i) => ({
      id: `manual-${Date.now()}-${i}`,
      title: 'Apple Notes Import',
      content: line.trim(),
    }))

    await fetch('/api/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })

    setSyncing(false)
    setSynced(true)
    setTimeout(() => {
      setSynced(false)
      setShowNotesModal(false)
      setNotesContent('')
    }, 1500)
  }

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3 border-b border-apex-border/40 bg-apex-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-apex-primary/20 border border-apex-primary/40 flex items-center justify-center">
              <span className="text-apex-primary font-black text-sm tracking-tight">A</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-apex-win border-2 border-apex-surface" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-apex-text tracking-wide">APEX</h1>
            <p className="text-xs text-apex-muted">Personal Intelligence System</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNotesModal(true)}
            title="Sync Apple Notes"
            className="p-2 rounded-lg text-apex-muted hover:text-apex-subtle hover:bg-apex-card transition-all"
          >
            <StickyNote size={16} />
          </button>
          <button
            onClick={onTogglePanel}
            title="Toggle side panel"
            className={cn(
              'p-2 rounded-lg transition-all',
              showPanel
                ? 'text-apex-primary bg-apex-primary/10'
                : 'text-apex-muted hover:text-apex-subtle hover:bg-apex-card'
            )}
          >
            <PanelRight size={16} />
          </button>
        </div>
      </header>

      {/* Apple Notes modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-apex-surface border border-apex-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-apex-border/50">
              <h2 className="font-semibold text-apex-text">Sync Apple Notes</h2>
              <p className="text-sm text-apex-muted mt-1">
                Paste your to-do list from Apple Notes. APEX will read and remember it.
              </p>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                value={notesContent}
                onChange={e => setNotesContent(e.target.value)}
                placeholder="Paste your Apple Notes to-do list here..."
                rows={8}
                className="w-full bg-apex-card border border-apex-border rounded-xl px-3 py-2.5 text-sm text-apex-text placeholder:text-apex-muted outline-none resize-none focus:border-apex-primary/50 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 py-2 rounded-xl border border-apex-border text-apex-muted text-sm hover:text-apex-subtle transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={syncNotes}
                  disabled={!notesContent.trim() || syncing}
                  className="flex-1 py-2 rounded-xl bg-apex-primary text-white text-sm font-medium hover:bg-apex-primary-glow transition-all disabled:opacity-50"
                >
                  {synced ? '✓ Synced' : syncing ? 'Syncing...' : 'Sync to APEX'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
