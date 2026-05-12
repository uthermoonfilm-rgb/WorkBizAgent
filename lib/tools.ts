import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import { saveMemory, saveOpportunity, getMemories, searchMemories, getOpportunities } from './memory'
import { awardXp, getState } from './gamification'
import { getDb } from './db'

export const APEX_TOOLS: Tool[] = [
  {
    name: 'save_memory',
    description: 'Save important information about the user, their niche, goals, strategies, wins, losses, or anything worth remembering. Use this proactively whenever you learn something valuable.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['goal', 'strategy', 'win', 'loss', 'preference', 'niche_insight', 'lesson', 'contact', 'resource'],
          description: 'Category of the memory',
        },
        content: { type: 'string', description: 'The memory content to save' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for retrieval' },
        importance: { type: 'number', description: '1-10, higher = more important', minimum: 1, maximum: 10 },
      },
      required: ['type', 'content'],
    },
  },
  {
    name: 'recall_memories',
    description: 'Retrieve past memories, goals, strategies, or lessons. Use this at the start of conversations or when context about the user is needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (optional - leave empty to get recent memories)' },
        type: {
          type: 'string',
          enum: ['goal', 'strategy', 'win', 'loss', 'preference', 'niche_insight', 'lesson', 'contact', 'resource'],
          description: 'Filter by memory type (optional)',
        },
        limit: { type: 'number', description: 'Max memories to return', default: 10 },
      },
      required: [],
    },
  },
  {
    name: 'log_opportunity',
    description: 'Log a new revenue opportunity discovered in the video niche. Use this when you find potential deals, sponsorships, trends to capitalize on, collaboration openings, or any money-making angle.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short title of the opportunity' },
        description: { type: 'string', description: 'Full description including why this is valuable and how to pursue it' },
        estimated_value: { type: 'string', description: 'Estimated dollar value or range (e.g. "$500-2k/mo")' },
        niche: { type: 'string', description: 'Specific sub-niche within video content' },
        action_steps: { type: 'string', description: 'Concrete next steps to pursue this opportunity' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'update_opportunity',
    description: 'Update the status of an opportunity to won, lost, pursuing, or passed. Also records lessons learned.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'Opportunity ID' },
        status: {
          type: 'string',
          enum: ['pursuing', 'won', 'lost', 'passed'],
          description: 'New status',
        },
        outcome: { type: 'string', description: 'What happened, what was learned' },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'get_opportunities',
    description: 'Retrieve current opportunities in the pipeline.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['discovered', 'pursuing', 'won', 'lost', 'passed'],
          description: 'Filter by status',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_video_trends',
    description: 'Search for trending topics, formats, and opportunities in the video/YouTube niche. Returns curated intelligence on what\'s working right now.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for (topic, format, monetization angle)' },
        focus: {
          type: 'string',
          enum: ['trending_topics', 'monetization', 'formats', 'competitors', 'collabs', 'sponsorships'],
          description: 'What type of intelligence to focus on',
        },
      },
      required: ['query', 'focus'],
    },
  },
  {
    name: 'get_gamification_state',
    description: 'Get current XP, level, rank, win streak, and achievements. Use this when the user asks about progress or to celebrate wins.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'sync_apple_notes',
    description: 'Read the user\'s Apple Notes to-do list that has been synced to the app. Use this to understand what the user is working on and help prioritize.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Optional search term to filter notes' },
      },
      required: [],
    },
  },
  {
    name: 'add_to_plan',
    description: 'Add a planned action or task to the user\'s APEX plan. These are actions the assistant will work on during standby mode.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'The task or action to plan' },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Priority level',
        },
        category: {
          type: 'string',
          enum: ['opportunity', 'research', 'strategy', 'outreach', 'content', 'monetization'],
          description: 'Task category',
        },
        notes: { type: 'string', description: 'Additional context or notes' },
      },
      required: ['task', 'priority', 'category'],
    },
  },
]

