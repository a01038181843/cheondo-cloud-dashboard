# -*- coding: utf-8 -*-
"""
ai_router.py - 천도글라스 AI 라우터
작업 종류에 따라 Gemini(무료) 또는 Claude(유료)로 자동 분기합니다.
외부에서는 ask(prompt) 함수 하나만 호출하면 됩니다.

[클라우드 참고] Vercel 환경에서는 이 로직이 lib/agent/ai-router.ts 로 변환됩니다.
라우팅 키워드 목록을 변경하려면 두 파일 모두 동기화하세요.
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from gemini_bridge import ask_gemini

# Gemini로 처리할 작업 키워드 (단순 반복 작업)
_GEMINI_KEYWORDS = [
    "문구", "초안", "작성해줘", "써줘", "번역", "교정", "요약",
    "이메일", "문자", "안내문", "공지", "견적서 문구", "설명해줘",
    "어떻게 생각", "추천해줘", "뭐가 좋아", "차이가 뭐야",
    "정리해줘", "리스트", "목록", "장단점",
]

# Claude로 처리해야 할 작업 키워드 (복잡한 작업)
_CLAUDE_KEYWORDS = [
    "코드", "프로그램", "버그", "오류", "에러", "함수", "개발",
    "설계", "아키텍처", "자동화", "스크립트", "파이썬", "html",
    "디버그", "수정해줘", "고쳐줘", "만들어줘",
]


def decide(prompt: str) -> str:
    """
    프롬프트를 분석하여 'gemini' 또는 'claude'를 반환합니다.
    - Claude 키워드가 있으면 → claude
    - Gemini 키워드가 있으면 → gemini
    - 둘 다 없으면 → gemini (무료 우선)
    - 둘 다 있으면 → claude (복잡한 작업 우선)
    """
    lower = prompt.lower()
    has_claude = any(k in lower for k in _CLAUDE_KEYWORDS)
    has_gemini = any(k in lower for k in _GEMINI_KEYWORDS)

    if has_claude:
        return "claude"
    if has_gemini:
        return "gemini"
    return "gemini"  # 기본값: 무료 우선


def ask(prompt: str) -> dict:
    """
    작업을 자동으로 분기하여 처리하고 결과를 반환합니다.

    Returns:
        {
            "model": "gemini" 또는 "claude",
            "answer": 답변 문자열 (Gemini인 경우),
            "route_to_claude": True/False
        }
    """
    if not prompt or not prompt.strip():
        raise ValueError("질문이 비어 있습니다.")

    model = decide(prompt)

    if model == "gemini":
        try:
            answer = ask_gemini(prompt)
            return {"model": "gemini", "answer": answer, "route_to_claude": False}
        except Exception as exc:
            # Gemini 실패 시 Claude로 자동 폴백
            return {
                "model": "claude (gemini 실패로 폴백)",
                "answer": None,
                "route_to_claude": True,
                "fallback_reason": str(exc),
            }

    # Claude 작업은 Claude Code가 직접 처리
    return {"model": "claude", "answer": None, "route_to_claude": True}


if __name__ == "__main__":
    tests = [
        "견적서 문구 초안 써줘",
        "고객한테 보낼 이메일 작성해줘",
        "유리 수량 산출 프로그램 만들어줘",
        "복층유리와 로이유리 차이가 뭐야",
        "파이썬 코드 버그 고쳐줘",
    ]

    print("=" * 60)
    print("  천도글라스 AI 라우터 테스트")
    print("=" * 60)

    for prompt in tests:
        result = ask(prompt)
        if result["route_to_claude"]:
            print(f"[Claude] {prompt}")
        else:
            print(f"[Gemini] {prompt}")
            print(f"         → {result['answer'][:60]}...")
        print()
