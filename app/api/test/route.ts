// 임시 디버그 엔드포인트 — 실제 에러 확인용
export async function GET() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY 없음' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 50,
        messages: [{ role: 'user', content: '안녕' }],
      }),
    })

    const data = await res.json()
    return Response.json({ status: res.status, data })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
