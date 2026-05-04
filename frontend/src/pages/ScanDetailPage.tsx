/**
 * IndAI — Scan Detail Page
 * Shows detailed view of a past scan with original vs corrected code
 * and a mini AI summary (2 sentences).
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { ScanDetailData, Severity } from "../types";
import ExportButton from "../components/ExportButton";
import apiService from "../services/api";
import { getSummary, saveSummary } from "../utils/summaryCache";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  safe: "#22c55e",
};

export default function ScanDetailPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [data, setData] = useState<ScanDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"original" | "corrected">("original");

  // Mini AI Summary state
  const [miniSummary, setMiniSummary] = useState<{
    summary_text: string;
    risk_level: string;
    language: string;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

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

        // Load AI summary: check local cache first, then fall back to API
        const cached = getSummary(id);
        if (cached) {
          setMiniSummary(cached);
        } else {
          setSummaryLoading(true);
          try {
            const summaryRes = await apiService.getScanSummary(id, "en");
            if (summaryRes.success) {
              setMiniSummary(summaryRes.data);
              saveSummary(id, summaryRes.data);
            }
          } catch {
            // Silently fail — mini summary is optional
          } finally {
            setSummaryLoading(false);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load scan details");
    } finally {
      setLoading(false);
    }
  }

  // Extract first 4 sentences from the AI summary
  function getMiniText(fullText: string): string {
    const sentences = fullText
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    return sentences.slice(0, 4).join(" ");
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

  const { scan, summary } = data;

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
          <h1>{scan.scan_name || `Scan #${scan.id}`}</h1>
          <span className={`status-badge ${scan.status}`}>{scan.status}</span>
        </div>
        <div className="detail-meta">
          <span>Language: <strong>{scan.language}</strong></span>
          <span>•</span>
          <span>
            Date:{" "}
            <strong>
              {new Date(scan.created_at.endsWith?.('Z') ? scan.created_at : scan.created_at + 'Z').toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
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

      {/* Mini AI Summary — replaces the long vulnerability list */}
      <div className="mini-ai-summary" id="mini-ai-summary">
        <div className="mini-ai-header">
          <div className="mini-ai-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>AI Security Insight</span>
            {miniSummary && (
              <span
                className="ai-risk-badge"
                style={{
                  background: `${RISK_COLORS[miniSummary.risk_level] || "#6b7280"}20`,
                  color: RISK_COLORS[miniSummary.risk_level] || "#6b7280",
                }}
              >
                {miniSummary.risk_level.toUpperCase()}
              </span>
            )}
          </div>
          <span className="mini-ai-issues">
            {scan.vulnerability_count} issue{scan.vulnerability_count !== 1 ? "s" : ""} detected
          </span>
        </div>

        <div className="mini-ai-body">
          {summaryLoading ? (
            <div className="mini-ai-loading">
              <span className="scan-spinner" />
              <span>Generating insight...</span>
            </div>
          ) : miniSummary ? (
            <p className="mini-ai-text">
              {getMiniText(miniSummary.summary_text).split(/([\s]+)/).map((word, j) => {
                const cleanWord = word.trim().replace(/[.,!?;:]/g, "");
                if (cleanWord.length >= 3 && cleanWord === cleanWord.toUpperCase() && /[A-Z]/.test(cleanWord)) {
                  return <strong key={j}>{word}</strong>;
                }
                return word;
              })}
            </p>
          ) : scan.vulnerability_count === 0 ? (
            <p className="mini-ai-text" style={{ color: "var(--accent-green)" }}>
              No security issues were detected. This code appears to follow safe coding practices.
            </p>
          ) : (
            <p className="mini-ai-text" style={{ color: "var(--text-muted)" }}>
              AI summary is not available for this scan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

