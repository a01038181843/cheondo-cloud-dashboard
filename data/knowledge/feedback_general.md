---
name: 일반 피드백 및 규칙
type: feedback
---

**MCP 상태 확인**
MCP 관련 질문 시 추측 금지. 현재 연결 상태를 먼저 확인한다.
Why: GitHub MCP가 이미 연결돼 있었는데 "빠진 것"으로 잘못 보고한 사례 있음.

**플러그인 비활성화 유지**
explanatory-output-style, learning-output-style 플러그인 재활성화 금지.
Why: 장황한 설명을 유도하여 "짧고 핵심만" 선호와 충돌.

**메모리는 갱신 우선**
새 정보는 기존 내용 덮어쓰기. 완료된 프로젝트는 삭제. 추가보다 갱신 우선.

**스킬 자동 실행**
트리거 조건에 해당하면 사용자가 요청하지 않아도 자동으로 스킬 실행.

**Windows BAT 관리자 권한**
VBS 방식 절대 금지. 반드시 PowerShell 방식 사용.
`PowerShell -Command "Start-Process -FilePath '%~s0' -Verb RunAs"`
Why: 한국어/공백 포함 경로에서 VBS가 UAC 창 없이 조용히 실패함.
