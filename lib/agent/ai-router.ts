// ai_router.py → TypeScript 변환판
// 프롬프트 키워드 기반으로 Gemini / Claude 분기 결정

// ai_router.py 의 키워드 목록과 동기화 유지
const GEMINI_KEYWORDS = [
  '문구', '초안', '작성해줘', '써줘', '번역', '교정', '요약',
  '이메일', '문자', '안내문', '공지', '견적서 문구', '설명해줘',
  '어떻게 생각', '추천해줘', '뭐가 좋아', '차이가 뭐야',
  '정리해줘', '리스트', '목록', '장단점',
]

const CLAUDE_KEYWORDS = [
  '코드', '프로그램', '버그', '오류', '에러', '함수', '개발',
  '설계', '아키텍처', '자동화', '스크립트', '파이썬', 'html',
  '디버그', '수정해줘', '고쳐줘', '만들어줘',
]

export type AIModel = 'gemini' | 'claude'

// 프롬프트 분석 후 처리할 AI 모델 결정
export function decideModel(prompt: string): AIModel {
  const lower = prompt.toLowerCase()
  const hasClaude = CLAUDE_KEYWORDS.some(k => lower.includes(k))
  const hasGemini = GEMINI_KEYWORDS.some(k => lower.includes(k))

  if (hasClaude) return 'claude'
  if (hasGemini) return 'gemini'
  return 'gemini' // 기본값: 무료 우선
}

// 시스템 프롬프트에 현재 라우팅 결정 컨텍스트 추가
export function buildRoutingHint(prompt: string): string {
  const model = decideModel(prompt)
  if (model === 'gemini') {
    return '\n[라우터 힌트] 이 질문은 Gemini 처리 권장 (단순 작업). askGemini 도구를 먼저 시도하세요.'
  }
  return ''
}
