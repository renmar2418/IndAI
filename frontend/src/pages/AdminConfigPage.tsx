import { useState, useEffect } from "react";
import { useToast } from "../components/ToastProvider";
import apiService from "../services/api";

interface SystemSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: "security" | "platform" | "scanning";
}

const defaultSettings: SystemSetting[] = [
  {
    id: "maintenance_mode",
    label: "Maintenance Mode",
    description: "Disable all user access to the platform for scheduled maintenance. Only admins can log in.",
    enabled: false,
    category: "platform",
  },
  {
    id: "disable_signups",
    label: "Disable New Registrations",
    description: "Prevent new users from creating accounts. Existing users can still log in.",
    enabled: false,
    category: "platform",
  },
  {
    id: "enforce_2fa",
    label: "Enforce Two-Factor Authentication",
    description: "Require all users to set up 2FA before accessing the platform.",
    enabled: false,
    category: "security",
  },
  {
    id: "rate_limit_strict",
    label: "Strict Rate Limiting",
    description: "Limit scan API to 10 requests/minute per user to prevent abuse and cost overruns.",
    enabled: true,
    category: "security",
  },
  {
    id: "ai_verification",
    label: "AI Verification Mode",
    description: "Enable dual-AI cross-verification for all scan results to eliminate false positives.",
    enabled: true,
    category: "scanning",
  },
  {
    id: "auto_fix_generation",
    label: "Automatic Fix Generation",
    description: "Automatically generate code fix suggestions for all detected vulnerabilities.",
    enabled: true,
    category: "scanning",
  },
];

export default function AdminConfigPage() {
  const [settings, setSettings] = useState<SystemSetting[]>(defaultSettings);
  const [, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await apiService.getAdminConfig();
        const dbConfigs = res.configs;
        
        // Merge DB configs with defaultSettings metadata (labels, categories, etc.)
        const mergedSettings = defaultSettings.map(ds => {
          const dbMatch = dbConfigs.find((c: any) => c.key === ds.id);
          if (dbMatch) {
            return { ...ds, enabled: dbMatch.value };
          }
          return ds;
        });
        setSettings(mergedSettings);
      } catch (err) {
        console.error("Failed to load configs:", err);
        showToast("Failed to load configurations.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const toggleSetting = async (id: string) => {
    // Optimistic UI update
    const currentSetting = settings.find(s => s.id === id);
    if (!currentSetting) return;
    
    const newEnabled = !currentSetting.enabled;
    
    setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: newEnabled } : s));
    
    try {
      await apiService.updateAdminConfig(id, newEnabled);
      showToast(`${currentSetting.label} ${newEnabled ? "enabled" : "disabled"}`, "success");
    } catch (err) {
      // Revert on error
      setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !newEnabled } : s));
      showToast(`Failed to update ${currentSetting.label}`, "error");
    }
  };

  const categories = [
    { key: "platform", label: "Platform Settings", icon: "🏢" },
    { key: "security", label: "Security Rules", icon: "🔒" },
    { key: "scanning", label: "Scanning Configuration", icon: "🔍" },
  ];

  return (
    <div style={{ padding: "var(--space-xl)" }}>
      <div style={{ width: "100%", maxWidth: "1800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, color: "var(--admin-text-primary)" }}>Security & Configuration</h1>
          <p style={{ color: "var(--admin-text-secondary)", marginTop: "8px" }}>
            Manage platform-wide settings, security policies, and scanning behavior.
          </p>
        </div>

        {/* Settings Groups */}
        {categories.map(cat => {
          const catSettings = settings.filter(s => s.category === cat.key);
          return (
            <div key={cat.key} style={{ background: "var(--admin-bg-card)", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.3rem" }}>{cat.icon}</span>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0, color: "var(--admin-text-primary)" }}>{cat.label}</h2>
              </div>
              <div>
                {catSettings.map((setting, idx) => (
                  <div
                    key={setting.id}
                    style={{
                      padding: "20px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: idx < catSettings.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      gap: 24,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--admin-text-primary)", fontSize: "0.95rem", marginBottom: 4 }}>
                        {setting.label}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
                        {setting.description}
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleSetting(setting.id)}
                      style={{
                        width: 48,
                        height: 26,
                        borderRadius: 13,
                        border: "none",
                        padding: 2,
                        cursor: "pointer",
                        backgroundColor: setting.enabled ? "var(--admin-severity-success)" : "rgba(0,0,0,0.15)",
                        position: "relative",
                        transition: "background-color 0.3s",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: "#fff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          transition: "transform 0.3s",
                          transform: setting.enabled ? "translateX(22px)" : "translateX(0)",
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
