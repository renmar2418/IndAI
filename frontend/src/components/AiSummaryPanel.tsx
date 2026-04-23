/**
 * IndAI — AI Summary Panel
 * Displays AI-generated scan summary with multi-language selector.
 */

import { useState, useEffect } from "react";
import apiService from "../services/api";
import type { AiSummary } from "../types";

const LANGUAGES = [
  { code: "en", label: "🇬🇧 English" },
  { code: "tl", label: "🇵🇭 Tagalog" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "zh", label: "🇨🇳 中文" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "ko", label: "🇰🇷 한국어" },
];

const RISK_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  safe: "#22c55e",
};

interface AiSummaryPanelProps {
  scanId: number;
  initialSummary?: AiSummary | null;
}

export default function AiSummaryPanel({ scanId, initialSummary }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<AiSummary | null>(initialSummary || null);
  const [activeLang, setActiveLang] = useState(initialSummary?.language_code || "en");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-fetch summary on mount if not provided
  useEffect(() => {
    if (!initialSummary && scanId) {
      setLoading(true);
      apiService.getScanSummary(scanId, "en")
        .then((response) => {
          if (response.success) {
            setSummary(response.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [scanId, initialSummary]);

  async function switchLanguage(lang: string) {
    if (lang === activeLang && summary) return;

    setActiveLang(lang);
    setLoading(true);

    // If switching languages, automatically expand to show the result
    if (!isExpanded) {
      setIsExpanded(true);
    }

    try {
      const response = await apiService.getScanSummary(scanId, lang);
      if (response.success) {
        setSummary(response.data);
      }
    } catch {
      // Keep current summary if fetch fails
    } finally {
      setLoading(false);
    }
  }

  if (!summary && !loading) return null;

  return (
    <div className="ai-summary-panel" id="ai-summary-panel">
      <div 
        className="ai-summary-header" 
        style={{ cursor: "pointer" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="ai-summary-title">
          <button 
            className="ai-toggle-btn"
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--text-secondary)", 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>AI Security Summary</span>
          {summary && (
            <span
              className="ai-risk-badge"
              style={{ background: `${RISK_COLORS[summary.risk_level]}20`, color: RISK_COLORS[summary.risk_level] }}
            >
              {summary.risk_level.toUpperCase()}
            </span>
          )}
        </div>

        <div className="ai-lang-selector" onClick={(e) => e.stopPropagation()}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`ai-lang-btn ${activeLang === lang.code ? "active" : ""}`}
              onClick={() => switchLanguage(lang.code)}
              title={lang.label}
            >
              {lang.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="ai-summary-body">
            {loading ? (
              <div className="ai-summary-loading">
                <span className="scan-spinner" />
                Translating summary...
              </div>
            ) : summary ? (
              <div className="ai-summary-text">
                {summary.summary_text.split("\n").map((line, i) =>
                  line.trim() ? <p key={i}>{line}</p> : <br key={i} />
                )}
              </div>
            ) : null}
          </div>

          {summary && (
            <div className="ai-summary-footer">
              <span className="ai-summary-lang-label">
                🌐 {summary.language}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
