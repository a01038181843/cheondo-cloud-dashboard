---
name: 천도글라스 프로젝트 현황
type: project
---

## CAD 유리물량 자동산출
- 상태: 완성 (production-ready)
- 메인 파일: glass_calculator.py v2.0 (GUI + 파서 + Excel 4시트 출력)
- 남은 작업: 치수 미확인 항목(2AW×14, 3AW×1 등) 수동 입력 필요

## 천도글라스 사내 메신저 앱 (CDM)
- 상태: 소스코드 완성, 빌드 대기 중
- 기술: React Native 0.74 + Firebase + Redux Toolkit
- 빌드 전 해결 필요:
  1. Java 8 → Java 17 업그레이드
  2. ANDROID_HOME 환경변수 설정
  3. Firebase google-services.json 필요

## Notion 연동
- 상태: MCP 서버 연결 완료, 기본 DB 구조 셋업됨
- 중앙안전유리 거래명세서 DB 운영 중

## 천도글라스 클라우드 대시보드 (이 프로젝트)
- 상태: 뼈대 구축 중 (2026-05-06)
- 기술: Next.js 15 + Vercel AI SDK + Anthropic Claude
- 목적: 로컬 Claude Code 환경의 모든 자산을 클라우드로 이식
