'use client'

// 천도글라스 클라우드 에이전트 채팅 컴포넌트
import { useChat } from 'ai/react'
import { useRef, useEffect } from 'react'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* 헤더 */}
      <header
        className="px-6 py-4 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: '#F0A500', color: '#1E3A5F' }}
        >
          천
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-tight">천도글라스 AI 에이전트</h1>
          <p className="text-blue-200 text-xs">클라우드 대시보드 v1.0</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 text-xs">연결됨</span>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-16 space-y-3">
            <div className="text-4xl">🏗️</div>
            <p className="text-gray-500 text-sm">
              안녕하세요 대표님! 무엇을 도와드릴까요?
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto mt-4">
              {['유리 수량 산출', 'Notion 거래명세서', '현장 현황 조회', '자재 재고 확인'].map(label => (
                <button
                  key={label}
                  onClick={() => handleInputChange({ target: { value: label } } as React.ChangeEvent<HTMLInputElement>)}
                  className="text-xs px-3 py-2 rounded-lg border text-left hover:bg-blue-50 transition-colors"
                  style={{ borderColor: '#2E86AB', color: '#1E3A5F' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mr-2 mt-0.5"
                style={{ backgroundColor: '#1E3A5F', color: '#F0A500' }}
              >
                AI
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'text-gray-800 rounded-bl-sm shadow-sm'
              }`}
              style={
                msg.role === 'user'
                  ? { backgroundColor: '#2E86AB' }
                  : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mr-2"
              style={{ backgroundColor: '#1E3A5F', color: '#F0A500' }}
            >
              AI
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 text-sm py-2">
            오류가 발생했습니다. 다시 시도해주세요.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t bg-white flex gap-2 items-end"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="메시지를 입력하세요..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none resize-none disabled:opacity-50"
          style={{ borderColor: '#2E86AB' }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: '#1E3A5F' }}
        >
          전송
        </button>
      </form>
    </div>
  )
}
