import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { buildSystemPromptWithKnowledge } from '@/lib/agent/system-prompt'
import { cheondoTools } from '@/lib/agent/tools'
import { loadKnowledgeBase } from '@/lib/knowledge/loader'
import { buildRoutingHint } from '@/lib/agent/ai-router'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    const knowledgeBase = await loadKnowledgeBase()
    const basePrompt = buildSystemPromptWithKnowledge(knowledgeBase)

    const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').at(-1)?.content ?? ''
    const routingHint = buildRoutingHint(lastUserMsg)
    const systemPrompt = basePrompt + routingHint

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages,
      tools: cheondoTools,
      maxSteps: 5,
    })

    return result.toDataStreamResponse()
  } catch (err) {
    console.error('[chat/route] 오류:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
