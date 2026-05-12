import { NextRequest } from 'next/server'
import { anthropic, APEX_SYSTEM_PROMPT, MODEL } from '@/lib/claude'
import { APEX_TOOLS, executeTool } from '@/lib/tools'
import { getMessages, saveMessage } from '@/lib/memory'
import { awardXp, unlockAchievement, getState } from '@/lib/gamification'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { message, sessionId = 'default' } = await req.json()

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 })
  }

  saveMessage('user', message, sessionId)

  const history = getMessages(sessionId, 40)
  const messages: MessageParam[] = history.slice(0, -1).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  messages.push({ role: 'user', content: message })

  // First-ever message achievement
  const state = getState()
  if (state.xp === 0) {
    unlockAchievement('first_blood')
    awardXp(50, 'first conversation')
  } else {
    awardXp(5, 'conversation')
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''
      let loopCount = 0
      const MAX_LOOPS = 5

      const currentMessages = [...messages]

      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        while (loopCount < MAX_LOOPS) {
          loopCount++

          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: APEX_SYSTEM_PROMPT,
            tools: APEX_TOOLS,
            messages: currentMessages,
            stream: true,
          })

          const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
          let currentToolCall: { id: string; name: string; input: string } | null = null
          let stopReason = 'end_turn'

          for await (const event of response) {
            if (event.type === 'content_block_start') {
              if (event.content_block.type === 'text') {
                // text block starting
              } else if (event.content_block.type === 'tool_use') {
                currentToolCall = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: '',
                }
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                fullResponse += event.delta.text
                send({ type: 'text', content: event.delta.text })
              } else if (event.delta.type === 'input_json_delta' && currentToolCall) {
                currentToolCall.input += event.delta.partial_json
              }
            } else if (event.type === 'content_block_stop') {
              if (currentToolCall) {
                try {
                  toolCalls.push({
                    id: currentToolCall.id,
                    name: currentToolCall.name,
                    input: JSON.parse(currentToolCall.input || '{}'),
                  })
                } catch {
                  // malformed JSON, skip
                }
                currentToolCall = null
              }
            } else if (event.type === 'message_delta') {
              stopReason = event.delta.stop_reason ?? 'end_turn'
            }
          }

          if (toolCalls.length === 0 || stopReason === 'end_turn') break

          // Execute tools and continue
          const toolResults = []
          for (const tc of toolCalls) {
            send({ type: 'tool_start', tool: tc.name, tool_id: tc.id })
            try {
              const result = await executeTool(tc.name, tc.input)
              toolResults.push({ tool_use_id: tc.id, type: 'tool_result' as const, content: result })
              send({ type: 'tool_result', tool: tc.name, tool_id: tc.id, result: JSON.parse(result) })
            } catch (err) {
              const errMsg = JSON.stringify({ error: err instanceof Error ? err.message : 'Tool error' })
              toolResults.push({ tool_use_id: tc.id, type: 'tool_result' as const, content: errMsg, is_error: true })
            }
          }

          // Rebuild messages with assistant tool use + tool results
          const assistantContent = toolCalls.map(tc => ({
            type: 'tool_use' as const,
            id: tc.id,
            name: tc.name,
            input: tc.input,
          }))

          currentMessages.push({ role: 'assistant', content: assistantContent })
          currentMessages.push({ role: 'user', content: toolResults })
        }

        saveMessage('assistant', fullResponse, sessionId)

        const newState = getState()
        send({ type: 'done', state: newState })
        controller.close()
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
