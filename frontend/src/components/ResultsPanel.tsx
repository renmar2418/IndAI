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

  return (
    <div className="results-panel" id="results-panel">
      {/* Summary Bar */}
      <div className="results-summary" id="results-summary">
        <div className="summary-header">
          <h3>
            {total_issues === 0 ? "✅ No Vulnerabilities Found" : `⚠️ ${total_issues} Issue${total_issues > 1 ? "s" : ""} Found`}
          </h3>
          {summary.risk_score !== undefined && (
            <div
              className="risk-score"
              style={{
                color:
                  summary.risk_score > 60
                    ? "#ef4444"
                    : summary.risk_score > 30
                      ? "#eab308"
                      : "#22c55e",
              }}
            >
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

      {/* Vulnerability List */}
      <div className="vuln-list" id="vulnerability-list">
        {vulnerabilities.map((vuln: Vulnerability, index: number) => {
          const config = SEVERITY_CONFIG[vuln.severity] || SEVERITY_CONFIG.info;
          const isExpanded = expandedId === index;

          return (
            <div
              key={index}
              className={`vuln-card ${isExpanded ? "expanded" : ""}`}
              style={{ borderLeftColor: config.color }}
              onClick={() => setExpandedId(isExpanded ? null : index)}
            >
              <div className="vuln-header">
                <span
                  className="vuln-severity"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  {config.label}
                </span>
                <div className="vuln-title-group">
                  <h4 className="vuln-title">{vuln.title}</h4>
                  <span className="vuln-rule-id">{vuln.rule_id}</span>
                </div>
                {vuln.line_number && (
                  <span className="vuln-line">Line {vuln.line_number}</span>
                )}
                <svg
                  className={`vuln-chevron ${isExpanded ? "rotated" : ""}`}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </div>

              {isExpanded && (
                <div className="vuln-details">
                  <p className="vuln-description">{vuln.description}</p>

                  {vuln.owasp_category && (
                    <div className="vuln-owasp">
                      <span className="owasp-label">OWASP</span>
                      <span className="owasp-value">{vuln.owasp_category}</span>
                    </div>
                  )}

                  {vuln.code_snippet && (
                    <div className="vuln-code-block">
                      <div className="code-block-header">
                        <span>❌ Vulnerable Code</span>
                      </div>
                      <pre className="code-block vulnerable">
                        <code>{vuln.code_snippet}</code>
                      </pre>
                    </div>
                  )}

                  {vuln.suggested_fix && (
                    <div className="vuln-code-block">
                      <div className="code-block-header fix">
                        <span>✅ Suggested Fix</span>
                      </div>
                      <pre className="code-block fixed">
                        <code>{vuln.suggested_fix}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
