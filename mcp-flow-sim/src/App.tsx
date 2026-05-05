import { useCallback, useState, type KeyboardEvent } from 'react'
import { FlowSimulator } from './FlowSimulator'
import { OpenQuestionsSheet } from './OpenQuestionsSheet'
import { TeamActionsBoard } from './TeamActionsBoard'
import './simulator.css'

type MainTab = 'prd' | 'regular' | 'llm' | 'teams' | 'questions'

const TABS: { id: MainTab; label: string }[] = [
  { id: 'prd', label: 'PRD main items' },
  { id: 'regular', label: 'Regular user flow' },
  { id: 'llm', label: 'LLM-origin flow' },
  { id: 'teams', label: 'Team action items' },
  { id: 'questions', label: 'Open questions' },
]

export default function App() {
  const [tab, setTab] = useState<MainTab>('prd')

  const onKeyNav = useCallback((e: KeyboardEvent, i: number) => {
    let next: number | null = null
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
    if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = TABS.length - 1
    if (next !== null) {
      e.preventDefault()
      setTab(TABS[next].id)
    }
  }, [])

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-title">MCP × self-serve</span>
          <span className="app-brand-sub">Prototype hub</span>
        </div>
        <nav className="main-tabs" role="tablist" aria-label="Sections">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`main-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onKeyNav(e, i)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'prd' && (
        <div className="app-body doc-stack" id="panel-prd" role="tabpanel" aria-labelledby="tab-prd">
          <p className="doc-section-label">North star &amp; frame</p>
          <div className="doc-panel">
            <h2>Hypothesis &amp; approach</h2>
            <p>
              Adding MCP (API key) to paid self-serve with a shared <strong>coin</strong> pool should lift CvR → new
              trials/NT via LLM funnels, improve retention &amp; TLV through embedded API usage, and fuel NT → T via
              credit exhaustion and visible usage.
            </p>
          </div>

          <p className="doc-section-label">Evidence &amp; scope (tile by tile)</p>
          <div className="doc-grid">
            <div className="doc-tile">
              <h3>KPIs</h3>
              <ul>
                <li>% of new NTs attributed to MCP / LLM funnel</li>
                <li>API key generation (activation)</li>
                <li>Coins consumed per NT; % hitting limits</li>
                <li>Add-on attach rate; retention API vs non-API</li>
              </ul>
            </div>
            <div className="doc-tile">
              <h3>Product scope</h3>
              <ul>
                <li>Keys, MCP auth, programmatic access</li>
                <li>Monitor usage, coins, endpoints</li>
                <li>Manage keys, limits, allocations</li>
              </ul>
            </div>
            <div className="doc-tile">
              <h3>Packaging principles</h3>
              <ul>
                <li>MCP on all paid tiers; limited on no-CC trial</li>
                <li>One coin system shared across tools</li>
                <li>Credit packs as primary expansion lever</li>
              </ul>
            </div>
            <div className="doc-tile">
              <h3>Critical flows</h3>
              <ul>
                <li>Acquisition (LLM) → auth → signup/pay</li>
                <li>Activation: first key + default allocation</li>
                <li>Monitoring: REST + Data Credits pages</li>
                <li>Exhaustion → buy coins / upgrade</li>
              </ul>
            </div>
            <div className="doc-tile">
              <h3>Monetization</h3>
              <ul>
                <li>Subscription base + coin add-ons</li>
                <li>Future: premium endpoints, rate tiers</li>
              </ul>
            </div>
            <div className="doc-tile">
              <h3>Risks</h3>
              <ul>
                <li>Abuse → rate limits, anomaly detection</li>
                <li>Coin confusion → education &amp; UX clarity</li>
                <li>Low activation → first-call onboarding</li>
                <li>GTM cannibalization → positioning, packaging splits, funnel attribution</li>
              </ul>
            </div>
          </div>

          <p className="doc-section-label">Commercial snapshot</p>
          <div className="doc-panel">
            <h2>Packaging vs programmatic access</h2>
            <p style={{ marginBottom: '0.75rem' }}>
              Each row ties a commercial state to MCP eligibility and how coins show up in-product. Numbers here are
              directional—replace with your final policy.
            </p>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>MCP</th>
                    <th>Coins</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Free</td>
                    <td>No</td>
                    <td>0</td>
                    <td>Upsell entry</td>
                  </tr>
                  <tr>
                    <td>Trial (no CC)</td>
                    <td>Limited</td>
                    <td>Low</td>
                    <td>~1 key; drive activation</td>
                  </tr>
                  <tr>
                    <td>Trial (CC)</td>
                    <td>Yes</td>
                    <td>Medium</td>
                    <td>Full MCP habit loop</td>
                  </tr>
                  <tr>
                    <td>Paid ($199+)</td>
                    <td>Yes</td>
                    <td>Base +</td>
                    <td>MCP listed as included</td>
                  </tr>
                  <tr>
                    <td>Enterprise</td>
                    <td>Yes</td>
                    <td>Custom</td>
                    <td>Negotiated pools</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'regular' && (
        <div className="app-body" id="panel-regular" role="tabpanel" aria-labelledby="tab-regular">
          <FlowSimulator key="flow-site" mode="site" />
        </div>
      )}

      {tab === 'llm' && (
        <div className="app-body" id="panel-llm" role="tabpanel" aria-labelledby="tab-llm">
          <FlowSimulator key="flow-llm" mode="llm" />
        </div>
      )}

      {tab === 'teams' && (
        <div className="app-body doc-stack" id="panel-teams" role="tabpanel" aria-labelledby="tab-teams">
          <p className="doc-section-label">Team action items</p>
          <p className="doc-lead" style={{ marginTop: 0 }}>
            Edit each workstream’s checklist below. Add rows, remove rows, or reset a card to the starter list.
          </p>
          <TeamActionsBoard />
        </div>
      )}

      {tab === 'questions' && (
        <div className="app-body" id="panel-questions" role="tabpanel" aria-labelledby="tab-questions">
          <OpenQuestionsSheet />
        </div>
      )}
    </div>
  )
}
