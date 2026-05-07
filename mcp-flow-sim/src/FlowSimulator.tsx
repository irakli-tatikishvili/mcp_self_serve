import { useCallback, useEffect, useMemo, useState } from 'react'
import './simulator.css'

export type SimMode = 'site' | 'llm'
type Entry = 'site' | 'llm'
type Step = 'llm' | 'auth' | 'signup' | 'pricing' | 'rest' | 'credits' | 'limits'

type PlanId = '199' | '399' | '649'

const PACKAGE_FEATURES_CI = [
  'Traffic & Engagement',
  'Audience Demographics',
  'New vs Returning Visitors',
  'Category Leaders',
  'Marketing Channels',
] as const

const PACKAGE_FEATURES_SEO_AEO = [
  'Keyword Research / Analysis',
  'Rank Tracking',
  'Market Analysis',
  'Popular Pages',
  'Folders',
  'Subdomains',
] as const

const PACKAGE_FEATURES_ADS = [
  'Landing Pages (Organic/Paid)',
  'PPC Marketing',
  'Brand Protection',
] as const

const PLANS: Record<
  PlanId,
  {
    label: string
    tagline: string
    price: number
    credits: number
    history: string
    /** Middle tiers only — line above incremental API bullets */
    apiIncludesIntro?: string
    apiFeatureBullets: readonly string[]
  }
> = {
  '199': {
    label: 'Competitive Intelligence',
    tagline: 'Website performance through marketing channels',
    price: 199,
    credits: 100_000,
    history: '3 mo history',
    apiFeatureBullets: PACKAGE_FEATURES_CI,
  },
  '399': {
    label: 'Competitive Intelligence + SEO + AEO',
    tagline: 'Organic + answer-engine visibility stack',
    price: 399,
    credits: 250_000,
    history: '3 mo history',
    apiIncludesIntro: 'Includes everything in Competitive Intelligence, plus:',
    apiFeatureBullets: PACKAGE_FEATURES_SEO_AEO,
  },
  '649': {
    label: 'Competitive Intelligence + SEO + AEO + Ads',
    tagline: 'Add paid competitive intelligence',
    price: 649,
    credits: 500_000,
    history: '6 mo history',
    apiIncludesIntro: 'Includes everything in Competitive Intelligence + SEO + AEO, plus:',
    apiFeatureBullets: PACKAGE_FEATURES_ADS,
  },
}

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return `${n}`
}

function defaultSplit(credits: number) {
  const rest = Math.round(credits * 0.38)
  const batch = Math.round(credits * 0.27)
  const studio = credits - rest - batch
  return { rest, batch, studio: Math.max(0, studio) }
}

function genKey(): string {
  const mid = Math.random().toString(36).slice(2, 10)
  return `sw_live_${mid}••••`
}

const ADD_ON_PACKS = [
  { id: 's', credits: 25_000, price: 49, label: 'Starter pack' },
  { id: 'm', credits: 100_000, price: 149, label: 'Growth pack' },
  { id: 'l', credits: 250_000, price: 349, label: 'Scale pack' },
] as const

