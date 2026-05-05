import { useCallback, useEffect, useMemo, useState } from 'react'
import './simulator.css'

export type SimMode = 'site' | 'llm'
type Entry = 'site' | 'llm'
type Step = 'llm' | 'auth' | 'pricing' | 'rest' | 'credits' | 'limits'

type PlanId = '199' | '399' | '649'

const PLANS: Record<
  PlanId,
  { label: string; tagline: string; price: number; coins: number; history: string }
> = {
  '199': {
    label: 'Competitive Intel',
    tagline: 'Website performance through marketing channels',
    price: 199,
    coins: 100_000,
    history: '3 mo history',
  },
  '399': {
    label: 'Intel + SEO + AEO',
    tagline: 'Organic + answer-engine visibility stack',
    price: 399,
    coins: 250_000,
    history: '3 mo history',
  },
  '649': {
    label: 'Intel + SEO + AEO + Ads',
    tagline: 'Add paid competitive intelligence',
    price: 649,
    coins: 500_000,
    history: '6 mo history',
  },
}

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return `${n}`
}

function defaultSplit(coins: number) {
  const rest = Math.round(coins * 0.38)
  const batch = Math.round(coins * 0.27)
  const studio = coins - rest - batch
  return { rest, batch, studio: Math.max(0, studio) }
}

function genKey(): string {
  const mid = Math.random().toString(36).slice(2, 10)
  return `sw_live_${mid}••••`
}

const ADD_ON_PACKS = [
  { id: 's', coins: 25_000, price: 49, label: 'Starter pack' },
  { id: 'm', coins: 100_000, price: 149, label: 'Growth pack' },
  { id: 'l', coins: 250_000, price: 349, label: 'Scale pack' },
] as const

type FlowSimulatorProps = { mode: SimMode }

