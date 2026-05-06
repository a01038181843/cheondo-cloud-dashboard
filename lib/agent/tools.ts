// 천도글라스 클라우드 AI 도구 정의
// 로컬 MCP 서버 기능을 Vercel AI SDK tool() 형태로 변환
// 원본 MCP: Notion MCP, GitHub MCP, Google Drive MCP
// 추가: gemini_bridge.py → askGemini tool

import { tool } from 'ai'
import { z } from 'zod'
import { askGemini } from './gemini-tool'

// ─────────────────────────────────────────────
// Notion MCP → AI SDK Tools
// ─────────────────────────────────────────────

export const notionSearch = tool({
  description: 'Notion에서 페이지/데이터베이스를 검색합니다.',
  parameters: z.object({
    query: z.string().describe('검색어'),
    filter: z.enum(['page', 'database']).optional().describe('검색 유형 필터'),
  }),
  execute: async ({ query, filter }) => {
    const body: Record<string, unknown> = { query, page_size: 10 }
    if (filter) body.filter = { value: filter, property: 'object' }

    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify(body),
    })
    return await res.json()
  },
})

export const notionFetchPage = tool({
  description: 'Notion 페이지의 내용을 가져옵니다.',
  parameters: z.object({
    pageId: z.string().describe('Notion 페이지 ID (하이픈 포함)'),
  }),
  execute: async ({ pageId }) => {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: notionHeaders(),
    })
    return await res.json()
  },
})

export const notionQueryDatabase = tool({
  description: 'Notion 데이터베이스를 쿼리합니다. 거래명세서 조회 등에 사용.',
  parameters: z.object({
    databaseId: z.string().describe('데이터베이스 ID'),
    pageSize: z.number().optional().default(10).describe('결과 수'),
    filter: z.record(z.unknown()).optional().describe('Notion 필터 객체'),
    sorts: z.array(z.record(z.unknown())).optional().describe('정렬 조건'),
  }),
  execute: async ({ databaseId, pageSize, filter, sorts }) => {
    const body: Record<string, unknown> = { page_size: pageSize }
    if (filter) body.filter = filter
    if (sorts) body.sorts = sorts

    const res = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: notionHeaders(),
        body: JSON.stringify(body),
      }
    )
    return await res.json()
  },
})

export const notionCreatePage = tool({
  description: 'Notion에 새 페이지(항목)를 생성합니다. 거래명세서 등록 등에 사용.',
  parameters: z.object({
    parentDatabaseId: z.string().describe('상위 데이터베이스 ID'),
    properties: z.record(z.unknown()).describe('Notion 프로퍼티 객체'),
  }),
  execute: async ({ parentDatabaseId, properties }) => {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { database_id: parentDatabaseId },
        properties,
      }),
    })
    return await res.json()
  },
})

export const notionUpdatePage = tool({
  description: 'Notion 페이지의 프로퍼티를 업데이트합니다.',
  parameters: z.object({
    pageId: z.string().describe('업데이트할 페이지 ID'),
    properties: z.record(z.unknown()).describe('변경할 프로퍼티 객체'),
  }),
  execute: async ({ pageId, properties }) => {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({ properties }),
    })
    return await res.json()
  },
})

// ─────────────────────────────────────────────
// GitHub MCP → AI SDK Tools
// ─────────────────────────────────────────────

export const githubGetFile = tool({
  description: 'GitHub 저장소에서 파일 내용을 가져옵니다.',
  parameters: z.object({
    owner: z.string().describe('저장소 소유자'),
    repo: z.string().describe('저장소 이름'),
    path: z.string().describe('파일 경로'),
    ref: z.string().optional().describe('브랜치 또는 커밋 SHA'),
  }),
  execute: async ({ owner, repo, path, ref }) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`
    const res = await fetch(url, { headers: githubHeaders() })
    const data = await res.json()
    if (data.content) {
      data.decodedContent = Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return data
  },
})

export const githubSearchCode = tool({
  description: 'GitHub 저장소 코드를 검색합니다.',
  parameters: z.object({
    q: z.string().describe('검색 쿼리 (예: "glassInventory repo:cheondo/cdm")'),
  }),
  execute: async ({ q }) => {
    const res = await fetch(
      `https://api.github.com/search/code?q=${encodeURIComponent(q)}`,
      { headers: githubHeaders() }
    )
    return await res.json()
  },
})

export const githubCreateIssue = tool({
  description: 'GitHub 이슈를 생성합니다.',
  parameters: z.object({
    owner: z.string(),
    repo: z.string(),
    title: z.string().describe('이슈 제목'),
    body: z.string().describe('이슈 내용'),
    labels: z.array(z.string()).optional(),
  }),
  execute: async ({ owner, repo, title, body, labels }) => {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: githubHeaders(),
        body: JSON.stringify({ title, body, labels }),
      }
    )
    return await res.json()
  },
})

// ─────────────────────────────────────────────
// Google Drive MCP → AI SDK Tools
// ─────────────────────────────────────────────

export const driveSearchFiles = tool({
  description: 'Google Drive에서 파일을 검색합니다.',
  parameters: z.object({
    query: z.string().describe('Drive 검색 쿼리 (예: "name contains \'견적서\'")'),
    pageSize: z.number().optional().default(10),
  }),
  execute: async ({ query, pageSize }) => {
    const accessToken = await getGoogleAccessToken()
    const params = new URLSearchParams({
      q: query,
      pageSize: String(pageSize),
      fields: 'files(id,name,mimeType,createdTime,modifiedTime)',
    })
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    return await res.json()
  },
})

export const driveReadFile = tool({
  description: 'Google Drive 파일의 내용을 읽습니다 (텍스트 파일 전용).',
  parameters: z.object({
    fileId: z.string().describe('Drive 파일 ID'),
  }),
  execute: async ({ fileId }) => {
    const accessToken = await getGoogleAccessToken()
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const text = await res.text()
    return { content: text }
  },
})

// ─────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────

function notionHeaders() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
}

function githubHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// Google OAuth2 액세스 토큰 획득 (서비스 계정 또는 리프레시 토큰 방식)
async function getGoogleAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Google Drive 인증 환경변수가 설정되지 않았습니다.')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  const data = await res.json()
  return data.access_token
}

// 전체 도구 목록 (API route에서 import해서 사용)
export const cheondoTools = {
  // Gemini 브릿지 (gemini_bridge.py 변환)
  askGemini,
  // Notion MCP 변환
  notionSearch,
  notionFetchPage,
  notionQueryDatabase,
  notionCreatePage,
  notionUpdatePage,
  // GitHub MCP 변환
  githubGetFile,
  githubSearchCode,
  githubCreateIssue,
  // Google Drive MCP 변환
  driveSearchFiles,
  driveReadFile,
}
