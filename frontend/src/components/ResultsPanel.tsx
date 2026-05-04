/**
 * IndAI — Results Panel Component
 * Displays vulnerability scan results with severity badges,
 * expandable details, code snippets, and fix suggestions.
 */

import { useState, useEffect } from "react";
import type { ResultsPanelProps, Vulnerability, Severity } from "../types";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; icon: string }
> = {
  critical: { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "🔴" },
  high: { label: "HIGH", color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "🟠" },
  medium: { label: "MEDIUM", color: "#eab308", bg: "rgba(234,179,8,0.12)", icon: "🟡" },
  low: { label: "LOW", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: "🔵" },
  info: { label: "INFO", color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: "⚪" },
};

const PROGRESS_STEPS = [
  { label: "Parsing Code", pct: 15 },
  { label: "Running OWASP Rules", pct: 45 },
  { label: "Generating AI Summary", pct: 75 },
  { label: "Finalizing Report", pct: 95 },
];

function ScanProgressBar() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const current = PROGRESS_STEPS[step];

  return (
    <div className="results-panel" id="results-panel">
      <div className="scan-progress-container">
        <div className="scan-progress-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h3>Scanning in Progress</h3>
        </div>
        <div className="scan-progress-bar">
          <div className="progress-fill" style={{ width: `${current.pct}%` }} />
        </div>
        <div className="progress-steps">
          {PROGRESS_STEPS.map((s, i) => (
            <div key={i} className={`progress-step ${i < step ? "done" : i === step ? "active" : ""}`}>
              <span className="step-dot">{i < step ? "✓" : i + 1}</span>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({ result, isLoading }: ResultsPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeSeverity, setActiveSeverity] = useState<Severity | "all">("all");

  if (isLoading) {
    return <ScanProgressBar />;
  }

  if (!result) {
    return (
      <div className="results-panel" id="results-panel">
        <div className="results-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>Paste your code and click <strong>Scan Code</strong> to begin</p>
          <p className="empty-sub">IndAI will analyze your code against OWASP security rules</p>
        </div>
      </div>
    );
  }

  const { vulnerabilities, summary, total_issues } = result;

  // Filtering Logic
  const filteredVulns = vulnerabilities.filter((v) => {
    const matchesQuery =
      v.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      v.rule_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(filterQuery.toLowerCase());

    const matchesSeverity = activeSeverity === "all" || v.severity === activeSeverity;

    return matchesQuery && matchesSeverity;
  });

  return (
    <div className="results-panel" id="results-panel">
      {/* Sticky Header Section */}
      <div className="results-header-sticky">
        {/* Summary Bar */}
        <div className="results-summary" id="results-summary">
          <div className="summary-header">
            <h3>
              {total_issues === 0 ? "✅ No Vulnerabilities Found" : `⚠️ ${total_issues} Issue${total_issues > 1 ? "s" : ""} Found`}
            </h3>
            {summary.risk_score !== undefined && (
              <div
                className="risk-score-badge"
                style={{
                  background: summary.risk_score > 60
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.15))'
                    : summary.risk_score > 30
                      ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.15))'
                      : 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(0, 240, 255, 0.15))',
                  color: summary.risk_score > 60 ? '#ef4444' : summary.risk_score > 30 ? '#eab308' : '#22c55e',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: `1px solid ${summary.risk_score > 60 ? 'rgba(239, 68, 68, 0.3)' : summary.risk_score > 30 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                  boxShadow: summary.risk_score > 60 ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Risk Score: {summary.risk_score}/100
              </div>
            )}
          </div>
          <div className="severity-badges">
            {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => {
              const count = summary.by_severity[sev] || 0;
              if (count === 0) return null;
              const config = SEVERITY_CONFIG[sev];
              return (
                <span
                  key={sev}
                  className="severity-badge"
                  style={{ backgroundColor: config.bg, color: config.color, borderColor: config.color }}
                >
                  {config.icon} {config.label}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="vuln-filter-bar">
          <div className="filter-input-wrapper">
            <svg className="filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by title, rule or description..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          <div className="severity-filter-chips">
            <button
              className={`filter-chip ${activeSeverity === "all" ? "active" : ""}`}
              onClick={() => setActiveSeverity("all")}
            >
              All
            </button>
            {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => {
              const count = summary.by_severity[sev] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={sev}
                  className={`filter-chip ${activeSeverity === sev ? "active" : ""}`}
                  onClick={() => setActiveSeverity(sev)}
                >
                  {sev.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vulnerability List */}
      <div className="vuln-list" id="vulnerability-list">
        {filteredVulns.length === 0 ? (
          <div className="results-empty" style={{ padding: '40px' }}>
            <p>No issues match your current filters</p>
          </div>
        ) : (
          filteredVulns.map((vuln: Vulnerability, index: number) => {
            const config = SEVERITY_CONFIG[vuln.severity] || SEVERITY_CONFIG.info;
            const isExpanded = expandedId === index;

            return (
              <div
                key={index}
                className={`vuln-row ${isExpanded ? "expanded" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : index)}
              >
                {/* Compact Row View */}
                <div className="vuln-compact-header">
                  <div className="vuln-dot" style={{ color: config.color, backgroundColor: config.color }} />

                  <div className="vuln-compact-info">
                    <span className="vuln-compact-title">{vuln.title}</span>
                    <div className="vuln-compact-meta">
                      <span className="vuln-compact-rule">{vuln.rule_id}</span>
                      {vuln.line_number && (
                        <span className="vuln-compact-line">Line {vuln.line_number}</span>
                      )}
                      <span
                        className="vuln-compact-severity"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>

                  <svg
                    className={`vuln-chevron ${isExpanded ? "rotated" : ""}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div className="vuln-details">
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--accent-purple)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📖 Why is this a risk?
                      </span>
                      <p className="vuln-description" style={{ marginTop: '4px', borderLeft: '2px solid rgba(168, 85, 247, 0.3)', paddingLeft: '12px' }}>
                        {vuln.description}
                      </p>
                    </div>

                    {vuln.owasp_category && (
                      <div className="vuln-owasp" style={{ marginBottom: '16px' }}>
                        <span className="owasp-label">OWASP</span>
                        <span className="owasp-value">{vuln.owasp_category}</span>
                      </div>
                    )}

                    {vuln.code_snippet && (
                      <div className="vuln-code-block">
                        <div className="code-block-header">
                          <span>❌ Vulnerable Code Snippet</span>
                        </div>
                        <pre className="code-block vulnerable">
                          <code>{vuln.code_snippet}</code>
                        </pre>
                      </div>
                    )}

                    {(vuln.accurate_fix || vuln.suggested_fix) && (
                      <div className="vuln-code-block">
                        <div className="code-block-header fix">
                          <span>✅ How to fix it {vuln.accurate_fix && "(AI Generated Recommendation)"}</span>
                        </div>
                        <pre className="code-block fixed">
                          <code>{vuln.accurate_fix || vuln.suggested_fix}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
