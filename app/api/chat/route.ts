// 천도글라스 클라우드 에이전트 — 메인 채팅 API Route
// Vercel AI SDK streamText + 통합 시스템 프롬프트 + 변환된 MCP 도구

import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { buildSystemPromptWithKnowledge } from '@/lib/agent/system-prompt'
import { cheondoTools } from '@/lib/agent/tools'
import { loadKnowledgeBase } from '@/lib/knowledge/loader'
import { buildRoutingHint } from '@/lib/agent/ai-router'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()

  // 지식 기반 로드 (data/knowledge/*.md)
  const knowledgeBase = await loadKnowledgeBase()
  const basePrompt = buildSystemPromptWithKnowledge(knowledgeBase)

  // 마지막 사용자 메시지로 Gemini/Claude 라우팅 힌트 생성 (ai_router.py 변환)
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
}
