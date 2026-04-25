/**
 * IndAI — Dashboard Page
 * Shows scan statistics, recent scan history with delete + OWASP suggestions.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DashboardData, OwaspSuggestion, Severity } from "../types";
import apiService from "../services/api";
import { useToast } from "../components/ToastProvider";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { DashboardSkeleton } from "../components/SkeletonLoader";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; language: string; name: string } | null>(null);
  const [animatingDeleteId, setAnimatingDeleteId] = useState<number | null>(null);
  const [scanNames, setScanNames] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem("indai_scan_names");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [suggestions, setSuggestions] = useState<OwaspSuggestion[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsFor, setSuggestionsFor] = useState<number | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Initial load (shows loading spinner)
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await apiService.getDashboard();
      if (response.success) {
        setData(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  // Silent refresh — updates data without showing the loading spinner
  const silentRefresh = useCallback(async () => {
    try {
      const response = await apiService.getDashboard();
      if (response.success) {
        setData(response.data);
      }
    } catch {
      // Silent — don't show errors on background refreshes
    }
  }, []);

  // Auto-refresh every 30s + refresh on tab focus
  useAutoRefresh(silentRefresh, { interval: 30000, refreshOnFocus: true });

  // Show confirmation modal instead of browser confirm()
  function requestDelete(scanId: number, language: string, customName?: string) {
    setConfirmDelete({ id: scanId, language, name: customName || `Scan #${scanId}` });
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    const scanId = confirmDelete.id;
    const scanName = confirmDelete.name;
    setConfirmDelete(null);

    setDeletingId(scanId);
    try {
      await apiService.deleteScan(scanId);
      
      setAnimatingDeleteId(scanId);
      setTimeout(() => {
        setData((prevData) => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            recent_scans: prevData.recent_scans.filter((s) => s.id !== scanId),
            stats: {
              ...prevData.stats,
              total_scans: prevData.stats.total_scans - 1,
            },
          };
        });
        setAnimatingDeleteId(null);
      }, 400);

      showToast(`${scanName} deleted successfully`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to delete scan", "error");
    } finally {
      setDeletingId(null);
    }
  }

  function startRename(scanId: number) {
    setEditingName(scanId);
    setEditValue(scanNames[scanId] || "");
  }

  function saveRename(scanId: number) {
    const trimmed = editValue.trim();
    const next = { ...scanNames };
    if (trimmed) {
      next[scanId] = trimmed;
    } else {
      delete next[scanId];
    }
    setScanNames(next);
    localStorage.setItem("indai_scan_names", JSON.stringify(next));
    setEditingName(null);
    setEditValue("");
  }

  function handleNameKeyDown(e: React.KeyboardEvent, scanId: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRename(scanId);
    }
    if (e.key === "Escape") {
      setEditingName(null);
      setEditValue("");
    }
  }

  async function handleVulnClick(scanId: number, vulnCount: number) {
    if (vulnCount === 0) return; // No vulns to suggest for

    if (suggestionsFor === scanId) {
      // Toggle off
      setSuggestions(null);
      setSuggestionsFor(null);
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsFor(scanId);

    try {
      const response = await apiService.getOwaspSuggestions(scanId);
      if (response.success) {
        setSuggestions(response.data.suggestions);
      }
    } catch (err: any) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="dashboard-page" id="dashboard-page">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadDashboard} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recent_scans, available_rules } = data;

  return (
    <div className="dashboard-page" id="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome Back, <span className="user-name-highlight">{data.user.display_name}</span>
          </p>
        </div>
        <Link to="/scan" className="btn-primary" id="quick-scan-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          New Scan
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" id="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon cyan">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="stat-card-data">
            <span className="stat-card-number">{stats.total_scans}</span>
            <span className="stat-card-label">Total Scans</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="stat-card-data">
            <span className="stat-card-number">{stats.total_vulnerabilities}</span>
            <span className="stat-card-label">Vulnerabilities Found</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <div className="stat-card-data">
            <span className="stat-card-number">{stats.scans_with_fixes}</span>
            <span className="stat-card-label">Fixes Generated</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className="stat-card-data">
            <span className="stat-card-number">{available_rules}</span>
            <span className="stat-card-label">Active Rules</span>
          </div>
        </div>
      </div>

      {/* Realtime Charts */}
      {recent_scans.length > 0 && (
        <div className="charts-grid" id="charts-section">
          {/* Donut Chart — Severity Breakdown */}
          <div className="chart-card">
            <h3 className="chart-card-title">Severity Breakdown</h3>
            {(() => {
              // Aggregate severity counts from all scans (realtime from API data)
              const severityCounts: Record<string, number> = {};
              let total = 0;
              recent_scans.forEach((s) => {
                // We only have vulnerability_count per scan — split by language as proxy
                if (s.vulnerability_count > 0) {
                  const key = s.language;
                  severityCounts[key] = (severityCounts[key] || 0) + s.vulnerability_count;
                  total += s.vulnerability_count;
                }
              });
              // Also count clean scans
              const cleanCount = recent_scans.filter((s) => s.vulnerability_count === 0).length;
              if (cleanCount > 0) {
                severityCounts["Clean"] = cleanCount;
                total += cleanCount;
              }

              if (total === 0) {
                return <div className="chart-empty">✅ All scans are clean!</div>;
              }

              const colors: Record<string, string> = {
                Python: "#ef4444", JavaScript: "#eab308", TypeScript: "#3b82f6",
                Java: "#f97316", "C#": "#a855f7", PHP: "#ec4899", Go: "#22c55e",
                Ruby: "#ef4444", Rust: "#f97316", Clean: "#22c55e",
              };
              const entries = Object.entries(severityCounts);
              const radius = 50;
              const cx = 65;
              const cy = 65;
              let cumulative = 0;

              return (
                <div className="donut-chart">
                  <svg width="130" height="130" viewBox="0 0 130 130">
                    {entries.map(([label, count], i) => {
                      const pct = count / total;
                      const dashArray = 2 * Math.PI * radius;
                      const dashOffset = dashArray * (1 - pct);
                      const rotation = cumulative * 360 - 90;
                      cumulative += pct;
                      const color = colors[label] || `hsl(${i * 60}, 70%, 55%)`;
                      return (
                        <circle
                          key={label}
                          cx={cx}
                          cy={cy}
                          r={radius}
                          fill="none"
                          stroke={color}
                          strokeWidth="18"
                          strokeDasharray={`${dashArray}`}
                          strokeDashoffset={dashOffset}
                          transform={`rotate(${rotation} ${cx} ${cy})`}
                          style={{ transition: "stroke-dashoffset 0.6s ease" }}
                        />
                      );
                    })}
                    <text x={cx} y={cy - 4} textAnchor="middle" className="donut-center-text">{total}</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" className="donut-center-label">Issues</text>
                  </svg>
                  <div className="donut-legend">
                    {entries.map(([label, count], i) => (
                      <span key={label} className="donut-legend-item">
                        <span className="donut-legend-dot" style={{ background: colors[label] || `hsl(${i * 60}, 70%, 55%)` }} />
                        {label}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bar Chart — Scan History by Date */}
          <div className="chart-card">
            <h3 className="chart-card-title">Scan History</h3>
            {(() => {
              // Group scans by date (realtime)
              const dateMap: Record<string, { count: number; vulns: number }> = {};
              recent_scans.forEach((s) => {
                const d = new Date(s.created_at.endsWith("Z") ? s.created_at : s.created_at + "Z");
                const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                if (!dateMap[key]) dateMap[key] = { count: 0, vulns: 0 };
                dateMap[key].count++;
                dateMap[key].vulns += s.vulnerability_count;
              });
              const entries = Object.entries(dateMap).slice(-10); // Last 10 days
              const maxCount = Math.max(...entries.map(([, v]) => v.count), 1);

              return (
                <div className="bar-chart-container">
                  {entries.map(([date, { count, vulns }]) => (
                    <div key={date} className="bar-column">
                      <span className="bar-value">{count}</span>
                      <div
                        className="bar-fill"
                        style={{
                          height: `${(count / maxCount) * 100}%`,
                          background: vulns > 0
                            ? "linear-gradient(180deg, #ef4444, #f97316)"
                            : "linear-gradient(180deg, #22c55e, #00f0ff)",
                        }}
                        title={`${count} scans, ${vulns} vulns`}
                      />
                      <span className="bar-label">{date}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Recent Scans */}
      <div className="dashboard-section" id="recent-scans-section">
        <div className="section-header">
          <h2>Recent Scans</h2>
          <span className="section-count">{recent_scans.length} scans</span>
        </div>

        {recent_scans.length === 0 ? (
          <div className="empty-scans">
            <p>No scans yet. Start your first code security audit!</p>
            <Link to="/scan" className="btn-primary">
              Start Scanning
            </Link>
          </div>
        ) : (
          <div className="scans-table-wrapper">
            <table className="scans-table" id="scans-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Vulnerabilities</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent_scans.map((scan) => (
                  <tr key={scan.id} className={`scan-row ${animatingDeleteId === scan.id ? "deleting-exit" : ""}`}>
                    <td>
                      {editingName === scan.id ? (
                        <div className="scan-name-edit">
                          <input
                            className="scan-name-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleNameKeyDown(e, scan.id)}
                            onBlur={() => saveRename(scan.id)}
                            placeholder={`Scan #${scan.id}`}
                            autoFocus
                            maxLength={40}
                          />
                        </div>
                      ) : (
                        <button className="scan-name-btn" onClick={() => startRename(scan.id)} title="Click to rename">
                          <span className="scan-name-text">{scanNames[scan.id] || `Scan #${scan.id}`}</span>
                          <svg className="scan-name-pencil" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                        </button>
                      )}
                    </td>
                    <td>
                      <span className="language-badge">{scan.language}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${scan.status}`}>
                        {scan.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`vuln-count-btn ${scan.vulnerability_count > 0 ? "has-vulns" : "clean"
                          } ${suggestionsFor === scan.id ? "active" : ""}`}
                        onClick={() =>
                          handleVulnClick(scan.id, scan.vulnerability_count)
                        }
                        title={
                          scan.vulnerability_count > 0
                            ? "Click for OWASP remediation suggestions"
                            : "No vulnerabilities"
                        }
                      >
                        {scan.vulnerability_count}
                        {scan.vulnerability_count > 0 && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="scan-date">
                      {new Date(scan.created_at.endsWith("Z") ? scan.created_at : scan.created_at + "Z").toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }) + " (+8:00)"}
                    </td>
                    <td>
                      <div className="scan-actions">
                        <button
                          className="btn-view"
                          onClick={() => navigate(`/scan/${scan.id}`)}
                        >
                          View
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => requestDelete(scan.id, scan.language, scanNames[scan.id])}
                          disabled={deletingId === scan.id}
                          title="Delete scan"
                        >
                          {deletingId === scan.id ? (
                            <span className="scan-spinner" />
                          ) : (
                            <>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="3,6 5,6 21,6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* OWASP Suggestions Panel */}
        {suggestionsFor && (
          <div className="owasp-panel" id="owasp-suggestions">
            <div className="owasp-panel-header">
              <div className="owasp-panel-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h3>OWASP Remediation — Scan #{suggestionsFor}</h3>
              </div>
              <button
                className="owasp-close"
                onClick={() => {
                  setSuggestions(null);
                  setSuggestionsFor(null);
                }}
              >
                ✕
              </button>
            </div>

            {suggestionsLoading ? (
              <div className="owasp-loading">
                <span className="scan-spinner" /> Loading suggestions...
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              <div className="owasp-suggestions-list">
                {suggestions.map((s, i) => (
                  <div key={i} className="owasp-suggestion-card">
                    <div className="owasp-suggestion-header">
                      <span
                        className="owasp-priority"
                        data-priority={s.priority}
                      >
                        P{s.priority}
                      </span>
                      <span className="owasp-category">{s.owasp_category}</span>
                      <span
                        className="owasp-severity"
                        style={{ color: SEVERITY_COLORS[s.worst_severity] }}
                      >
                        {s.worst_severity.toUpperCase()} × {s.vulnerability_count}
                      </span>
                    </div>

                    <p className="owasp-solution">{s.solution}</p>

                    <div className="owasp-steps">
                      <span className="owasp-steps-label">Recommended Steps:</span>
                      <ol>
                        {s.steps.map((step, j) => (
                          <li key={j}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {s.affected_rules.length > 0 && (
                      <div className="owasp-affected">
                        <span className="owasp-affected-label">Found in:</span>
                        {s.affected_rules.map((rule, k) => (
                          <span key={k} className="owasp-rule-tag">{rule}</span>
                        ))}
                      </div>
                    )}

                    <a
                      href={s.reference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="owasp-reference"
                    >
                      📖 Read OWASP Guide →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="owasp-empty">
                ✅ No vulnerabilities found — this code is clean!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal — centered overlay */}
      {confirmDelete && (
        <div className="confirm-overlay" id="confirm-delete-modal" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="confirm-title">Delete {confirmDelete.name}?</h3>
            <p className="confirm-desc">
              This <strong>{confirmDelete.language}</strong> scan will be permanently removed. This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-btn-keep"
                onClick={() => setConfirmDelete(null)}
              >
                No, I keep it
              </button>
              <button
                className="confirm-btn-delete"
                onClick={executeDelete}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
