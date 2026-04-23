/**
 * IndAI — Scan Detail Page
 * Shows detailed view of a past scan with original vs corrected code
 * and full vulnerability breakdown.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { ScanDetailData, Severity } from "../types";
import ExportButton from "../components/ExportButton";
import apiService from "../services/api";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

export default function ScanDetailPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [data, setData] = useState<ScanDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"original" | "corrected">("original");

  useEffect(() => {
    if (scanId) {
      loadScanDetail(parseInt(scanId));
    }
  }, [scanId]);

  async function loadScanDetail(id: number) {
    try {
      setLoading(true);
      const response = await apiService.getScanDetail(id);
      if (response.success) {
        setData(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load scan details");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="detail-page" id="scan-detail-page">
        <div className="page-loader inline">
          <div className="scanner-animation small">
            <div className="scanner-ring" />
          </div>
          <p>Loading scan details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="detail-page" id="scan-detail-page">
        <div className="error-state">
          <p>❌ {error || "Scan not found"}</p>
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { scan, vulnerabilities, summary } = data;

  return (
    <div className="detail-page" id="scan-detail-page">
      <div className="detail-header">
        <Link to="/dashboard" className="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="detail-title-row">
          <h1>Scan #{scan.id}</h1>
          <span className={`status-badge ${scan.status}`}>{scan.status}</span>
        </div>
        <div className="detail-meta">
          <span>Language: <strong>{scan.language}</strong></span>
          <span>•</span>
          <span>
            Date:{" "}
            <strong>
              {new Date(scan.created_at).toLocaleString()}
            </strong>
          </span>
          <span>•</span>
          <span>
            Issues: <strong>{scan.vulnerability_count}</strong>
          </span>
        </div>
      </div>

      {/* Severity Summary */}
      <div className="detail-summary">
        {(Object.keys(summary.by_severity) as Severity[]).map((sev) => {
          const count = summary.by_severity[sev];
          if (count === 0) return null;
          return (
            <div
              key={sev}
              className="summary-chip"
              style={{
                borderColor: SEVERITY_COLORS[sev],
                color: SEVERITY_COLORS[sev],
              }}
            >
              {sev.toUpperCase()}: {count}
            </div>
          );
        })}
      </div>

      {/* Code Comparison Tabs */}
      <div className="code-comparison" id="code-comparison">
        <div className="comparison-tabs">
          <button
            className={`tab-btn ${activeTab === "original" ? "active" : ""}`}
            onClick={() => setActiveTab("original")}
          >
            ❌ Original Code
          </button>
          <button
            className={`tab-btn ${activeTab === "corrected" ? "active" : ""}`}
            onClick={() => setActiveTab("corrected")}
          >
            ✅ Corrected Code
          </button>
          {scan.corrected_code && (
            <div className="comparison-export">
              <ExportButton
                code={scan.corrected_code}
                language={scan.language}
                disabled={!scan.corrected_code}
              />
            </div>
          )}
        </div>
        <pre className="comparison-code">
          <code>
            {activeTab === "original"
              ? scan.original_code
              : scan.corrected_code || "No corrections needed."}
          </code>
        </pre>
      </div>

      {/* Vulnerability Details */}
      <div className="detail-vulns" id="detail-vulnerabilities">
        <h2>Vulnerabilities ({vulnerabilities.length})</h2>
        {vulnerabilities.map((vuln, i) => (
          <div
            key={i}
            className="detail-vuln-card"
            style={{ borderLeftColor: SEVERITY_COLORS[vuln.severity] || "#6b7280" }}
          >
            <div className="detail-vuln-header">
              <span
                className="severity-tag"
                style={{
                  backgroundColor: `${SEVERITY_COLORS[vuln.severity]}18`,
                  color: SEVERITY_COLORS[vuln.severity],
                }}
              >
                {vuln.severity.toUpperCase()}
              </span>
              <h3>{vuln.title}</h3>
              {vuln.line_number && (
                <span className="line-tag">Line {vuln.line_number}</span>
              )}
            </div>
            <p className="detail-vuln-desc">{vuln.description}</p>
            {vuln.owasp_category && (
              <span className="owasp-tag">{vuln.owasp_category}</span>
            )}
            {vuln.code_snippet && (
              <pre className="code-block vulnerable">
                <code>{vuln.code_snippet}</code>
              </pre>
            )}
            {vuln.suggested_fix && (
              <pre className="code-block fixed">
                <code>{vuln.suggested_fix}</code>
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
