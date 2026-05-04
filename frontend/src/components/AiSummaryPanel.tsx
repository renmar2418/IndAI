/**
 * IndAI — AI Summary Panel
 * Displays AI-generated scan summary with multi-language selector.
 */

import { useState, useEffect } from "react";
import apiService from "../services/api";
import type { AiSummary } from "../types";
import { saveSummary } from "../utils/summaryCache";

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

function RobotAssistant({ isTalking }: { isTalking: boolean }) {
  return (
    <div className="robot-container">
      <div className="robot-antenna"></div>
      <div className="robot-head">
        <div className="robot-eyes">
          <div className="robot-eye"></div>
          <div className="robot-eye"></div>
        </div>
        <div className={`robot-mouth ${isTalking ? 'talking' : ''}`}></div>
      </div>
    </div>
  );
}

export default function AiSummaryPanel({ scanId, initialSummary }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<AiSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [displayText, setDisplayText] = useState("");

  // Auto-fetch summary on mount if not provided
  useEffect(() => {
    if (!initialSummary && scanId) {
      setLoading(true);
      apiService.getScanSummary(scanId, "en")
        .then((response) => {
          if (response.success) {
            setSummary(response.data);
            saveSummary(scanId, response.data);
          }
        })
        .catch(() => { })
        .finally(() => setLoading(false));
    }
  }, [scanId, initialSummary]);

  // Handle Typewriter Effect
  useEffect(() => {
    if (summary && !loading) {
      setIsTyping(true);
      setDisplayText("");
      let i = 0;
      const fullText = summary.summary_text;
      
      const timer = setInterval(() => {
        setDisplayText(fullText.slice(0, i));
        i += 2; // Type 2 chars at a time for speed
        if (i > fullText.length) {
          setDisplayText(fullText);
          clearInterval(timer);
          setIsTyping(false);
        }
      }, 15);
      
      return () => clearInterval(timer);
    }
  }, [summary, loading]);

  if (!summary && !loading) return null;

  return (
    <div className="ai-summary-panel" id="ai-summary-panel">
      <div
        className="ai-summary-header"
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="ai-summary-title" style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
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
          <span>AI Assistant Summary</span>
          {summary && (
            <span
              className="ai-risk-badge"
              style={{ background: `${RISK_COLORS[summary.risk_level]}20`, color: RISK_COLORS[summary.risk_level] }}
            >
              {summary.risk_level.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div 
        style={{ 
          display: 'grid', 
          gridTemplateRows: isExpanded ? '1fr' : '0fr', 
          transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="ai-summary-body" style={{ padding: isExpanded ? 'var(--space-lg)' : '0 var(--space-lg)' }}>
            {loading ? (
              <div className="ai-assistant-wrapper">
                <RobotAssistant isTalking={true} />
                <div className="ai-summary-bubble">
                  <div className="ai-summary-loading">
                    <span className="scan-spinner" />
                    Thinking...
                  </div>
                </div>
              </div>
            ) : summary ? (
              <div className="ai-assistant-wrapper">
                <RobotAssistant isTalking={isTyping} />
                <div className="ai-summary-bubble">
                  <div className="ai-summary-text">
                    {displayText.split("\n").map((line, i) => {
                      if (!line.trim() && i < displayText.split("\n").length - 1) return <br key={i} />;
                      
                      const words = line.split(/(\s+)/);
                      return (
                        <p key={i}>
                          {words.map((word, j) => {
                            const cleanWord = word.trim().replace(/[.,!?;:]/g, "");
                            if (cleanWord.length >= 3 && cleanWord === cleanWord.toUpperCase() && /[A-Z]/.test(cleanWord)) {
                              return <strong key={j}>{word}</strong>;
                            }
                            return word;
                          })}
                          {isTyping && i === displayText.split("\n").length - 1 && <span className="typing-cursor"></span>}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
