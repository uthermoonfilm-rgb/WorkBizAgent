'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/Header'
import { ChatInterface } from '@/components/ChatInterface'
import { SidePanel } from '@/components/SidePanel'
import { cn } from '@/lib/utils'
import type { GamState } from '@/components/SidePanel'

export default function Home() {
  const [showPanel, setShowPanel] = useState(true)
  const [gamState, setGamState] = useState<GamState | null>(null)

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

  return (
    <div className="h-screen flex flex-col bg-apex-bg bg-grid-pattern overflow-hidden">
      <Header showPanel={showPanel} onTogglePanel={() => setShowPanel(v => !v)} />

      <div className="flex flex-1 min-h-0">
        <main className={cn('flex flex-col flex-1 min-w-0')}>
          <ChatInterface onStateUpdate={handleStateUpdate} />
        </main>

        <aside
          className={cn(
            'w-72 flex-shrink-0 overflow-hidden transition-all duration-300',
            showPanel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 w-0'
          )}
        >
          {showPanel && <SidePanel state={gamState} />}
        </aside>
      </div>
    </div>
  )
}