export function FlowSimulator({ mode }: FlowSimulatorProps) {
  const entry: Entry = mode
  const [step, setStep] = useState<Step>(() => (mode === 'site' ? 'pricing' : 'llm'))
  const [planId, setPlanId] = useState<PlanId | null>(null)
  const [pendingKey, setPendingKey] = useState('')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [restAlloc, setRestAlloc] = useState(0)
  const [batchAlloc, setBatchAlloc] = useState(0)
  const [studioAlloc, setStudioAlloc] = useState(0)
  const [restUsed, setRestUsed] = useState(0)
  const [addOnCoins, setAddOnCoins] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const plan = planId ? PLANS[planId] : null
  const baseCoins = plan?.coins ?? 0
  const monthlyCoins = baseCoins + addOnCoins

  const allocationSum = restAlloc + batchAlloc + studioAlloc
  const restPct = restAlloc > 0 ? Math.min(100, Math.round((restUsed / restAlloc) * 1000) / 10) : 0

  const suffix = mode === 'site' ? 'site' : 'llm'

  const showToast = useCallback((msg: string) => {
    setToast(msg)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const applyPlan = useCallback((id: PlanId) => {
    setPlanId(id)
    setAddOnCoins(0)
    const { rest, batch, studio } = defaultSplit(PLANS[id].coins)
    setRestAlloc(rest)
    setBatchAlloc(batch)
    setStudioAlloc(studio)
    setRestUsed(Math.round(rest * 0.04))
  }, [])

  const resetAll = useCallback(() => {
    setStep(mode === 'site' ? 'pricing' : 'llm')
    setPlanId(null)
    setPendingKey('')
    setApiKey(null)
    setRestAlloc(0)
    setBatchAlloc(0)
    setStudioAlloc(0)
    setRestUsed(0)
    setAddOnCoins(0)
    setToast(null)
  }, [mode])

  const buyPack = useCallback(
    (coins: number, price: number, label: string) => {
      setAddOnCoins((a) => a + coins)
      setRestAlloc((r) => r + coins)
      showToast(`${label}: +${formatCoins(coins)} coins ($${price} mock)`)
    },
    [showToast],
  )

  const playbook = useMemo(() => {
    const key = `${mode}-${step}`
    const book: Record<string, { zone: string; title: string; body: string }> = {
      'site-pricing': {
        zone: '01 · Commerce',
        title: 'Package selection',
        body: 'Prospects compare self-serve tiers. MCP ships on paid SKUs; coins are the shared meter for REST, Batch, Data Studio, and MCP tool calls.',
      },
      'site-rest': {
        zone: '02 · Activation',
        title: 'API key & MCP',
        body: 'After purchase, Account Settings exposes keys. The same key backs REST clients and LLM connectors—activation is “first key generated,” not a separate SKU.',
      },
      'site-credits': {
        zone: '03 · Allocation',
        title: 'Coin split & add-ons',
        body: 'Monthly balance must be fully assigned across tools. Buying packs widens the pool; new coins land on REST/MCP first so you can stress-test, then rebalance.',
      },
      'site-limits': {
        zone: '04 · Expansion',
        title: 'Quota pressure',
        body: 'Soft warnings near 80% and blocks at 100% are the monetization surface—in-product, email, and LLM errors should route to packs or tier upgrades.',
      },
      'llm-llm': {
        zone: '01 · Discovery',
        title: 'Assistant entry',
        body: 'Users discover Similarweb inside Claude, ChatGPT, or similar hosts. The MCP entry point is acquisition-first: connect before they ever open your marketing site.',
      },
      'llm-auth': {
        zone: '02 · Trust',
        title: 'MCP authorization',
        body: 'The auth surface collects an API key or sends net-new users to signup/checkout. Friction here caps LLM→NT conversion—optimize for fast return to the host app.',
      },
      'llm-pricing': {
        zone: '03 · Conversion',
        title: 'Signup & plan',
        body: 'Net-new users pick a paid package (or trial policy you define). Coins attach to the subscription; MCP access follows the same entitlements as API users.',
      },
      'llm-rest': {
        zone: '04 · Activation',
        title: 'Keyring (post-connect)',
        body: 'Once authorized, usage accrues like any API account. “Linked from assistant” reminds you this cohort entered from LLM hosts—monitor separately in real analytics.',
      },
      'llm-credits': {
        zone: '05 · Allocation',
        title: 'Coin split & add-ons',
        body: 'Same allocation rules as self-serve. Teams often buy packs when assistants burn coins quickly—surface add-ons next to the sliders.',
      },
      'llm-limits': {
        zone: '06 · Expansion',
        title: 'Quota pressure',
        body: 'Errors bubble back into the LLM session. Pair the technical block with a CTA that deep-links to credit purchase or re-allocation—not a dead end.',
      },
    }
    return (
      book[key] ?? {
        zone: 'Overview',
        title: 'Flow simulator',
        body: 'Use the actions on each screen to move forward. Reset anytime to replay from the start.',
      })
  }, [mode, step])

  return (
    <div className="sim-app">
      <header className="sim-topbar">
        <div className="sim-logo">
          {mode === 'site' ? (
            <>
              Self-serve path <span>Interactive</span>
            </>
          ) : (
            <>
              LLM entry path <span>Interactive</span>
            </>
          )}
        </div>
        <button type="button" className="sim-btn-ghost" onClick={resetAll}>
          Reset demo
        </button>
      </header>

      <aside className="sim-playbook" aria-label="What this step represents">
        <div className="sim-playbook-zone">{playbook.zone}</div>
        <h2 className="sim-playbook-title">{playbook.title}</h2>
        <p className="sim-playbook-body">{playbook.body}</p>
      </aside>

      {step === 'llm' && (
        <section className="sim-panel">
          <h1>In the assistant</h1>
          <p className="sim-sub">User installs the Similarweb connector and taps connect.</p>
          <div className="sim-llm-host">
            <aside className="sim-chat" aria-label="Mock chat">
              <div className="sim-bubble">
                Assistant: I can pull competitive traffic if you connect Similarweb.
              </div>
              <div className="sim-bubble user">Add Similarweb MCP.</div>
              <div className="sim-bubble">Assistant: Opening secure auth…</div>
            </aside>
            <div>
              <p className="sim-sub" style={{ marginTop: 0 }}>
                Next: browser opens <code style={{ color: 'var(--teal)' }}>mcp-auth.similarweb.com</code>
              </p>
              <div className="sim-actions" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="sim-btn-primary" onClick={() => setStep('auth')}>
                  Open MCP authorization
                </button>
                <button type="button" className="sim-btn-ghost" onClick={resetAll}>
                  Back
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 'auth' && (
        <section className="sim-panel">
          <h1>Authorize the connector</h1>
          <p className="sim-sub">Applies an API key (demo field). New users go purchase before returning here.</p>
          <div className="sim-auth-card">
            <h2>Allow access to Similarweb</h2>
            <label htmlFor={`apikey-${suffix}`}>API key *</label>
            <input
              id={`apikey-${suffix}`}
              type="password"
              autoComplete="off"
              placeholder="Paste a key"
              value={pendingKey}
              onChange={(e) => setPendingKey(e.target.value)}
            />
            <div className="sim-row">
              <button
                type="button"
                className="sim-btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const k = pendingKey.trim() || genKey()
                  setApiKey(k)
                  if (!planId) {
                    applyPlan('199')
                  }
                  setStep('rest')
                  showToast('MCP authorized — redirect back to assistant')
                }}
              >
                Approve &amp; return
              </button>
            </div>
            <button
              type="button"
              className="sim-btn-ghost"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => {
                setApiKey(null)
                setPlanId(null)
                setPendingKey('')
                setStep('pricing')
              }}
            >
              I need a Similarweb account → choose a plan
            </button>
            <p style={{ fontSize: '0.78rem', color: '#5c6a66', marginTop: '0.85rem' }}>
              Keys are revoked in Account Settings. This sandbox generates a fake key if the field is empty.
            </p>
          </div>
          <div className="sim-actions">
            <button type="button" className="sim-btn-ghost" onClick={() => setStep('llm')}>
              Back
            </button>
          </div>
        </section>
      )}

      {step === 'pricing' && (
        <section className="sim-panel">
          <h1>Pick a paid package</h1>
          <p className="sim-sub">
            MCP access ships on paid tiers. Monthly <strong style={{ color: 'var(--teal)' }}>coins</strong> feed REST,
            Batch, Data Studio, and MCP tools from one pool.
          </p>
          <div className="sim-pricing-row">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const p = PLANS[id]
              const selected = planId === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`sim-plan ${selected ? 'selected' : ''}`}
                  onClick={() => applyPlan(id)}
                >
                  <div className="sim-chip" style={{ display: 'inline-block' }}>
                    MCP included
                  </div>
                  <div style={{ fontWeight: 700, marginTop: '0.35rem' }}>{p.label}</div>
                  <div className="price">${p.price}/mo</div>
                  <div className="coins">
                    {formatCoins(p.coins)} coins / month · {p.history}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0.75rem 0 0' }}>{p.tagline}</p>
                </button>
              )
            })}
          </div>
          <div className="sim-actions">
            <button
              type="button"
              className="sim-btn-ghost"
              onClick={() => {
                if (entry === 'llm') setStep('auth')
                else resetAll()
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="sim-btn-primary"
              disabled={!planId}
              onClick={() => {
                setStep('rest')
                showToast('Subscription active — default coin split applied')
              }}
            >
              Continue to activation
            </button>
          </div>
        </section>
      )}

      {step === 'rest' && plan && (
        <section className="sim-panel">
          <div className="sim-toolbar">
            <span className="sim-chip">Account · Data Tools · REST API</span>
            {entry === 'llm' && <span className="sim-chip">Linked from assistant</span>}
          </div>
          <h1>REST API &amp; MCP keyring</h1>
          <p className="sim-sub">
            Programmatic access consumes the same coins as the REST dashboard shows below. Generate a key, copy it into
            your assistant, then watch usage climb.
          </p>
          <div className="sim-dashboard">
            <div>
              <div className="sim-meter-row">
                <span>REST allocation</span>
                <span>
                  {formatCoins(restUsed)} used · {formatCoins(restAlloc)} allocated
                </span>
              </div>
              <div
                className="sim-stat-bar"
                role="progressbar"
                aria-valuenow={restPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`sim-stat-fill used ${restPct >= 100 ? 'warn-over' : ''}`}
                  style={{ width: `${Math.min(100, restPct)}%` }}
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
                Batch {formatCoins(batchAlloc)} · Studio {formatCoins(studioAlloc)} · Plan {plan.label}
                {addOnCoins > 0 && (
                  <span>
                    {' '}
                    · Add-ons <span style={{ color: 'var(--teal)' }}>+{formatCoins(addOnCoins)}</span>
                  </span>
                )}
              </div>
            </div>
            {apiKey ? (
              <table className="sim-keys-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key</th>
                    <th>Monthly usage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Primary workspace</td>
                    <td>
                      <code>{apiKey}</code>
                    </td>
                    <td>{formatCoins(restUsed)} coins</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--muted)' }}>No keys yet — mint one to unlock MCP.</p>
            )}
            <div className="sim-actions" style={{ justifyContent: 'flex-start' }}>
              {!apiKey ? (
                <button
                  type="button"
                  className="sim-btn-primary"
                  onClick={() => {
                    const k = genKey()
                    setApiKey(k)
                    showToast('API key created')
                  }}
                >
                  Generate API key
                </button>
              ) : (
                <button
                  type="button"
                  className="sim-btn-primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(apiKey)
                    } catch {
                      showToast('Copy blocked — select & copy manually')
                      return
                    }
                    showToast('Key copied')
                  }}
                >
                  Copy key
                </button>
              )}
              <button
                type="button"
                className="sim-btn-ghost"
                onClick={() => {
                  const bump = Math.max(1000, Math.round(restAlloc * 0.05))
                  setRestUsed((u) => Math.min(restAlloc, u + bump))
                }}
              >
                Simulate traffic (+5%)
              </button>
              <button type="button" className="sim-btn-primary" onClick={() => setStep('credits')}>
                Manage coin split
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'credits' && plan && (
        <section className="sim-panel">
          <h1>Data credits management</h1>
          <p className="sim-sub">
            Plan includes <strong>{formatCoins(baseCoins)}</strong> base coins
            {addOnCoins > 0 ? (
              <>
                {' '}
                + <strong style={{ color: 'var(--teal)' }}>{formatCoins(addOnCoins)}</strong> from add-ons →{' '}
                <strong>{formatCoins(monthlyCoins)}</strong> monthly pool total.
              </>
            ) : (
              <> ({formatCoins(monthlyCoins)} monthly pool).</>
            )}{' '}
            REST allocation must stay above usage ({formatCoins(restUsed)} burned).
          </p>
          <div className="sim-addon-section">
            <div className="sim-addon-head">
              <h2 className="sim-addon-title">Buy more credits</h2>
              <span className="sim-addon-badge">Add-on (mock checkout)</span>
            </div>
            <p className="sim-addon-desc">
              One-click packs raise your monthly balance. New coins are added to <strong>REST / MCP</strong> first so
              simulations keep working; use the sliders below to redistribute across Batch and Data Studio.
            </p>
            <div className="sim-pack-grid" role="group" aria-label="Credit packs">
              {ADD_ON_PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="sim-pack-card"
                  onClick={() => buyPack(p.coins, p.price, p.label)}
                >
                  <span className="sim-pack-label">{p.label}</span>
                  <span className="sim-pack-coins">+{formatCoins(p.coins)} coins</span>
                  <span className="sim-pack-meta">Mock · ${p.price} · renews monthly</span>
                  <span className="sim-pack-cta">Add to balance</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sim-sliders">
            <label htmlFor={`r-rest-${suffix}`}>
              REST / MCP — {formatCoins(restAlloc)} coins (
              {monthlyCoins > 0 ? Math.round((restAlloc / monthlyCoins) * 100) : 0}%)
            </label>
            <input
              id={`r-rest-${suffix}`}
              type="range"
              min={restUsed}
              max={Math.max(restUsed, monthlyCoins - batchAlloc - studioAlloc)}
              value={restAlloc}
              onChange={(e) => {
                const v = Number(e.target.value)
                setRestAlloc(v)
              }}
            />
            <label htmlFor={`r-batch-${suffix}`}>Batch API — {formatCoins(batchAlloc)} coins</label>
            <input
              id={`r-batch-${suffix}`}
              type="range"
              min={0}
              max={Math.max(0, monthlyCoins - restAlloc - studioAlloc)}
              value={batchAlloc}
              onChange={(e) => setBatchAlloc(Number(e.target.value))}
            />
            <label htmlFor={`r-studio-${suffix}`}>Data Studio — {formatCoins(studioAlloc)} coins</label>
            <input
              id={`r-studio-${suffix}`}
              type="range"
              min={0}
              max={Math.max(0, monthlyCoins - restAlloc - batchAlloc)}
              value={studioAlloc}
              onChange={(e) => setStudioAlloc(Number(e.target.value))}
            />
            <div className="sim-meter-row" style={{ marginTop: '0.75rem' }}>
              <span>Assigned total</span>
              <span style={{ color: allocationSum === monthlyCoins ? 'var(--teal)' : 'var(--warn)' }}>
                {formatCoins(allocationSum)} / {formatCoins(monthlyCoins)}
              </span>
            </div>
            {addOnCoins > 0 && (
              <p className="sim-pool-foot">
                Includes {formatCoins(addOnCoins)} purchased this session (resets when you change plan or hit Reset
                demo).
              </p>
            )}
          </div>
          <div className="sim-actions">
            <button type="button" className="sim-btn-ghost" onClick={() => setStep('rest')}>
              Back
            </button>
            <button
              type="button"
              className="sim-btn-primary"
              disabled={allocationSum !== monthlyCoins || restAlloc < restUsed}
              onClick={() => {
                showToast('Allocations saved')
                setStep('limits')
              }}
            >
              Save &amp; continue
            </button>
          </div>
          {allocationSum !== monthlyCoins && (
            <div className="sim-banner warn">
              Assign exactly {formatCoins(monthlyCoins)} coins across tools (remainder:{' '}
              {formatCoins(monthlyCoins - allocationSum)}).
            </div>
          )}
          {restAlloc < restUsed && (
            <div className="sim-banner danger">
              REST allocation must be ≥ {formatCoins(restUsed)} (already used).
            </div>
          )}
        </section>
      )}

      {step === 'limits' && plan && (
        <section className="sim-panel">
          <h1>Exhaustion &amp; upsell</h1>
          <p className="sim-sub">
            Push usage past soft gates. This is the monetization surface: in-product, email, and LLM errors can point to
            credit packs or plan upgrades.
          </p>
          <div>
            <div className="sim-meter-row">
              <span>REST / MCP consumption</span>
              <span>
                {restPct}% · {formatCoins(restUsed)} / {formatCoins(restAlloc)}
              </span>
            </div>
            <div className="sim-stat-bar">
              <div
                className={`sim-stat-fill used ${restPct >= 100 ? 'warn-over' : ''}`}
                style={{ width: `${Math.min(100, restPct)}%` }}
              />
            </div>
            <div className="sim-actions" style={{ justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="sim-btn-primary"
                onClick={() => {
                  setRestUsed((u) => Math.min(restAlloc, u + Math.round(restAlloc * 0.15)))
                }}
              >
                Burn +15%
              </button>
              <button
                type="button"
                className="sim-btn-ghost"
                onClick={() => setRestUsed(Math.round(restAlloc * 0.35))}
              >
                Reset to moderate use
              </button>
              <button type="button" className="sim-btn-ghost" onClick={() => setRestUsed(restAlloc)}>
                Max out usage
              </button>
            </div>
          </div>
          {restPct >= 80 && restPct < 100 && (
            <div className="sim-banner warn">
              <strong>80% threshold.</strong> Show warning banners on REST dashboard + optional LLM notice. Offer buy
              credits or upgrade tier.
              <button type="button" className="sim-btn-primary" style={{ marginLeft: 'auto' }}>
                Buy coin pack (mock)
              </button>
            </div>
          )}
          {restPct >= 100 && (
            <div className="sim-banner danger">
              <strong>Quota hit.</strong> Soft-block new MCP tool calls, keep read-only dashboards. Deep-link user to
              allocation + storefront.
              <button type="button" className="sim-btn-primary" style={{ marginLeft: 'auto' }}>
                Upgrade plan (mock)
              </button>
            </div>
          )}
          <div className="sim-actions">
            <button type="button" className="sim-btn-ghost" onClick={() => setStep('credits')}>
              Adjust allocation
            </button>
            <button type="button" className="sim-btn-ghost" onClick={resetAll}>
              Restart journey
            </button>
          </div>
        </section>
      )}

      {toast && <div className="sim-toast">{toast}</div>}
    </div>
  )
}
