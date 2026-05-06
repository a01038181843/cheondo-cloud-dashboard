# -*- coding: utf-8 -*-
"""
gemini_bridge.py - 천도글라스 Gemini API 통신 전용 모듈
업무 로직과 완전히 분리된 통신 레이어입니다.
ask_gemini(prompt) 함수만 호출하면 어떤 용도로든 재사용 가능합니다.

[클라우드 참고] Vercel 환경에서는 이 파일을 직접 실행할 수 없습니다.
대신 lib/agent/tools.ts 의 askGemini tool을 사용하세요.
"""

import os
from pathlib import Path
from google import genai
from dotenv import load_dotenv

# 1순위: 현재 프로젝트 폴더 .env
# 2순위: 스킬 폴더 전역 .env (새 프로젝트에서 .env 없어도 동작)
_SKILL_ENV = Path.home() / ".claude/skills/cheondo-harness/.env"
load_dotenv()
if not os.getenv("GEMINI_API_KEY") and _SKILL_ENV.exists():
    load_dotenv(_SKILL_ENV)

# 현재 Google AI에서 제공하는 최고 성능 모델 우선순위
_MODEL_CANDIDATES = [
    "gemini-3.1-pro-preview",          # 최신 최고 성능 Pro
    "gemini-2.5-flash",                # 2.5 Flash (안정)
    "gemini-2.0-flash",                # 2.0 Flash (최종 폴백)
]

_client = None


def _get_client():
    """클라이언트를 초기화하고 반환합니다 (최초 1회)."""
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            ".env 파일에 GEMINI_API_KEY가 설정되어 있지 않습니다.\n"
            "Google AI Studio(aistudio.google.com)에서 키를 발급받아 .env에 저장하세요."
        )

    _client = genai.Client(api_key=api_key)
    return _client


def ask_gemini(prompt: str, model_name: str = None) -> str:
    """
    Gemini에게 질문을 보내고 텍스트 답변을 반환합니다.

    Args:
        prompt: 전달할 질문 또는 지시문
        model_name: 사용할 모델명 (None 이면 최신 모델 자동 선택)

    Returns:
        Gemini 텍스트 응답 문자열

    Raises:
        EnvironmentError: API 키 미설정 시
        ValueError: 빈 프롬프트 입력 시
        RuntimeError: 모든 모델 호출 실패 시
    """
    if not prompt or not prompt.strip():
        raise ValueError("질문(prompt)이 비어 있습니다. 내용을 입력해 주세요.")

    client = _get_client()

    candidates = [model_name] if model_name else _MODEL_CANDIDATES
    last_error = None

    for candidate in candidates:
        try:
            response = client.models.generate_content(
                model=candidate,
                contents=prompt,
            )

            if not response or not response.text:
                raise ValueError("Gemini가 빈 응답을 반환했습니다.")

            return response.text.strip()

        except Exception as exc:
            msg = str(exc)

            # 할당량 초과 - 모델별 한도면 다음 모델로 폴백, 전체 한도면 중단
            if "429" in msg or "quota" in msg.lower() or "resource_exhausted" in msg.lower():
                last_error = exc
                continue  # 다음 모델로 폴백 시도

            # 인증/키 오류 - 즉시 중단
            if "403" in msg or "permission_denied" in msg.lower() or "api key" in msg.lower():
                raise RuntimeError(
                    f"API 키 오류입니다. .env 파일의 GEMINI_API_KEY를 확인해 주세요.\n원인: {exc}"
                )

            # 네트워크 오류 - 즉시 중단
            if any(k in msg.lower() for k in ["connection", "timeout", "network", "ssl"]):
                raise RuntimeError(
                    f"인터넷 연결을 확인해 주세요. Gemini 서버에 접속할 수 없습니다.\n원인: {exc}"
                )

            # 모델 미존재(404) - 다음 후보로 폴백
            last_error = exc
            continue

    raise RuntimeError(
        f"사용 가능한 모든 Gemini 모델 호출에 실패했습니다.\n"
        f"시도한 모델: {candidates}\n마지막 오류: {last_error}"
    )
