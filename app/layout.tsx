import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '천도글라스 클라우드 대시보드',
  description: '천도글라스 전용 AI 에이전트 클라우드 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
