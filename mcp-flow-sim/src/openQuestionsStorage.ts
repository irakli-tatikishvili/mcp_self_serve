/** On-disk + API payload shape (see /data/open-questions.json) */
export const OPEN_QUESTIONS_FORMAT_VERSION = 1

export type QAItem = {
  id: string
  question: string
  answer: string
  createdAt: string
}

export type OpenQuestionsJsonFile = {
  version: number
  updatedAt: string
  rows: QAItem[]
}

export const OPEN_QUESTIONS_API = '/api/open-questions' as const

/** Bundled copy of `data/open-questions.json` at site root (production / Netlify). */
export const OPEN_QUESTIONS_STATIC_PATH = '/open-questions.json' as const

export function isQAItem(x: unknown): x is QAItem {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as QAItem).id === 'string' &&
    typeof (x as QAItem).question === 'string' &&
    typeof (x as QAItem).answer === 'string' &&
    typeof (x as QAItem).createdAt === 'string'
  )
}

/** Parse body of data/open-questions.json */
export function rowsFromOpenQuestionsFile(raw: unknown): QAItem[] | null {
  if (!raw || typeof raw !== 'object') return null
  const rows = (raw as OpenQuestionsJsonFile).rows
  if (!Array.isArray(rows)) return null
  const out = rows.filter(isQAItem)
  return out
}

/** Parse JSON body from PUT /api/open-questions */
export function rowsFromPutBody(raw: unknown): QAItem[] | null {
  if (!raw || typeof raw !== 'object') return null
  const rows = (raw as { rows?: unknown }).rows
  if (!Array.isArray(rows)) return null
  const out = rows.filter(isQAItem)
  if (out.length !== rows.length) return null
  return out
}

export function buildOpenQuestionsFile(rows: QAItem[]): OpenQuestionsJsonFile {
  return {
    version: OPEN_QUESTIONS_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
    rows,
  }
}

export function defaultSeedRows(): QAItem[] {
  const now = new Date().toISOString()
  const questions = [
    'Can we have daily limits? Mainly for CC wall users',
    'Communication to existing users — 3.0 vs 4.0',
    'Enterprise vs self-serve MCP parity?',
    'LLM quota errors limit reach - How do we manage?',
  ]
  return questions.map((question, i) => ({
    id: `seed-${i}-${now.slice(0, 10)}`,
    question,
    answer: '',
    createdAt: now,
  }))
}
