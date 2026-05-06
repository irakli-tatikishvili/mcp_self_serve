import { useCallback, useEffect, useRef, useState } from 'react'
import {
  OPEN_QUESTIONS_API,
  OPEN_QUESTIONS_STATIC_PATH,
  defaultSeedRows,
  isQAItem,
  type QAItem,
  rowsFromOpenQuestionsFile,
} from './openQuestionsStorage'

const STORAGE_KEY = 'mcp-flow-sim-open-questions-v2'
const SAVE_DEBOUNCE_MS = 450

function loadFromLocalStorage(): QAItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const rows = parsed.filter(isQAItem)
    return rows.length ? rows : null
  } catch {
    return null
  }
}

/** Netlify SPA rewrite can accidentally return index.html — reject non-JSON bodies. */
async function fetchStaticOpenQuestionsFile(): Promise<unknown> {
  const r = await fetch(OPEN_QUESTIONS_STATIC_PATH, { cache: 'no-cache' })
  if (!r.ok) throw new Error(String(r.status))
  const text = await r.text()
  const t = text.trimStart()
  if (t.startsWith('<') || !t.startsWith('{')) throw new Error('not json')
  return JSON.parse(text) as unknown
}
function mergeDeployedRowsWithLocal(stored: QAItem[], local: QAItem[] | null): QAItem[] {
  if (!local?.length) return stored
  const localById = new Map(local.map((r) => [r.id, r]))
  const merged = stored.map((r) => {
    const L = localById.get(r.id)
    return L ? { ...r, question: L.question, answer: L.answer } : r
  })
  const storedIds = new Set(stored.map((r) => r.id))
  const extras = local.filter((r) => !storedIds.has(r.id))
  return [...merged, ...extras]
}

