import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'mcp-flow-sim-team-actions-v1'

type TeamId = 'pricing' | 'platform' | 'monetization' | 'expansion' | 'security'

type ActionRow = { id: string; text: string }

const TEAM_LABELS: Record<TeamId, string> = {
  pricing: 'Pricing & packaging',
  platform: 'Cross-team (platform / credits)',
  monetization: 'Monetization',
  expansion: 'Expansion',
  security: 'Security',
}

const DEFAULT_TEXT: Record<TeamId, string[]> = {
  pricing: [
    'Define MCP inclusion per tier and trial variants',
    'Size base coin bundles vs. $199 / $399 / $649 SKUs',
    'Define add-on packs & overage rules',
  ],
  platform: [
    'Unify metering as one coin across REST, Batch, Studio, MCP',
    'Deep-link Account Settings from checkout, trials, LLM auth',
    'Ensure paid base includes MCP + upgrade path for coins',
  ],
  monetization: [
    'Paywalls & upgrade flows at 80% / 100% usage',
    'Billing for coin packs; invoice reconciliation',
    'In-product + email + LLM-surface triggers',
  ],
  expansion: [
    'Add-on purchase funnels & post-buy allocation',
    'LLM error copy with recoverable CTAs',
    'Campaigns for high-burn NT cohorts (NT → T)',
  ],
  security: [
    'MCP abuse: rate limits, anomaly detection, revoke UX',
    'LLM redirect / OAuth trust boundaries',
    'Key rotation, audit parity MCP vs REST',
  ],
}

function rowsFromStrings(lines: string[]): ActionRow[] {
  return lines.map((text) => ({ id: crypto.randomUUID(), text }))
}

function defaultState(): Record<TeamId, ActionRow[]> {
  return (Object.keys(DEFAULT_TEXT) as TeamId[]).reduce(
    (acc, id) => {
      acc[id] = rowsFromStrings(DEFAULT_TEXT[id])
      return acc
    },
    {} as Record<TeamId, ActionRow[]>,
  )
}

function normalizeLoaded(raw: unknown): Record<TeamId, ActionRow[]> | null {
  if (!raw || typeof raw !== 'object') return null
  const out = {} as Record<TeamId, ActionRow[]>
  for (const id of Object.keys(TEAM_LABELS) as TeamId[]) {
    const v = (raw as Record<string, unknown>)[id]
    if (!Array.isArray(v)) return null
    const rows: ActionRow[] = []
    for (const entry of v) {
      if (typeof entry === 'string') {
        rows.push({ id: crypto.randomUUID(), text: entry })
      } else if (entry && typeof entry === 'object' && 'text' in entry && typeof (entry as ActionRow).text === 'string') {
        const r = entry as ActionRow
        rows.push({ id: typeof r.id === 'string' ? r.id : crypto.randomUUID(), text: r.text })
      }
    }
    out[id] = rows
  }
  return out
}

function loadInitial(): Record<TeamId, ActionRow[]> {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown
      const norm = normalizeLoaded(parsed)
      if (norm) return norm
    }
  } catch {
    /* ignore */
  }
  return defaultState()
}

export function TeamActionsBoard() {
  const [byTeam, setByTeam] = useState<Record<TeamId, ActionRow[]>>(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(byTeam))
    } catch {
      /* quota */
    }
  }, [byTeam])

  const updateText = useCallback((teamId: TeamId, rowId: string, text: string) => {
    setByTeam((prev) => ({
      ...prev,
      [teamId]: prev[teamId].map((r) => (r.id === rowId ? { ...r, text } : r)),
    }))
  }, [])

  const addRow = useCallback((teamId: TeamId) => {
    setByTeam((prev) => ({
      ...prev,
      [teamId]: [...prev[teamId], { id: crypto.randomUUID(), text: '' }],
    }))
  }, [])

  const removeRow = useCallback((teamId: TeamId, rowId: string) => {
    setByTeam((prev) => ({
      ...prev,
      [teamId]: prev[teamId].filter((r) => r.id !== rowId),
    }))
  }, [])

  const resetTeam = useCallback((teamId: TeamId) => {
    setByTeam((prev) => ({
      ...prev,
      [teamId]: rowsFromStrings(DEFAULT_TEXT[teamId]),
    }))
  }, [])

  return (
    <div className="team-actions-board">
      <p className="team-actions-meta">
        Edits save automatically in <code className="qs-code">{STORAGE_KEY}</code>.
      </p>
      <div className="team-grid-doc">
        {(Object.keys(TEAM_LABELS) as TeamId[]).map((teamId) => (
          <div key={teamId} className="team-card-doc team-card-doc--editable">
            <div className="team-card-doc-head">
              <h3>{TEAM_LABELS[teamId]}</h3>
              <button
                type="button"
                className="team-card-reset"
                onClick={() => {
                  if (window.confirm(`Reset “${TEAM_LABELS[teamId]}” to default starter items?`)) {
                    resetTeam(teamId)
                  }
                }}
              >
                Reset defaults
              </button>
            </div>
            <ul className="team-actions-items">
              {byTeam[teamId].map((row) => (
                <li key={row.id} className="team-actions-row">
                  <input
                    type="text"
                    className="team-actions-input"
                    aria-label={`${TEAM_LABELS[teamId]} action`}
                    value={row.text}
                    onChange={(e) => updateText(teamId, row.id, e.target.value)}
                    placeholder="Action item…"
                  />
                  <button
                    type="button"
                    className="team-actions-remove"
                    title="Remove item"
                    onClick={() => removeRow(teamId, row.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="team-actions-add" onClick={() => addRow(teamId)}>
              + Add item
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
