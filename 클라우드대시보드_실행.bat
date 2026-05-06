@echo off
chcp 65001 > nul
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8

echo ======================================
echo  천도글라스 클라우드 대시보드 시작
echo ======================================
echo.

:: .env.local 파일 존재 확인
if not exist ".env.local" (
  echo [오류] .env.local 파일이 없습니다!
  echo .env.local.example 을 복사하고 API 키를 입력하세요.
  echo.
  echo 복사 명령어:
  echo   copy .env.local.example .env.local
  echo.
  pause
  exit /b 1
)

:: node_modules 확인 및 설치
if not exist "node_modules" (
  echo [설치] npm 패키지 설치 중... 잠시 기다려 주세요.
  npm install
  if errorlevel 1 (
    echo [오류] npm install 실패. Node.js가 설치되어 있는지 확인하세요.
    pause
    exit /b 1
  )
)

echo [시작] 개발 서버를 시작합니다...
echo 브라우저에서 http://localhost:3000 을 열어주세요.
echo 종료하려면 Ctrl+C 를 누르세요.
echo.
npm run dev

pause