export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'save_memory': {
      const mem = saveMemory(
        input.type as string,
        input.content as string,
        (input.tags as string[]) ?? [],
        (input.importance as number) ?? 5
      )
      awardXp(10, 'memory saved')

      const memCount = getDb().prepare('SELECT COUNT(*) as c FROM memories').get() as { c: number }
      if (memCount.c >= 10) {
        const db = getDb()
        const existing = db.prepare('SELECT unlocked_at FROM achievements WHERE key = ?').get('memory_keeper') as { unlocked_at: string | null } | undefined
        if (existing && !existing.unlocked_at) {
          db.prepare('UPDATE achievements SET unlocked_at = datetime(\'now\') WHERE key = ?').run('memory_keeper')
          awardXp(100, 'achievement: memory keeper')
        }
      }

      return JSON.stringify({ success: true, id: mem.id, message: `Memory saved: ${input.content}` })
    }

    case 'recall_memories': {
      const query = input.query as string | undefined
      const type = input.type as string | undefined
      const limit = (input.limit as number) ?? 10

      const memories = query
        ? searchMemories(query, limit)
        : getMemories(type, limit)

      if (memories.length === 0) {
        return JSON.stringify({ memories: [], message: 'No memories found yet. Start building context!' })
      }

      return JSON.stringify({
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          tags: m.tags,
          importance: m.importance,
          date: m.created_at,
        })),
      })
    }

    case 'log_opportunity': {
      const opp = saveOpportunity({
        title: input.title as string,
        description: `${input.description as string}${input.action_steps ? `\n\nACTION STEPS:\n${input.action_steps}` : ''}`,
        niche: input.niche as string,
        estimated_value: input.estimated_value as string,
        source: 'chat',
      })
      const xpResult = awardXp(75, 'opportunity logged')
      return JSON.stringify({
        success: true,
        opportunity_id: opp.id,
        xp_gained: 75,
        level_up: xpResult.leveled_up,
        message: `Opportunity logged! +75 XP`,
      })
    }

    case 'update_opportunity': {
      const { updateOpportunityStatus } = await import('./memory')
      updateOpportunityStatus(input.id as number, input.status as 'pursuing' | 'won' | 'lost' | 'passed', input.outcome as string)
      const xp = input.status === 'won' ? 200 : input.status === 'lost' ? 25 : 10
      const xpResult = awardXp(xp, `opportunity ${input.status}`)

      if (input.status === 'won') {
        saveMemory('win', `Won opportunity #${input.id}: ${input.outcome ?? ''}`, ['win', 'success'], 8)
      } else if (input.status === 'lost') {
        saveMemory('loss', `Lost opportunity #${input.id}: ${input.outcome ?? ''}. Lesson: analyze what went wrong.`, ['loss', 'lesson'], 7)
      }

      return JSON.stringify({
        success: true,
        xp_gained: xp,
        level_up: xpResult.leveled_up,
        message: `Updated to ${input.status}. +${xp} XP`,
      })
    }

    case 'get_opportunities': {
      const opps = getOpportunities(input.status as string | undefined, 20)
      return JSON.stringify({ opportunities: opps, total: opps.length })
    }

    case 'search_video_trends': {
      // Returns intelligence based on known patterns — in production, wire to YouTube Data API or a web search API
      const query = input.query as string
      const focus = input.focus as string

      const trends = generateTrendIntelligence(query, focus)
      return JSON.stringify({ intelligence: trends, query, focus, timestamp: new Date().toISOString() })
    }

    case 'get_gamification_state': {
      const state = getState()
      const { getAchievements } = await import('./gamification')
      const achievements = getAchievements()
      return JSON.stringify({ ...state, achievements })
    }

    case 'sync_apple_notes': {
      const db = getDb()
      const search = input.search as string | undefined
      const query = search
        ? `SELECT * FROM apple_notes WHERE content LIKE ? ORDER BY updated_at DESC LIMIT 20`
        : `SELECT * FROM apple_notes ORDER BY updated_at DESC LIMIT 20`

      // Check if table exists
      const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='apple_notes'`).get()
      if (!tableExists) {
        return JSON.stringify({
          notes: [],
          message: 'Apple Notes not synced yet. Use the Notes panel to paste your to-do list, or set up the companion sync script.',
          setup_url: '/notes-setup',
        })
      }

      const rows = search
        ? db.prepare(query).all(`%${search}%`)
        : db.prepare(query).all()

      return JSON.stringify({ notes: rows, count: rows.length })
    }

    case 'add_to_plan': {
      const db = getDb()
      const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='plan_items'`).get()
      if (!tableCheck) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS plan_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            category TEXT DEFAULT 'research',
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )
        `)
      }

      db.prepare(`
        INSERT INTO plan_items (task, priority, category, notes) VALUES (?, ?, ?, ?)
      `).run(input.task, input.priority, input.category, input.notes ?? null)

      return JSON.stringify({ success: true, message: `Added to plan: ${input.task}` })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

function generateTrendIntelligence(query: string, focus: string): object {
  const baseInsights = {
    trending_topics: [
      'AI-generated content controversy & authentic creator responses',
      'Behind-the-scenes "day in the life" formats outperforming polished content',
      'Micro-documentary series (3-7 min) seeing 40% higher retention',
      'Reaction/commentary to viral moments in your niche',
      'Educational content with clear transformation hooks',
    ],
    monetization: [
      'Brand deals in $500-$5k range for creators under 100k subs',
      'Digital product launches (courses, templates) converting at 2-5%',
      'Community/membership tiers via Patreon or Circle',
      'Sponsored segments mid-video outperforming pre-rolls by 3x',
      'Affiliate marketing in tools your audience actually uses',
    ],
    formats: [
      'Talking-head + B-roll hybrid for authority building',
      'Rapid-cut tutorials under 90 seconds for Shorts/Reels repurpose',
      'Listicle format with strong thumbnail optimization',
      'Challenge/experiment formats with built-in suspense',
      'Collab interviews expanding to each other\'s audiences',
    ],
    competitors: [
      'Analyze top performers in your niche for upload frequency',
      'Study thumbnail CTR patterns (face + text + contrast)',
      'Map content gaps — what questions go unanswered?',
      'Track their comment sections for audience pain points',
      'Watch for brand deal disclosures to identify open sponsors',
    ],
    collabs: [
      'Reach out to creators 10-30% larger in your niche',
      'Co-create around shared audience pain points',
      'Guest appearances on podcasts in adjacent niches',
      'Challenge collabs with mutual promotion built in',
      'Creator-to-creator shoutout exchanges',
    ],
    sponsorships: [
      'Tools & SaaS companies seeking creator distribution',
      'Course platforms (Teachable, Kajabi, Skool) pay $500-$3k',
      'Equipment brands for gear-adjacent niches',
      'Software companies targeting your demographic',
      'Direct outreach to brands mentioning competitors in your niche',
    ],
  }

  const relevant = baseInsights[focus as keyof typeof baseInsights] ?? baseInsights.trending_topics

  return {
    query,
    focus,
    insights: relevant,
    action_items: [
      `Research: "${query}" volume on Google Trends and YouTube autocomplete`,
      'Check if top creators have covered this in the last 30 days',
      'Identify the angle that hasn\'t been done to death',
      'Draft a hook that creates curiosity + addresses pain',
    ],
    confidence: 'medium',
    last_updated: new Date().toISOString(),
  }
}
