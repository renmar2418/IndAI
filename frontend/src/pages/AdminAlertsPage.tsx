import { useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "../components/ToastProvider";

interface AlertEntry {
  id: number;
  type: "security" | "system" | "performance";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  details?: string;
}

const mockAlerts: AlertEntry[] = [
  {
    id: 1,
    type: "security",
    severity: "critical",
    title: "Credential Stuffing Detected",
    message: "50 failed login attempts from IP 203.0.113.45 in the last 5 minutes.",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    resolved: false,
    details: "Attack Type: Brute Force / Credential Stuffing. The attacker is cycling through a dictionary of common passwords against multiple user accounts. IP has been temporarily blocked."
  },
  {
    id: 2,
    type: "security",
    severity: "warning",
    title: "API Abuse — Excessive Scans",
    message: "User ID #42 submitted 200 scans in the last hour, exceeding the 50/hour threshold.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    resolved: false,
    details: "Attack Type: API Abuse / Resource Exhaustion (DDoS variant). This may be an attempt to rack up your AI API costs or crash the scanning backend by overwhelming the worker queue."
  },
  {
    id: 3,
    type: "system",
    severity: "warning",
    title: "Database Connection Pool Exhausted",
    message: "MySQL pool reached 95% capacity. Queries are starting to queue.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    resolved: false,
    details: "Cause: High concurrent load or long-running queries. Maintenance Action: Consider increasing pool_size in SQLAlchemy config or optimizing slow queries in the scan pipeline."
  },
  {
    id: 4,
    type: "performance",
    severity: "info",
    title: "Groq API Latency Spike",
    message: "Average response time from Groq API increased to 4.2s (baseline: 1.5s).",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    resolved: true,
    details: "This is an external dependency issue. Groq may be experiencing temporary load. The system automatically retried failed requests. No data was lost."
  },
  {
    id: 5,
    type: "security",
    severity: "info",
    title: "Data Exfiltration Attempt Blocked",
    message: "User ID #78 attempted to bulk-export 500 scan reports in 2 minutes.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    resolved: true,
    details: "Attack Type: Data Exfiltration. Rate limiter blocked the request after the 20th export. User account has been flagged for review."
  },
];

const severityStyles: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: "rgba(220, 53, 69, 0.08)", color: "var(--admin-severity-danger)", border: "rgba(220, 53, 69, 0.2)" },
  warning: { bg: "rgba(255, 193, 7, 0.08)", color: "var(--admin-severity-warning)", border: "rgba(255, 193, 7, 0.2)" },
  info: { bg: "rgba(13, 202, 240, 0.08)", color: "var(--admin-severity-info)", border: "rgba(13, 202, 240, 0.2)" },
};

const typeIcons: Record<string, ReactNode> = {
  security: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
  system: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ),
  performance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertEntry[]>(mockAlerts);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "security" | "system" | "performance">("all");
  const { showToast } = useToast();

  const resolveAlert = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    showToast("Alert marked as resolved.", "success");
  };

  const filteredAlerts = filter === "all" ? alerts : alerts.filter(a => a.type === filter);

  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div style={{ padding: "var(--space-xl)" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, color: "var(--admin-text-primary)" }}>System Alerts & Threat Intelligence</h1>
            <p style={{ color: "var(--admin-text-secondary)", marginTop: "8px" }}>
              Security events, infrastructure diagnostics, and automated threat detection.
            </p>
          </div>
          {unresolvedCount > 0 && (
            <div style={{
              padding: "8px 16px", borderRadius: 8,
              background: "rgba(220, 53, 69, 0.1)", color: "var(--admin-severity-danger)",
              fontWeight: 600, fontSize: "0.9rem",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--admin-severity-danger)", animation: "pulse 2s infinite" }} />
              {unresolvedCount} Unresolved Alert{unresolvedCount > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "security", "system", "performance"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.1)",
                background: filter === f ? "var(--admin-accent-primary)" : "var(--admin-bg-card)",
                color: filter === f ? "#fff" : "var(--admin-text-secondary)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {f === "all" ? `All (${alerts.length})` : `${f} (${alerts.filter(a => a.type === f).length})`}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAlerts.length === 0 ? (
            <div style={{
              background: "var(--admin-bg-card)", borderRadius: 12, padding: "64px",
              textAlign: "center", color: "var(--admin-text-secondary)",
              border: "1px solid rgba(0,0,0,0.05)"
            }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>No alerts in this category.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const style = severityStyles[alert.severity];
              const isExpanded = expandedId === alert.id;
              return (
                <div
                  key={alert.id}
                  style={{
                    background: "var(--admin-bg-card)",
                    borderRadius: 12,
                    border: `1px solid ${alert.resolved ? "rgba(0,0,0,0.05)" : style.border}`,
                    overflow: "hidden",
                    opacity: alert.resolved ? 0.6 : 1,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Alert Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                    style={{
                      padding: "20px 24px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                    }}
                  >
                    <div style={{ color: style.color, marginTop: 2, flexShrink: 0 }}>
                      {typeIcons[alert.type]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem",
                          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                          color: style.color, background: style.bg,
                        }}>
                          {alert.severity}
                        </span>
                        <span style={{
                          padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem",
                          fontWeight: 600, textTransform: "uppercase",
                          color: "var(--admin-text-secondary)", background: "rgba(0,0,0,0.05)",
                        }}>
                          {alert.type}
                        </span>
                        {alert.resolved && (
                          <span style={{
                            padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem",
                            fontWeight: 600, color: "var(--admin-severity-success)", background: "rgba(25, 135, 84, 0.1)",
                          }}>
                            ✓ RESOLVED
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--admin-text-primary)", fontSize: "1rem", marginBottom: 4 }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
                        {alert.message}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--admin-text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                    <svg
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-secondary)" strokeWidth="2"
                      style={{ flexShrink: 0, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ padding: "0 24px 20px 60px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{
                        padding: "16px 20px", marginTop: 16,
                        background: style.bg, borderRadius: 8, border: `1px solid ${style.border}`,
                        fontSize: "0.9rem", color: "var(--admin-text-primary)", lineHeight: 1.6,
                      }}>
                        {alert.details}
                      </div>
                      {!alert.resolved && (
                        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id); }}
                            style={{
                              padding: "8px 20px", borderRadius: 8, border: "none",
                              background: "var(--admin-severity-success)", color: "#fff",
                              fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                            }}
                          >
                            Mark as Resolved
                          </button>
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
    </div>
  );
}
