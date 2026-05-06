// gemini_bridge.py → Vercel AI SDK 변환판
// Google Gemini API를 Vercel 서버리스 환경에서 호출하는 tool

import { tool } from 'ai'
import { z } from 'zod'

// gemini_bridge.py 의 _MODEL_CANDIDATES와 동기화
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

export const askGemini = tool({
  description:
    '천도글라스 Gemini AI에게 질문을 보내고 답변을 받습니다. ' +
    '견적서 문구 작성, 이메일 초안, 번역, 요약 등 단순 반복 작업에 사용합니다.',
  parameters: z.object({
    prompt: z.string().describe('Gemini에게 전달할 질문 또는 지시문'),
    model: z.string().optional().describe('사용할 모델명 (기본값: 자동 선택)'),
  }),
  execute: async ({ prompt, model }) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { error: 'GEMINI_API_KEY가 .env.local에 설정되지 않았습니다.' }
    }

    const candidates = model ? [model] : MODEL_CANDIDATES
    let lastError = ''

    for (const candidate of candidates) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        )

        if (!res.ok) {
          lastError = `${candidate}: HTTP ${res.status}`
          continue
        }

        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
          lastError = `${candidate}: 빈 응답`
          continue
        }

        return { model: candidate, answer: text.trim() }
      } catch (err) {
        lastError = `${candidate}: ${err}`
        continue
      }
    }

    return { error: `모든 Gemini 모델 호출 실패. 마지막 오류: ${lastError}` }
  },
})
