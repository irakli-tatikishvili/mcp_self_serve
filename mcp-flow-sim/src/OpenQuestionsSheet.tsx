import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mcp-flow-sim-open-questions-v1'

export type QAItem = {
  id: string
  question: string
  answer: string
  createdAt: string
}

function seedRows(): QAItem[] {
  const now = new Date().toISOString()
  const questions = [
    'No-CC trial: MCP scope, coin budget, eligible endpoints, reset cadence?',
    'CC trial: parity with which paid tier cap? Overage before conversion?',
    'Paid: coexistence / messaging for legacy Excel credits vs coins?',
    'Enterprise vs self-serve MCP parity?',
    'Agency defaults for pooled allocations?',
    'LLM quota errors: deep-link to buy vs re-allocate first?',
  ]
  return questions.map((question, i) => ({
    id: `seed-${i}-${now.slice(0, 10)}`,
    question,
    answer: '',
    createdAt: now,
  }))
}

function loadInitial(): QAItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (x): x is QAItem =>
            typeof x === 'object' &&
            x !== null &&
            'id' in x &&
            'question' in x &&
            'answer' in x &&
            typeof (x as QAItem).id === 'string',
        )
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return seedRows()
}

export function OpenQuestionsSheet() {
  const [rows, setRows] = useState<QAItem[]>(loadInitial)
  const [draftQuestion, setDraftQuestion] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
    } catch {
      /* quota / private mode */
    }
  }, [rows])

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

  return (
    <div className="qs-sheet">
      <p className="qs-lead">
        Capture open decisions as a living sheet. Everything is stored in{' '}
        <code className="qs-code">localStorage</code> on this browser ({STORAGE_KEY}).
      </p>

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