export function OpenQuestionsSheet() {
  const [rows, setRows] = useState<QAItem[]>([])
  const [ready, setReady] = useState(false)
  const [persistFile, setPersistFile] = useState(false)
  const [source, setSource] = useState<'dev' | 'deploy' | 'local'>('local')
  const [lastFileWrite, setLastFileWrite] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const r = await fetch(OPEN_QUESTIONS_API)
        if (!r.ok) throw new Error(String(r.status))
        const data: unknown = await r.json()
        const parsedRows = rowsFromOpenQuestionsFile(data)
        if (parsedRows === null) throw new Error('bad shape')
        if (cancelled) return
        setRows(parsedRows)
        if (
          data &&
          typeof data === 'object' &&
          'updatedAt' in data &&
          typeof (data as { updatedAt: unknown }).updatedAt === 'string'
        ) {
          setLastFileWrite((data as { updatedAt: string }).updatedAt)
        }
        setSource('dev')
        setPersistFile(true)
      } catch {
        try {
          const data = await fetchStaticOpenQuestionsFile()
          const parsedRows = rowsFromOpenQuestionsFile(data)
          if (parsedRows === null) throw new Error('bad shape')
          if (cancelled) return
          setRows(mergeDeployedRowsWithLocal(parsedRows, loadFromLocalStorage()))
          if (
            data &&
            typeof data === 'object' &&
            'updatedAt' in data &&
            typeof (data as { updatedAt: unknown }).updatedAt === 'string'
          ) {
            setLastFileWrite((data as { updatedAt: string }).updatedAt)
          }
          setSource('deploy')
          setPersistFile(false)
        } catch {
          if (!cancelled) {
            setRows(loadFromLocalStorage() ?? defaultSeedRows())
            setSource('local')
            setPersistFile(false)
            setLastFileWrite(null)
          }
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    } catch {
      /* quota / private mode */
    }
  }, [rows, ready])

  useEffect(() => {
    if (!ready || !persistFile) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      ;(async () => {
        try {
          const r = await fetch(OPEN_QUESTIONS_API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows }),
          })
          if (!r.ok) return
          const data: unknown = await r.json()
          if (
            data &&
            typeof data === 'object' &&
            'updatedAt' in data &&
            typeof (data as { updatedAt: unknown }).updatedAt === 'string'
          ) {
            setLastFileWrite((data as { updatedAt: string }).updatedAt)
          }
        } catch {
          /* dev server stopped, offline */
        }
      })()
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(saveTimer.current)
  }, [rows, ready, persistFile])

  const [draftQuestion, setDraftQuestion] = useState('')

  const addRow = useCallback(() => {
    const q = draftQuestion.trim()
    if (!q) return
    const row: QAItem = {
      id: crypto.randomUUID(),
      question: q,
      answer: '',
      createdAt: new Date().toISOString(),
    }
    setRows((prev) => [...prev, row])
    setDraftQuestion('')
  }, [draftQuestion])

  const updateAnswer = useCallback((id: string, answer: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, answer } : r)))
  }, [])

  const updateQuestion = useCallback((id: string, question: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, question } : r)))
  }, [])

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  if (!ready) {
    return (
      <div className="qs-sheet">
        <p className="qs-lead qs-loading">Loading open questions…</p>
      </div>
    )
  }

  return (
    <div className="qs-sheet">
      <p className="qs-lead">
        {source === 'dev' ? (
          <>
            With <code className="qs-code">npm run dev</code>, edits sync to{' '}
            <code className="qs-code">data/open-questions.json</code> (commit that file to save in
            git). A copy is also kept in <code className="qs-code">localStorage</code> (
            {STORAGE_KEY}).
          </>
        ) : source === 'deploy' ? (
          <>
            Question list is loaded from <code className="qs-code">open-questions.json</code> bundled
            with this deploy (same content as <code className="qs-code">data/open-questions.json</code>{' '}
            at build time). Your edits here stay in <code className="qs-code">localStorage</code> on
            this browser; redeploy after you commit JSON changes to update the default list for
            everyone.
          </>
        ) : (
          <>
            Could not load the deployed question file. Showing{' '}
            <code className="qs-code">localStorage</code> ({STORAGE_KEY}) or built-in defaults.
          </>
        )}
      </p>
      {(source === 'dev' || source === 'deploy') && lastFileWrite && (
        <p className="qs-file-meta">
          {source === 'deploy' ? 'Snapshot ' : 'Last written to disk: '}
          <time dateTime={lastFileWrite}>{new Date(lastFileWrite).toLocaleString()}</time>
        </p>
      )}

      <div className="qs-toolbar">
        <div className="qs-add">
          <label className="qs-label" htmlFor="qs-new-q">
            New question
          </label>
          <textarea
            id="qs-new-q"
            className="qs-input qs-input-question"
            rows={2}
            placeholder="e.g. What coin bundle ships with the $399 tier for CC trials?"
            value={draftQuestion}
            onChange={(e) => setDraftQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                addRow()
              }
            }}
          />
          <div className="qs-add-actions">
            <button type="button" className="qs-btn qs-btn-primary" onClick={addRow}>
              Add row
            </button>
            <span className="qs-hint">Ctrl/⌘ + Enter to add</span>
          </div>
        </div>
      </div>

      <div className="qs-table-wrap">
        <table className="qs-table">
          <thead>
            <tr>
              <th className="qs-col-n">#</th>
              <th className="qs-col-q">Question</th>
              <th className="qs-col-a">Answer / notes</th>
              <th className="qs-col-actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="qs-empty">
                  No rows yet. Add a question above.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="qs-col-n">{i + 1}</td>
                  <td className="qs-col-q">
                    <textarea
                      className="qs-cell qs-cell-q"
                      aria-label={`Question ${i + 1}`}
                      value={row.question}
                      onChange={(e) => updateQuestion(row.id, e.target.value)}
                      rows={3}
                    />
                  </td>
                  <td className="qs-col-a">
                    <textarea
                      className="qs-cell qs-cell-a"
                      aria-label={`Answer ${i + 1}`}
                      placeholder="Decision, owner, link to doc…"
                      value={row.answer}
                      onChange={(e) => updateAnswer(row.id, e.target.value)}
                      rows={3}
                    />
                  </td>
                  <td className="qs-col-actions">
                    <button
                      type="button"
                      className="qs-icon-btn"
                      title="Delete row"
                      onClick={() => deleteRow(row.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