const TRIAL_USE_CASES = [
  { value: '', label: 'Select a primary use case…' },
  { value: 'ci', label: 'Competitive & market intelligence' },
  { value: 'seo', label: 'SEO / AEO & content insights' },
  { value: 'ads', label: 'Paid & ads intelligence' },
  { value: 'mcp', label: 'LLM / MCP & API automation' },
  { value: 'other', label: 'Other' },
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
  const [addOnCredits, setAddOnCredits] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const [trialEmail, setTrialEmail] = useState('')
  const [trialCompany, setTrialCompany] = useState('')
  const [trialUseCase, setTrialUseCase] = useState('')
  const [trialTeamSize, setTrialTeamSize] = useState('')
  const [trialReferral, setTrialReferral] = useState('')
  const [trialAgree, setTrialAgree] = useState(false)
  const [pricingAfterSignup, setPricingAfterSignup] = useState(false)

  const plan = planId ? PLANS[planId] : null
  const baseCredits = plan?.credits ?? 0
  const monthlyCredits = baseCredits + addOnCredits

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
    setAddOnCredits(0)
    const { rest, batch, studio } = defaultSplit(PLANS[id].credits)
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
    setAddOnCredits(0)
    setToast(null)
    setTrialEmail('')
    setTrialCompany('')
    setTrialUseCase('')
    setTrialTeamSize('')
    setTrialReferral('')
    setTrialAgree(false)
    setPricingAfterSignup(false)
  }, [mode])

  const buyPack = useCallback(
    (credits: number, price: number, label: string) => {
      setAddOnCredits((a) => a + credits)
      setRestAlloc((r) => r + credits)
      showToast(`${label}: +${formatCredits(credits)} credits ($${price} mock)`)
    },
    [showToast],
  )

  const signupTrialValid =
    trialEmail.trim().length > 3 &&
    trialCompany.trim().length > 1 &&
    trialUseCase.length > 0 &&
    trialTeamSize.trim().length > 0 &&
    trialAgree

  const playbook = useMemo(() => {
    const key = `${mode}-${step}`
    const book: Record<string, { zone: string; title: string; body: string }> = {
      'site-pricing': {
        zone: '01 · Commerce',
        title: 'Package selection',
        body: 'Prospects compare self-serve tiers. MCP ships on paid SKUs; credits are the shared meter for REST, Batch, Data Studio, and MCP tool calls.',
      },
      'site-rest': {
        zone: '02 · Activation',
        title: 'API key & MCP',
        body: 'After purchase, Account Settings exposes keys. The same key backs REST clients and LLM connectors—activation is “first key generated,” not a separate SKU.',
      },
      'site-credits': {
        zone: '03 · Allocation',
        title: 'Credit split & add-ons',
        body: 'Monthly balance must be fully assigned across tools. Buying packs widens the pool; new credits land on REST/MCP first so you can stress-test, then rebalance.',
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
        body: 'Returning users paste an API key. Net-new users can start a short trial signup, then pick a package and create a key before reconnecting the assistant.',
      },
      'llm-signup': {
        zone: '02b · Acquisition',
        title: 'Trial questionnaire',
        body: 'Capture firmographics and intent so sales success can provision a trial workspace. After submit, the user chooses a paid package and lands in activation to mint an API key.',
      },
      'llm-pricing': {
        zone: '03 · Conversion',
        title: 'Signup & plan',
        body: 'Net-new users pick a paid package (or trial policy you define). Credits attach to the subscription; MCP access follows the same API entitlements as the web app.',
      },
      'llm-rest': {
        zone: '04 · Activation',
        title: 'Keyring (post-connect)',
        body: 'Once authorized, usage accrues like any API account. “Linked from assistant” reminds you this cohort entered from LLM hosts—monitor separately in real analytics.',
      },
      'llm-credits': {
        zone: '05 · Allocation',
        title: 'Credit split & add-ons',
        body: 'Same allocation rules as self-serve. Teams often buy packs when assistants burn credits quickly—surface add-ons next to the sliders.',
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
                <button
                  type="button"
                  className="sim-btn-primary"
                  onClick={() => {
                    setPricingAfterSignup(false)
                    setStep('auth')
                  }}
                >
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
          <p className="sim-sub">
            Paste an existing API key to reconnect. No key yet? Start a trial below, then choose a package and create a
            key in Account Settings before returning here.
          </p>
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
            <div className="auth-alt-row">
              <button type="button" className="sim-link-btn" onClick={() => setStep('signup')}>
                Don&apos;t have a key? Sign up
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0', textAlign: 'center' }}>
                Opens a short trial form, then package selection so you can generate a key.
              </p>
            </div>
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

      {step === 'signup' && (
        <section className="sim-panel">
          <h1>Start your trial</h1>
          <p className="sim-sub">
            Mock signup used in the LLM path. After you submit, pick a package—then you&apos;ll create an API key on the
            next screen.
          </p>
          <form
            className="sim-signup"
            onSubmit={(e) => {
              e.preventDefault()
              if (!signupTrialValid) {
                showToast('Fill all required fields and accept terms (demo)')
                return
              }
              setApiKey(null)
              setPlanId(null)
              setPendingKey('')
              setPricingAfterSignup(true)
              setStep('pricing')
              showToast('Trial workspace provisioned (mock) — choose a package')
            }}
          >
            <div>
              <label htmlFor={`trial-email-${suffix}`}>Work email *</label>
              <input
                id={`trial-email-${suffix}`}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={trialEmail}
                onChange={(e) => setTrialEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`trial-company-${suffix}`}>Company *</label>
              <input
                id={`trial-company-${suffix}`}
                type="text"
                autoComplete="organization"
                placeholder="Company name"
                value={trialCompany}
                onChange={(e) => setTrialCompany(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`trial-use-${suffix}`}>Primary use case *</label>
              <select
                id={`trial-use-${suffix}`}
                value={trialUseCase}
                onChange={(e) => setTrialUseCase(e.target.value)}
                required
              >
                {TRIAL_USE_CASES.map((o) => (
                  <option key={o.value || 'empty'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`trial-team-${suffix}`}>Team size *</label>
              <input
                id={`trial-team-${suffix}`}
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5–20"
                value={trialTeamSize}
                onChange={(e) => setTrialTeamSize(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`trial-ref-${suffix}`}>How did you hear about us?</label>
              <textarea
                id={`trial-ref-${suffix}`}
                placeholder="Optional — e.g. LLM connector, colleague, event…"
                value={trialReferral}
                onChange={(e) => setTrialReferral(e.target.value)}
              />
            </div>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={trialAgree}
                onChange={(e) => setTrialAgree(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                I agree to the trial terms and privacy notice (mock checkbox).
              </span>
            </label>
            <div className="sim-actions" style={{ paddingTop: '0.25rem' }}>
              <button type="button" className="sim-btn-ghost" onClick={() => setStep('auth')}>
                Back
              </button>
              <button type="submit" className="sim-btn-primary">
                Start trial &amp; continue
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'pricing' && (
        <section className="sim-panel">
          <h1>Pick a paid package</h1>
          <p className="sim-sub">
            MCP access ships on paid tiers. Monthly <strong style={{ color: 'var(--teal)' }}>credits</strong> feed
            REST, Batch, Data Studio, and MCP tools from one pool. Each tier unlocks more API datasets (see list per
            package).
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
                  <div className="sim-plan-summary">
                    <span className="sim-chip sim-chip-plan">MCP included</span>
                    <div className="sim-plan-title">{p.label}</div>
                    <div className="price">${p.price}/mo</div>
                    <div className="credits-line">
                      {formatCredits(p.credits)} credits / month · {p.history}
                    </div>
                    <p className="sim-plan-tagline">{p.tagline}</p>
                  </div>
                  <div className="sim-plan-api">
                    <p className="sim-plan-features-title">Included in the API</p>
                    {p.apiIncludesIntro ? (
                      <p className="sim-plan-includes-intro">{p.apiIncludesIntro}</p>
                    ) : null}
                    <ul className="sim-plan-features">
                      {p.apiFeatureBullets.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="sim-actions">
            <button
              type="button"
              className="sim-btn-ghost"
              onClick={() => {
                if (entry === 'llm') {
                  if (pricingAfterSignup) {
                    setStep('signup')
                  } else {
                    setStep('auth')
                  }
                } else {
                  resetAll()
                }
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
                showToast('Subscription active — default credit split applied')
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
            Programmatic access consumes the same credits as the REST dashboard shows below. Generate a key, copy it
            into your assistant, then watch usage climb.
          </p>
          <div className="sim-dashboard">
            <div>
              <div className="sim-meter-row">
                <span>REST allocation</span>
                <span>
                  {formatCredits(restUsed)} used · {formatCredits(restAlloc)} allocated
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
                Batch {formatCredits(batchAlloc)} · Studio {formatCredits(studioAlloc)} · Plan {plan.label}
                {addOnCredits > 0 && (
                  <span>
                    {' '}
                    · Add-ons <span style={{ color: 'var(--teal)' }}>+{formatCredits(addOnCredits)}</span>
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
                    <td>{formatCredits(restUsed)} credits</td>
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
                Manage credit split
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'credits' && plan && (
        <section className="sim-panel">
          <h1>Data credits management</h1>
          <p className="sim-sub">
            Plan includes <strong>{formatCredits(baseCredits)}</strong> base credits
            {addOnCredits > 0 ? (
              <>
                {' '}
                + <strong style={{ color: 'var(--teal)' }}>{formatCredits(addOnCredits)}</strong> from add-ons →{' '}
                <strong>{formatCredits(monthlyCredits)}</strong> monthly pool total.
              </>
            ) : (
              <> ({formatCredits(monthlyCredits)} monthly pool).</>
            )}{' '}
            REST allocation must stay above usage ({formatCredits(restUsed)} burned).
          </p>
          <div className="sim-addon-section">
            <div className="sim-addon-head">
              <h2 className="sim-addon-title">Buy more credits</h2>
              <span className="sim-addon-badge">Add-on (mock checkout)</span>
            </div>
            <p className="sim-addon-desc">
              One-click packs raise your monthly balance. New credits are added to <strong>REST / MCP</strong> first so
              simulations keep working; use the sliders below to redistribute across Batch and Data Studio.
            </p>
            <div className="sim-pack-grid" role="group" aria-label="Credit packs">
              {ADD_ON_PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="sim-pack-card"
                  onClick={() => buyPack(p.credits, p.price, p.label)}
                >
                  <span className="sim-pack-label">{p.label}</span>
                  <span className="sim-pack-credits">+{formatCredits(p.credits)} credits</span>
                  <span className="sim-pack-meta">Mock · ${p.price} · renews monthly</span>
                  <span className="sim-pack-cta">Add to balance</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sim-sliders">
            <label htmlFor={`r-rest-${suffix}`}>
              REST / MCP — {formatCredits(restAlloc)} credits (
              {monthlyCredits > 0 ? Math.round((restAlloc / monthlyCredits) * 100) : 0}%)
            </label>
            <input
              id={`r-rest-${suffix}`}
              type="range"
              min={restUsed}
              max={Math.max(restUsed, monthlyCredits - batchAlloc - studioAlloc)}
              value={restAlloc}
              onChange={(e) => {
                const v = Number(e.target.value)
                setRestAlloc(v)
              }}
            />
            <label htmlFor={`r-batch-${suffix}`}>Batch API — {formatCredits(batchAlloc)} credits</label>
            <input
              id={`r-batch-${suffix}`}
              type="range"
              min={0}
              max={Math.max(0, monthlyCredits - restAlloc - studioAlloc)}
              value={batchAlloc}
              onChange={(e) => setBatchAlloc(Number(e.target.value))}
            />
            <label htmlFor={`r-studio-${suffix}`}>Data Studio — {formatCredits(studioAlloc)} credits</label>
            <input
              id={`r-studio-${suffix}`}
              type="range"
              min={0}
              max={Math.max(0, monthlyCredits - restAlloc - batchAlloc)}
              value={studioAlloc}
              onChange={(e) => setStudioAlloc(Number(e.target.value))}
            />
            <div className="sim-meter-row" style={{ marginTop: '0.75rem' }}>
              <span>Assigned total</span>
              <span style={{ color: allocationSum === monthlyCredits ? 'var(--teal)' : 'var(--warn)' }}>
                {formatCredits(allocationSum)} / {formatCredits(monthlyCredits)}
              </span>
            </div>
            {addOnCredits > 0 && (
              <p className="sim-pool-foot">
                Includes {formatCredits(addOnCredits)} purchased this session (resets when you change plan or hit Reset
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
              disabled={allocationSum !== monthlyCredits || restAlloc < restUsed}
              onClick={() => {
                showToast('Allocations saved')
                setStep('limits')
              }}
            >
              Save &amp; continue
            </button>
          </div>
          {allocationSum !== monthlyCredits && (
            <div className="sim-banner warn">
              Assign exactly {formatCredits(monthlyCredits)} credits across tools (remainder:{' '}
              {formatCredits(monthlyCredits - allocationSum)}).
            </div>
          )}
          {restAlloc < restUsed && (
            <div className="sim-banner danger">
              REST allocation must be ≥ {formatCredits(restUsed)} (already used).
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
                {restPct}% · {formatCredits(restUsed)} / {formatCredits(restAlloc)}
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
                Buy credit pack (mock)
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
