import { useState, useEffect } from "react";
import apiService from "../services/api";
import { useToast } from "../components/ToastProvider";

interface AuditEntry {
  id: number;
  admin_id: number;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  update_role: { label: "Role Changed", color: "var(--admin-accent-primary)" },
  delete_user: { label: "User Deleted", color: "var(--admin-severity-danger)" },
  ban_user: { label: "User Banned", color: "var(--admin-severity-warning)" },
  login: { label: "Admin Login", color: "var(--admin-severity-success)" },
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiService.getAdminAuditLogs(page);
        setLogs(res.logs);
        setTotalPages(res.pages);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        showToast("Failed to load audit logs.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  const getActionStyle = (action: string) => {
    return actionLabels[action] || { label: action.replace(/_/g, " "), color: "var(--admin-text-secondary)" };
  };

  return (
    <div style={{ padding: "var(--space-xl)" }}>
      <div style={{ width: "100%", maxWidth: "1800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, color: "var(--admin-text-primary)" }}>Audit Logs</h1>
          <p style={{ color: "var(--admin-text-secondary)", marginTop: "8px" }}>
            Chronological record of all administrative actions for security compliance.
          </p>
        </div>

        {/* Timeline */}
        <div style={{ background: "var(--admin-bg-card)", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", padding: "24px", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
              <div className="scan-spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "var(--admin-accent-primary)", borderTopColor: "transparent" }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px", color: "var(--admin-text-secondary)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.4 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>No audit logs yet</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>Administrative actions will be recorded here automatically.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {logs.map((log, idx) => {
                const actionStyle = getActionStyle(log.action);
                return (
                  <div key={log.id} style={{ display: "flex", gap: "20px", padding: "20px 0", borderBottom: idx < logs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    {/* Timeline dot */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        backgroundColor: actionStyle.color,
                        boxShadow: `0 0 0 4px ${actionStyle.color}20`,
                        flexShrink: 0
                      }} />
                      {idx < logs.length - 1 && (
                        <div style={{ width: 2, flex: 1, backgroundColor: "rgba(0,0,0,0.08)", marginTop: 8 }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: actionStyle.color,
                            backgroundColor: `${actionStyle.color}15`,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {actionStyle.label}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--admin-text-secondary)", whiteSpace: "nowrap" }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                        </span>
                      </div>

                      <p style={{ margin: "0 0 8px 0", color: "var(--admin-text-primary)", fontSize: "0.95rem" }}>
                        <strong>{log.admin_email}</strong>
                        {log.details ? `: ${log.details}` : ""}
                      </p>

                      <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", color: "var(--admin-text-secondary)" }}>
                        {log.target_type && (
                          <span>Target: <strong>{log.target_type}</strong> #{log.target_id}</span>
                        )}
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 24 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
                  background: "var(--admin-bg-hover)", color: "var(--admin-text-primary)",
                  cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1
                }}
              >
                Previous
              </button>
              <span style={{ padding: "8px 16px", fontSize: "0.9rem", color: "var(--admin-text-secondary)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
                  background: "var(--admin-bg-hover)", color: "var(--admin-text-primary)",
                  cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
