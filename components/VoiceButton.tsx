'use client'

import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceButtonProps {
  state: 'idle' | 'listening' | 'speaking'
  isSupported: boolean
  voiceEnabled: boolean
  onToggleListen: () => void
  onToggleVoiceOutput: () => void
}

export function VoiceButton({ state, isSupported, voiceEnabled, onToggleListen, onToggleVoiceOutput }: VoiceButtonProps) {
  if (!isSupported) return null

  return (
    <div className="flex items-center gap-1">
      {/* Voice output toggle */}
      <button
        onClick={onToggleVoiceOutput}
        title={voiceEnabled ? 'Mute APEX' : 'Unmute APEX'}
        className={cn(
          'p-2 rounded-lg transition-all',
          voiceEnabled
            ? 'text-apex-primary bg-apex-primary/10'
            : 'text-apex-muted hover:text-apex-subtle'
        )}
      >
        {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* Mic button */}
      <button
        onClick={onToggleListen}
        disabled={state === 'speaking'}
        title={state === 'listening' ? 'Stop listening' : 'Hold to speak'}
        className={cn(
          'p-2 rounded-lg transition-all',
          state === 'listening'
            ? 'text-white bg-apex-primary voice-pulse'
            : state === 'speaking'
            ? 'text-apex-muted cursor-not-allowed'
            : 'text-apex-muted hover:text-apex-primary hover:bg-apex-primary/10'
        )}
      >
        {state === 'listening' ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
    </div>
  )
}
