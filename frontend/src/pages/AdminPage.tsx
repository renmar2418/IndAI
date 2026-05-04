import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import apiService from "../services/api";
import { useToast } from "../components/ToastProvider";

// Mock data for Recharts (to be replaced by actual aggregated backend data)
const scanTrendData = [
  { date: 'Mon', scans: 12 },
  { date: 'Tue', scans: 19 },
  { date: 'Wed', scans: 15 },
  { date: 'Thu', scans: 25 },
  { date: 'Fri', scans: 32 },
  { date: 'Sat', scans: 14 },
  { date: 'Sun', scans: 28 },
];

const vulnDistData = [
  { severity: 'Critical', count: 5, fill: 'var(--admin-severity-danger)' },
  { severity: 'High', count: 18, fill: 'var(--admin-severity-warning)' },
  { severity: 'Medium', count: 42, fill: 'var(--admin-severity-info)' },
  { severity: 'Low', count: 88, fill: '#6c757d' },
];

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>({ scanTrendData: [], vulnDistData: [] });
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, healthRes] = await Promise.all([
          apiService.getAdminDashboard(),
          apiService.getSystemHealth()
        ]);
        
        setStats(dashRes.stats);
        if (dashRes.charts) {
          setCharts(dashRes.charts);
        }
        setHealth(healthRes);
      } catch (err) {
        console.error("Failed to load admin data:", err);
        showToast("Failed to load admin dashboard data.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    // Poll health every 5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await apiService.getSystemHealth();
        setHealth(res);
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="scan-spinner" style={{ width: 40, height: 40, borderWidth: 3, borderColor: 'var(--admin-accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      <div style={{ width: '100%', maxWidth: '1800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--admin-text-primary)' }}>System Overview</h1>
            <p style={{ color: 'var(--admin-text-secondary)', marginTop: '8px' }}>Real-time platform metrics and performance indicators.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                await apiService.downloadComplianceReport();
                showToast("Compliance report downloaded", "success");
              } catch (e) {
                showToast("Failed to download report", "error");
              }
            }}
            style={{
              background: 'var(--admin-bg-hover)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--admin-text-primary)',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--admin-bg-hover)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
        </div>

        {/* Live Infrastructure Health */}
        {health && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
            <HealthGauge title="CPU Load" value={health.cpu_usage} suffix="%" isWarning={health.cpu_usage > 80} />
            <HealthGauge title="Memory Usage" value={health.memory_usage} suffix="%" isWarning={health.memory_usage > 85} />
            <div style={{ background: 'var(--admin-bg-card)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--admin-text-secondary)', fontWeight: 600, marginBottom: 8 }}>Database Status</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: health.db_status === 'Healthy' ? 'var(--admin-severity-success)' : 'var(--admin-severity-danger)' }}>
                  {health.db_status}
                </div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: health.db_status === 'Healthy' ? 'rgba(25, 135, 84, 0.1)' : 'rgba(220, 53, 69, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={health.db_status === 'Healthy' ? 'var(--admin-severity-success)' : 'var(--admin-severity-danger)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              </div>
            </div>
          </div>
        )}

        {/* KPIs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-lg)' }}>
          <KpiCard title="Total Users" value={stats?.totalUsers || 0} trend="+12% this week" icon="users" />
          <KpiCard title="Total Scans" value={stats?.totalScans || 0} trend="+5% this week" icon="activity" color="var(--admin-accent-primary)" />
          <KpiCard title="Critical Vulnerabilities" value={stats?.totalVulnerabilities || 0} trend="-2% this week" icon="shield" color="var(--admin-severity-danger)" />
          <KpiCard title="Active Scans" value={stats?.activeScans || 0} trend="Live" icon="loader" color="var(--admin-severity-info)" />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
          
          {/* Trend Chart */}
          <div style={{ background: 'var(--admin-bg-card)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 24px 0', color: 'var(--admin-text-primary)' }}>Scans Over Time (Last 7 Days)</h2>
            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={charts.scanTrendData?.length ? charts.scanTrendData : scanTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--admin-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--admin-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="scans" stroke="var(--admin-accent-primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribution Chart */}
          <div style={{ background: 'var(--admin-bg-card)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 24px 0', color: 'var(--admin-text-primary)' }}>Vulnerability Severity</h2>
            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={charts.vulnDistData?.length ? charts.vulnDistData : vulnDistData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="severity" stroke="var(--admin-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--admin-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, color = 'var(--admin-text-primary)' }: { title: string, value: number, trend: string, icon: string, color?: string }) {
  return (
    <div style={{ background: 'var(--admin-bg-card)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>{title}</div>
        <div style={{ width: 40, height: 40, borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon === 'users' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
          {icon === 'activity' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>}
          {icon === 'shield' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
          {icon === 'loader' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: color === 'var(--admin-text-primary)' ? 'var(--admin-severity-success)' : color, marginTop: 8, fontWeight: 500 }}>
          {trend}
        </div>
      </div>
    </div>
  );
}

function HealthGauge({ title, value, suffix, isWarning }: { title: string, value: number, suffix: string, isWarning: boolean }) {
  const color = isWarning ? 'var(--admin-severity-danger)' : 'var(--admin-severity-success)';
  return (
    <div style={{ background: 'var(--admin-bg-card)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>{value.toFixed(1)}</div>
        <div style={{ fontSize: '1rem', color: 'var(--admin-text-secondary)' }}>{suffix}</div>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}
