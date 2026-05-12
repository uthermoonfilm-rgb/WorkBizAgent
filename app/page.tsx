'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/Header'
import { ChatInterface } from '@/components/ChatInterface'
import { SidePanel } from '@/components/SidePanel'
import { OutreachPanel } from '@/components/OutreachPanel'
import { cn } from '@/lib/utils'
import type { GamState } from '@/components/SidePanel'

type SideTab = 'progress' | 'outreach'

export default function Home() {
  const [showPanel, setShowPanel] = useState(true)
  const [sideTab, setSideTab] = useState<SideTab>('progress')
  const [gamState, setGamState] = useState<GamState | null>(null)
  const chatSendRef = useRef<((msg: string) => void) | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification')
      if (res.ok) setGamState(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 30_000)
    return () => clearInterval(interval)
  }, [fetchState])

  const handleStateUpdate = useCallback((_state: Record<string, unknown>) => {
    fetchState()
  }, [fetchState])

  // When outreach panel requests a draft, send it to the chat
  const handleRequestDraft = useCallback((prompt: string) => {
    setSideTab('progress') // switch back to chat area
    chatSendRef.current?.(prompt)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-apex-bg bg-grid-pattern overflow-hidden">
      <Header showPanel={showPanel} onTogglePanel={() => setShowPanel(v => !v)} />

      <div className="flex flex-1 min-h-0">
        <main className={cn('flex flex-col flex-1 min-w-0')}>
          <ChatInterface onStateUpdate={handleStateUpdate} sendRef={chatSendRef} />
        </main>

        <aside
          className={cn(
            'flex-shrink-0 overflow-hidden transition-all duration-300 border-l border-apex-border/40',
            showPanel ? 'w-80 opacity-100' : 'w-0 opacity-0'
          )}
        >
          {showPanel && (
            <div className="flex flex-col h-full bg-apex-surface">
              {/* Side tab switcher */}
              <div className="flex border-b border-apex-border/40 flex-shrink-0">
                <button
                  onClick={() => setSideTab('progress')}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-all',
                    sideTab === 'progress'
                      ? 'text-apex-primary border-b-2 border-apex-primary bg-apex-primary/5'
                      : 'text-apex-muted hover:text-apex-subtle'
                  )}
                >
                  Progress
                </button>
                <button
                  onClick={() => setSideTab('outreach')}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-all',
                    sideTab === 'outreach'
                      ? 'text-apex-primary border-b-2 border-apex-primary bg-apex-primary/5'
                      : 'text-apex-muted hover:text-apex-subtle'
                  )}
                >
                  Outreach
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {sideTab === 'progress' && <SidePanel state={gamState} />}
                {sideTab === 'outreach' && (
                  <OutreachPanel onRequestDraft={handleRequestDraft} />
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
