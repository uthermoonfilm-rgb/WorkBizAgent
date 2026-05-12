'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { VoiceButton } from './VoiceButton'
import { useVoice } from './useVoice'
import { cn } from '@/lib/utils'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
  quickReplies?: string[]
  timestamp: Date
}

interface ChatInterfaceProps {
  onStateUpdate?: (state: Record<string, unknown>) => void
}

const MORNING_STARTERS = [
  "What's on my agenda today?",
  "Run my morning briefing",
  "What opportunities should I focus on?",
  "Check my progress",
]

const EVENING_STARTERS = [
  "Give me my evening debrief",
  "What should I wrap up today?",
  "Log a win from today",
  "Update my plan for tomorrow",
]

function getTimeBasedStarters(): string[] {
  const hour = new Date().getHours()
  if (hour < 12) return MORNING_STARTERS
  if (hour < 18) return [
    "What should I focus on right now?",
    "Check my opportunity pipeline",
    "I want to update a goal",
    "Find a new opportunity in my niche",
  ]
  return EVENING_STARTERS
}

export function ChatInterface({ onStateUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm APEX. I'm here to help you build the best version of yourself — in your video business, in the gym, and in everything in between.\n\nTell me what you're working on, what your goals are, or just talk to me. I remember everything and I'm always working in the background.\n\n**Where do you want to start?**",
      timestamp: new Date(),
      quickReplies: getTimeBasedStarters(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [activeTools, setActiveTools] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { state: voiceState, isSupported: voiceSupported, toggle: toggleVoice, speak, stopSpeaking } = useVoice({
    onTranscript: (text) => {
      setInput(prev => (prev ? prev + ' ' + text : text))
    },
  })

  // Check for due briefings on mount
  useEffect(() => {
    const checkBriefings = async () => {
      try {
        const res = await fetch('/api/briefings')
        if (!res.ok) return
        const data = await res.json()
        if (data.due_briefing) {
          const { briefing, content } = data.due_briefing

          const briefingMsg: Message = {
            id: `briefing-${briefing.id}`,
            role: 'assistant',
            content,
            timestamp: new Date(),
            quickReplies: briefing.type === 'morning'
              ? ["Let's go over my opportunities", "Talk me through my goals", "What should I prioritize today?", "Give me a workout suggestion"]
              : ["Log what I accomplished today", "Update my opportunity pipeline", "Plan tomorrow's focus", "How did I do this week?"],
          }
          setMessages(prev => [...prev, briefingMsg])

          // Mark delivered
          await fetch('/api/briefings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ briefing_id: briefing.id }),
          })

          if (voiceOutputEnabled) speak(content)
        }
      } catch {}
    }

    checkBriefings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading) return

    setInput('')
    setIsLoading(true)
    setStreamingContent('')
    setActiveTools([])

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      const toolsInvoked: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'text') {
              accumulated += data.content
              setStreamingContent(accumulated)
            } else if (data.type === 'tool_start') {
              const label = formatToolLabel(data.tool)
              if (!toolsInvoked.includes(label)) toolsInvoked.push(label)
              setActiveTools([...toolsInvoked])
            } else if (data.type === 'done') {
              if (data.state) onStateUpdate?.(data.state)
            }
          } catch {
            // skip malformed
          }
        }
      }

      // Generate quick replies based on the response context
      const quickReplies = generateQuickReplies(content, accumulated)

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: accumulated,
        toolsUsed: toolsInvoked.length > 0 ? toolsInvoked : undefined,
        quickReplies,
        timestamp: new Date(),
      }])

      if (voiceOutputEnabled && accumulated) {
        speak(accumulated)
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Check your API key and try again.',
          timestamp: new Date(),
        }])
      }
    } finally {
      setIsLoading(false)
      setStreamingContent('')
      setActiveTools([])
    }
  }, [input, isLoading, voiceOutputEnabled, speak, onStateUpdate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  // Only show quick replies on the last assistant message
  const lastAssistantIdx = [...messages].reverse().findIndex(m => m.role === 'assistant')
  const lastAssistantId = lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx].id : null

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map(msg => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.quickReplies && msg.id === lastAssistantId && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-2 ml-10">
                {msg.quickReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(reply)}
                    className="text-xs px-3 py-1.5 rounded-full border border-apex-border/60 text-apex-subtle bg-apex-card hover:border-apex-primary/50 hover:text-apex-primary transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Streaming */}
        {isLoading && (
          <div className="message-enter">
            {activeTools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 ml-10">
                {activeTools.map((tool, i) => (
                  <span key={i} className="tool-badge flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-apex-primary/10 text-apex-primary border border-apex-primary/20">
                    <span className="w-1 h-1 rounded-full bg-apex-primary animate-pulse" />
                    {tool}
                  </span>
                ))}
              </div>
            )}

            {streamingContent ? (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date(),
                }}
                isStreaming
              />
            ) : (
              <div className="flex items-center gap-2 ml-10 py-3 text-apex-muted text-sm">
                <Loader2 size={14} className="animate-spin text-apex-primary" />
                <span>APEX is thinking...</span>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice status */}
      {voiceState === 'listening' && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-apex-primary/10 border border-apex-primary/30 flex items-center gap-2 text-sm text-apex-primary">
          <span className="w-2 h-2 rounded-full bg-apex-primary voice-pulse" />
          Listening... speak now
        </div>
      )}
      {voiceState === 'speaking' && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-apex-card border border-apex-border flex items-center justify-between text-sm text-apex-subtle">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-apex-win animate-pulse" />
            APEX speaking...
          </div>
          <button onClick={stopSpeaking} className="text-xs text-apex-muted hover:text-apex-subtle">
            Stop
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-apex-border/50 p-4">
        <div className={cn(
          'flex items-end gap-2 rounded-xl border px-3 py-2 transition-all',
          'bg-apex-card border-apex-border',
          'focus-within:border-apex-primary/50'
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Talk to APEX..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-apex-text placeholder:text-apex-muted outline-none text-sm leading-relaxed min-h-[24px] max-h-[160px]"
          />
          <div className="flex items-center gap-1 pb-0.5 flex-shrink-0">
            <VoiceButton
              state={voiceState}
              isSupported={voiceSupported}
              voiceEnabled={voiceOutputEnabled}
              onToggleListen={toggleVoice}
              onToggleVoiceOutput={() => setVoiceOutputEnabled(v => !v)}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className={cn(
                'p-2 rounded-lg transition-all',
                input.trim() && !isLoading
                  ? 'bg-apex-primary text-white hover:bg-apex-primary-glow'
                  : 'text-apex-muted cursor-not-allowed'
              )}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
        <p className="text-center text-apex-muted text-xs mt-2">
          Enter to send · Shift+Enter for newline · Mic for voice
        </p>
      </div>
    </div>
  )
}

function formatToolLabel(tool: string): string {
  const labels: Record<string, string> = {
    save_memory: 'Saving memory',
    recall_memories: 'Recalling memories',
    log_opportunity: 'Logging opportunity',
    update_opportunity: 'Updating opportunity',
    get_opportunities: 'Fetching pipeline',
    search_video_trends: 'Scanning trends',
    get_gamification_state: 'Checking progress',
    sync_apple_notes: 'Reading notes',
    add_to_plan: 'Adding to plan',
  }
  return labels[tool] ?? tool.replace(/_/g, ' ')
}

function generateQuickReplies(userMessage: string, assistantResponse: string): string[] | undefined {
  const lower = userMessage.toLowerCase() + ' ' + assistantResponse.toLowerCase()

  if (lower.includes('opportunit')) {
    return ['Log a win on this', 'Mark as pursuing', 'Find more like this', 'Skip this one']
  }
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('fitness') || lower.includes('exercise')) {
    return ['Log today\'s workout', 'Set a new fitness goal', 'Track my nutrition', 'What\'s my next session?']
  }
  if (lower.includes('goal')) {
    return ['Break this goal down', 'Set a deadline', 'What\'s blocking me?', 'Log progress on this']
  }
  if (lower.includes('brief') || lower.includes('morning') || lower.includes('evening')) {
    return ['Update my pipeline', "What's my top priority?", 'Log a win', 'Set tomorrow\'s plan']
  }
  if (lower.includes('strateg') || lower.includes('plan') || lower.includes('content')) {
    return ['Add this to my plan', 'Research this further', 'What\'s the first step?', 'Save this strategy']
  }

  // Generic follow-ups
  return ['Tell me more', 'Save this to memory', 'What should I do next?', 'Find related opportunities']
}
