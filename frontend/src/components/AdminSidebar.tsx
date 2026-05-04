import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminNotificationBell from "./AdminNotificationBell";

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const getAvatarUrl = (url: string | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('/static')) return `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${url}`;
    return url;
  };

  const navItems = [
    {
      path: "/admin",
      label: "Overview",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    },
    {
      path: "/admin/users",
      label: "User Management",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      path: "/admin/config",
      label: "Security & Config",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
    {
      path: "/admin/audit",
      label: "Audit Logs",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      path: "/admin/alerts",
      label: "System Alerts",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )
    }
  ];

  return (
    <aside 
      style={{ 
        width: 260, 
        height: "100vh", 
        backgroundColor: "var(--admin-bg-sidebar)",
        borderRight: "1px solid rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        color: "#f8f9fa",
        flexShrink: 0
      }}
    >
      <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 6, 
            background: "linear-gradient(135deg, var(--admin-accent-primary), #0056b3)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <span style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "1px", background: "linear-gradient(to right, #fff, #a0a0a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IndAI</span>
        </div>
        <AdminNotificationBell />
      </div>

      <nav style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link 
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                textDecoration: "none",
                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                backgroundColor: active ? "var(--admin-accent-primary)" : "transparent",
                fontWeight: active ? 600 : 500,
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseOut={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", position: "relative" }} ref={userMenuRef}>
        <Link 
          to="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            textDecoration: "none",
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            backgroundColor: "rgba(255,255,255,0.05)",
            marginBottom: 8
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          Switch to User View
        </Link>
        
        {isUserMenuOpen && (
          <div style={{
            position: "absolute",
            bottom: "75px",
            left: "16px",
            right: "16px",
            backgroundColor: "var(--admin-bg-card)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "8px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <Link 
              to="/profile" 
              onClick={() => setIsUserMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                color: "var(--admin-text-primary)",
                textDecoration: "none",
                fontSize: "0.9rem",
                borderRadius: "6px",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Profile Settings
            </Link>
            <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.1)", margin: "4px 0" }}></div>
            <button 
              onClick={() => { setIsUserMenuOpen(false); logout(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                color: "#ef4444",
                background: "transparent",
                border: "none",
                fontSize: "0.9rem",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        )}

        <div 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            padding: "8px 12px", 
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background 0.2s",
            backgroundColor: isUserMenuOpen ? "rgba(255,255,255,0.05)" : "transparent"
          }}
          onMouseOver={(e) => {
            if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
          }}
          onMouseOut={(e) => {
            if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div style={{ 
            width: 36, height: 36, borderRadius: "50%", 
            background: "rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 600, overflow: "hidden"
          }}>
            {user?.avatar_url ? (
              <img src={getAvatarUrl(user.avatar_url)} alt="Admin" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              user?.display_name?.charAt(0).toUpperCase() || 'A'
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {user?.display_name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--admin-accent-primary)", fontWeight: 600 }}>Superadmin</div>
          </div>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="2"
            style={{ 
              transform: isUserMenuOpen ? "rotate(180deg)" : "none", 
              transition: "transform 0.2s" 
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </aside>
  );
}
