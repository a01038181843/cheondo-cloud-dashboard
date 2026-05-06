// 천도글라스 지식 기반 로더
// /data/knowledge/ 폴더의 .md 파일들을 읽어 시스템 프롬프트에 주입

import fs from 'fs'
import path from 'path'

const KNOWLEDGE_DIR = path.join(process.cwd(), 'data', 'knowledge')

interface KnowledgeFile {
  name: string
  content: string
}

// 모든 .md 파일을 읽어 하나의 문자열로 합침
export async function loadKnowledgeBase(): Promise<string> {
  try {
    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'))

    const entries: KnowledgeFile[] = files.map(filename => {
      const filePath = path.join(KNOWLEDGE_DIR, filename)
      const raw = fs.readFileSync(filePath, 'utf-8')
      // frontmatter(--- 블록) 제거 후 본문만 추출
      const body = raw.replace(/^---[\s\S]*?---\n/, '').trim()
      return { name: filename.replace('.md', ''), content: body }
    })

    return entries
      .map(e => `### ${e.name}\n${e.content}`)
      .join('\n\n---\n\n')
  } catch {
    // 파일 읽기 실패 시 빈 문자열 반환 (에이전트는 내장 프롬프트만으로 동작)
    return ''
  }
}

// 특정 파일 하나만 읽기 (업데이트용)
export function readKnowledgeFile(filename: string): string {
  const filePath = path.join(KNOWLEDGE_DIR, filename)
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

// 지식 기반 파일 목록 반환
export function listKnowledgeFiles(): string[] {
  try {
    return fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'))
  } catch {
    return []
  }
}
