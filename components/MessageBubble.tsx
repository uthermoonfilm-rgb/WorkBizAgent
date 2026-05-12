'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { Message } from './ChatInterface'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 py-2 message-enter', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5',
        isUser
          ? 'bg-apex-border text-apex-subtle'
          : 'bg-apex-primary/20 text-apex-primary border border-apex-primary/30'
      )}>
        {isUser ? 'U' : 'A'}
      </div>

      {/* Content */}
      <div className={cn('flex-1 min-w-0 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-apex-card border border-apex-border text-apex-subtle rounded-tr-sm'
            : 'text-apex-text rounded-tl-sm'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="apex-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="cursor-blink inline-block w-0.5 h-4 bg-apex-primary ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>

        {/* Tool usage badges */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.toolsUsed.map((tool, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-apex-surface border border-apex-border/60 text-apex-muted"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
