'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Target, Brain, Zap, ChevronRight, Trophy, Activity, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo, formatXp } from '@/lib/utils'

export interface GamState {
  xp: number
  level: number
  rank: string
  win_streak: number
  total_wins: number
  total_opportunities: number
  xp_to_next_level: number
  xp_progress_pct: number
  achievements: Array<{ key: string; title: string; icon: string; unlocked_at: string | null; description: string }>
  recent_opportunities: Array<{ id: number; title: string; status: string; created_at: string; estimated_value: string }>
}

interface SidePanelProps {
  state?: GamState | null
}

export function SidePanel({ state }: SidePanelProps) {
  const [tab, setTab] = useState<'progress' | 'pipeline' | 'achievements'>('progress')
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)

  const runScan = async () => {
    setIsScanning(true)
    try {
      await fetch('/api/agents/scan', { method: 'POST' })
      setLastScan(new Date().toISOString())
    } finally {
      setIsScanning(false)
    }
  }

  const xpPct = state?.xp_progress_pct ?? 0

  return (
    <div className="flex flex-col h-full bg-apex-surface border-l border-apex-border/50">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-apex-border/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-apex-win animate-pulse" />
              <span className="text-xs text-apex-muted uppercase tracking-widest">APEX</span>
            </div>
            <p className="text-base font-semibold text-apex-text mt-0.5">
              {state?.rank ?? 'Rookie'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-apex-gold font-bold text-lg">{formatXp(state?.xp ?? 0)}</p>
            <p className="text-xs text-apex-muted">Level {state?.level ?? 1}</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-apex-card rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-apex-primary to-apex-primary-glow rounded-full transition-all duration-1000"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-xs text-apex-muted">{state?.xp_to_next_level ?? 0} XP to next level</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-b border-apex-border/30">
        {[
          { label: 'Wins', value: state?.total_wins ?? 0, icon: Trophy, color: 'text-apex-gold' },
          { label: 'Pipeline', value: state?.total_opportunities ?? 0, icon: Target, color: 'text-apex-primary' },
          { label: 'Streak', value: state?.win_streak ?? 0, icon: Activity, color: 'text-apex-win' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex flex-col items-center py-3 gap-1">
            <Icon size={14} className={color} />
            <span className={cn('font-bold text-sm', color)}>{value}</span>
            <span className="text-apex-muted text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-apex-border/30">
        {(['progress', 'pipeline', 'achievements'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-xs font-medium capitalize transition-all',
              tab === t
                ? 'text-apex-primary border-b-2 border-apex-primary'
                : 'text-apex-muted hover:text-apex-subtle'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'progress' && (
          <ProgressTab onRunScan={runScan} isScanning={isScanning} lastScan={lastScan} />
        )}
        {tab === 'pipeline' && (
          <PipelineTab opportunities={state?.recent_opportunities ?? []} />
        )}
        {tab === 'achievements' && (
          <AchievementsTab achievements={state?.achievements ?? []} />
        )}
      </div>
    </div>
  )
}

function ProgressTab({ onRunScan, isScanning, lastScan }: { onRunScan: () => void; isScanning: boolean; lastScan: string | null }) {
  const goals = [
    { label: 'Video Business', icon: TrendingUp, color: 'text-apex-primary', desc: 'Revenue & growth' },
    { label: 'Body Recomp', icon: Activity, color: 'text-apex-win', desc: 'Fat loss + muscle gain' },
    { label: 'Personal Growth', icon: Brain, color: 'text-apex-gold', desc: 'Habits & mindset' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs text-apex-muted uppercase tracking-wider">Active Goals</p>
      {goals.map(({ label, icon: Icon, color, desc }) => (
        <div key={label} className="flex items-center gap-3 p-2.5 rounded-lg bg-apex-card border border-apex-border/50 hover:border-apex-border transition-colors">
          <div className={cn('p-1.5 rounded-lg bg-apex-surface', color)}>
            <Icon size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-apex-text font-medium truncate">{label}</p>
            <p className="text-xs text-apex-muted">{desc}</p>
          </div>
          <ChevronRight size={12} className="text-apex-border flex-shrink-0" />
        </div>
      ))}

      <div className="mt-4 pt-3 border-t border-apex-border/30">
        <p className="text-xs text-apex-muted uppercase tracking-wider mb-2">Standby Agent</p>
        <div className="p-3 rounded-lg bg-apex-card border border-apex-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-apex-gold" />
            <span className="text-xs text-apex-subtle">Background opportunity scanner</span>
          </div>
          {lastScan && (
            <p className="text-xs text-apex-muted">Last scan: {timeAgo(lastScan)}</p>
          )}
          <button
            onClick={onRunScan}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-apex-primary/10 border border-apex-primary/30 text-apex-primary text-xs font-medium hover:bg-apex-primary/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={cn(isScanning && 'animate-spin')} />
            {isScanning ? 'Scanning...' : 'Run Scan Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PipelineTab({ opportunities }: { opportunities: Array<{ id: number; title: string; status: string; created_at: string; estimated_value: string }> }) {
  const statusColors: Record<string, string> = {
    discovered: 'text-apex-subtle bg-apex-border/30',
    pursuing: 'text-apex-primary bg-apex-primary/10',
    won: 'text-apex-win bg-apex-win/10',
    lost: 'text-apex-loss bg-apex-loss/10',
    passed: 'text-apex-muted bg-apex-surface',
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-8 text-apex-muted text-sm">
        <Target size={24} className="mx-auto mb-2 opacity-30" />
        <p>No opportunities yet.</p>
        <p className="text-xs mt-1">Ask APEX to scan for opportunities.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {opportunities.map(opp => (
        <div key={opp.id} className="p-3 rounded-lg bg-apex-card border border-apex-border/50 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-apex-text font-medium leading-tight">{opp.title}</p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', statusColors[opp.status] ?? statusColors.discovered)}>
              {opp.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-apex-muted">
            <span>{opp.estimated_value}</span>
            <span>{timeAgo(opp.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AchievementsTab({ achievements }: { achievements: Array<{ key: string; title: string; icon: string; unlocked_at: string | null; description: string }> }) {
  const unlocked = achievements.filter(a => a.unlocked_at)
  const locked = achievements.filter(a => !a.unlocked_at)

  return (
    <div className="space-y-3">
      {unlocked.length > 0 && (
        <>
          <p className="text-xs text-apex-muted uppercase tracking-wider">Unlocked</p>
          {unlocked.map(ach => (
            <div key={ach.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-apex-card border border-apex-gold/20">
              <span className="text-lg">{ach.icon}</span>
              <div className="min-w-0">
                <p className="text-sm text-apex-text font-medium">{ach.title}</p>
                <p className="text-xs text-apex-muted truncate">{ach.description}</p>
              </div>
            </div>
          ))}
        </>
      )}

      {locked.length > 0 && (
        <>
          <p className="text-xs text-apex-muted uppercase tracking-wider mt-2">Locked</p>
          {locked.map(ach => (
            <div key={ach.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-apex-surface border border-apex-border/30 opacity-50">
              <span className="text-lg grayscale">{ach.icon}</span>
              <div className="min-w-0">
                <p className="text-sm text-apex-text font-medium">{ach.title}</p>
                <p className="text-xs text-apex-muted truncate">{ach.description}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
