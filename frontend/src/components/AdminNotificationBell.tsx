import { useState, useEffect, useRef } from "react";
import apiService from "../services/api";
import { useToast } from "./ToastProvider";

export default function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await apiService.getAdminAlerts();
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    }
  };

  const unreadCount = alerts.filter(a => a.unread).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setAlerts(alerts.map(a => ({ ...a, unread: false })));
  };

  const clearAlerts = async () => {
    try {
      await apiService.clearAdminAlerts();
      setAlerts([]);
      showToast("Alerts cleared", "success");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to clear alerts", err);
    }
  };

  const handleBlacklist = async (ip: string) => {
    try {
      await apiService.blacklistIP(ip, "Blacklisted from notification alert");
      showToast(`IP ${ip} has been permanently blacklisted`, "success");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to blacklist IP";
      showToast(msg, "error");
    }
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          position: "relative",
          cursor: "pointer",
          padding: 8,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.7)";
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 6,
            right: 8,
            width: 8,
            height: 8,
            backgroundColor: "var(--admin-severity-danger)",
            borderRadius: "50%",
            boxShadow: "0 0 0 2px var(--admin-bg-sidebar)"
          }} />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            style={{ 
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: "rgba(0,0,0,0.6)", 
              backdropFilter: "blur(4px)",
              zIndex: 9998 
            }} 
          />
          
          {/* Centered Modal */}
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 450,
            backgroundColor: "var(--admin-bg-card)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            zIndex: 9999,
            overflow: "hidden",
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--admin-text-primary)" }}>Diagnostics & Alerts</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  style={{ background: "none", border: "none", color: "var(--admin-accent-primary)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {alerts.length === 0 ? (
                <div style={{ padding: "48px 32px", textAlign: "center", color: "var(--admin-text-secondary)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.3 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <div style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--admin-text-primary)", marginBottom: 4 }}>System is healthy</div>
                  <div style={{ fontSize: "0.9rem" }}>No active alerts or warnings.</div>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} style={{ 
                    padding: "20px 24px", 
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: alert.unread ? "rgba(255,255,255,0.03)" : "transparent"
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ 
                        width: 10, height: 10, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                        backgroundColor: alert.type === 'security' ? 'var(--admin-severity-danger)' : 'var(--admin-severity-warning)',
                        boxShadow: `0 0 0 4px ${alert.type === 'security' ? 'rgba(220,53,69,0.1)' : 'rgba(255,193,7,0.1)'}`
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--admin-text-primary)", marginBottom: 6 }}>
                          {alert.title}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "var(--admin-text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
                          {alert.message}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--admin-text-secondary)", opacity: 0.7, fontWeight: 500 }}>
                            {alert.time}
                          </div>
                          {/* Extract IP and show Ban button if present */}
                          {alert.message.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/) && (
                            <button 
                              onClick={() => handleBlacklist(alert.message.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)[0])}
                              style={{
                                background: "rgba(220, 53, 69, 0.1)",
                                border: "1px solid rgba(220, 53, 69, 0.2)",
                                color: "var(--admin-severity-danger)",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = "var(--admin-severity-danger)"; e.currentTarget.style.color = "#fff"; }}
                              onMouseOut={e => { e.currentTarget.style.background = "rgba(220, 53, 69, 0.1)"; e.currentTarget.style.color = "var(--admin-severity-danger)"; }}
                            >
                              Ban IP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {alerts.length > 0 && (
                <button 
                  onClick={clearAlerts}
                  style={{ flex: 1, padding: "16px", background: "none", border: "none", color: "var(--admin-text-secondary)", fontSize: "0.9rem", cursor: "pointer", fontWeight: 500, borderRight: "1px solid rgba(255,255,255,0.1)" }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Clear all
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", color: "var(--admin-text-primary)", fontSize: "0.9rem", cursor: "pointer", fontWeight: 600 }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"}
                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
