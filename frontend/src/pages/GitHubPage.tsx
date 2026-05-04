import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiService from "../services/api";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../context/AuthContext";
import { useBackgroundScan } from "../context/BackgroundScanContext";
import { FileExplorer } from "../components/FileExplorer";
import AiSummaryPanel from "../components/AiSummaryPanel";

export default function GitHubPage() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [completedScanResult, setCompletedScanResult] = useState<any>(null);
  
  // File Explorer State
  const [exploringRepo, setExploringRepo] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [fetchingTree, setFetchingTree] = useState(false);
  const [treeTruncated, setTreeTruncated] = useState(false);
  
  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMoreRepos, setHasMoreRepos] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [completedScanId, setCompletedScanId] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { activeScanId, scanData, startScanTracking, clearScanTracking, cancelScan } = useBackgroundScan();

  // Watch for scan completion to show the summary inline
  useEffect(() => {
    if (scanData?.status === 'completed' && scanData?.scan_id) {
      // Must use the DB scan_id, NOT the Redis activeScanId job UUID
      const dbScanId = scanData.scan_id.toString();
      setCompletedScanId(dbScanId);
      
      // Fetch full details to show a detailed language breakdown
      apiService.getScanDetail(Number(dbScanId)).then(res => {
        if (res.success && res.data) {
          setCompletedScanResult(res.data);
        }
      }).catch(err => console.error("Failed to fetch scan details:", err));
    }
  }, [scanData?.status, scanData?.scan_id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success") === "true") {
      showToast("GitHub account connected successfully!", "success");
      navigate("/github", { replace: true });
    } else if (params.get("error")) {
      showToast(`GitHub connection failed: ${params.get("error")}`, "error");
      navigate("/github", { replace: true });
    }
    
    fetchRepos();
  }, [location.search]);


  const fetchRepos = async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    else setFetchingMore(true);
    
    try {
      const response = await apiService.getGitHubRepos(pageNum);
      if (response.success && response.data) {
        if (append) {
          setRepos(prev => [...prev, ...response.data]);
        } else {
          setRepos(response.data);
        }
        setHasMoreRepos(response.pagination?.has_more || false);
        setPage(pageNum);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status !== 401 && status !== 404) {
        showToast(err.response?.data?.error || "Failed to fetch repositories", "error");
      }
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let query = searchQuery.trim();
    if (!query) return;
    
    // Extract owner/repo if user pasted a full GitHub URL
    try {
      if (query.includes('github.com/')) {
        const urlString = query.startsWith('http') ? query : `https://${query}`;
        const url = new URL(urlString);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          query = `${parts[0]}/${parts[1]}`;
        }
      }
    } catch (err) {
      // Ignore URL parsing errors and just use the raw query
    }
    
    handleExploreRepo(query);
  };

  const handleConnect = () => {
    if (!user) {
      showToast("User session not found", "error");
      return;
    }
    setConnecting(true);
    window.location.href = apiService.getGitHubConnectUrl(user.id);
  };

  const handleExploreRepo = async (repoFullName: string) => {
    setFetchingTree(true);
    setExploringRepo(repoFullName);
    setTreeTruncated(false);
    try {
      const res = await apiService.getGitHubRepoTree(repoFullName);
      if (res.success && res.data) {
        setRepoFiles(res.data.files);
        setTreeTruncated(res.data.truncated);
      } else {
        showToast(res.error || "Failed to fetch repository tree", "error");
        setExploringRepo(null);
      }
    } catch (err: any) {
      showToast("Failed to fetch repository tree", "error");
      setExploringRepo(null);
    } finally {
      setFetchingTree(false);
    }
  };

  const startBatchScan = async (selectedFiles: string[]) => {
    if (!exploringRepo) return;
    setIsScanning(true);
    try {
      const res = await apiService.scanGitHubRepo(exploringRepo, selectedFiles);
      if (res.success && res.data?.scan_id) {
        showToast("Batch scan started!", "success");
        startScanTracking(res.data.scan_id);
        setExploringRepo(null);
      } else {
        showToast(res.error || "Failed to start scan", "error");
      }
    } catch (err: any) {
      showToast("Failed to start scan", "error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="github-page" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: 1000, margin: '0 auto' }}>
      <div className="scan-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub Repositories
        </h1>
        <p className="scan-subtitle" style={{ marginBottom: 'var(--space-md)' }}>Connect your GitHub account to batch scan your projects for security vulnerabilities.</p>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', maxWidth: '600px', marginTop: '16px' }}>
          <input 
            type="text" 
            placeholder="Search public repository (e.g. facebook/react)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '2px solid var(--accent-purple)', 
              background: 'var(--bg-card)', 
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.15)'
            }}
          />
          <button type="submit" className="btn-primary" disabled={!searchQuery.trim() || fetchingTree} style={{ padding: '0 24px', fontWeight: 600 }}>
            {fetchingTree && searchQuery.trim() === exploringRepo ? <span className="scan-spinner" /> : "Search & Scan"}
          </button>
        </form>
      </div>

      {activeScanId && scanData ? (
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-3xl)', maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ marginBottom: 16 }}>Scanning {scanData.total_files} files...</h2>
          <div style={{ width: '100%', height: 12, background: 'var(--bg-surface)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ 
              width: `${scanData.progress}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
              transition: 'width 0.5s ease-in-out'
            }} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
              Analyzing: {scanData.current_file}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>{scanData.progress}%</span>
              <button
                onClick={cancelScan}
                title="Cancel scanning"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  padding: 0,
                  outline: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </p>
        </div>
      ) : completedScanId ? (
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-3xl)', maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Scan Completed Successfully!
            </h2>
            <button 
              className="btn-import" 
              onClick={() => { setCompletedScanId(null); setCompletedScanResult(null); clearScanTracking(); }}
              style={{ background: 'var(--bg-surface)' }}
            >
              Scan Another Repo
            </button>
          </div>
          
          {completedScanResult && (() => {
            const EXT_TO_LANG: Record<string, string> = {
              "py": "Python", "js": "JavaScript", "ts": "TypeScript", "jsx": "React", "tsx": "React TS",
              "html": "HTML", "css": "CSS", "php": "PHP", "java": "Java", "cpp": "C++", "c": "C",
              "go": "Go", "rb": "Ruby", "cs": "C#", "sh": "Shell", "sql": "SQL"
            };

            const langStats: Record<string, { count: number, critical: number, high: number }> = {};
            
            (completedScanResult.vulnerabilities || []).forEach((v: any) => {
              // Extract extension from rule_id (e.g. github-scan-src/app.py) or code_snippet path
              let ext = "unknown";
              if (v.rule_id && v.rule_id.includes('github-scan-')) {
                const parts = v.rule_id.split('.');
                if (parts.length > 1) ext = parts[parts.length - 1].toLowerCase();
              }
              
              const lang = EXT_TO_LANG[ext] || (ext !== 'unknown' ? ext.toUpperCase() : 'General');
              
              if (!langStats[lang]) langStats[lang] = { count: 0, critical: 0, high: 0 };
              langStats[lang].count++;
              if (v.severity === 'critical') langStats[lang].critical++;
              if (v.severity === 'high') langStats[lang].high++;
            });

            return (
              <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  Language Breakdown
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {Object.entries(langStats).length > 0 ? Object.entries(langStats).map(([lang, stat]) => (
                    <div key={lang} style={{ background: 'var(--bg-body)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', minWidth: 150 }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>{lang}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {stat.count} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Issues</span>
                      </div>
                      {(stat.critical > 0 || stat.high > 0) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.7rem' }}>
                          {stat.critical > 0 && <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 4 }}>{stat.critical} Critical</span>}
                          {stat.high > 0 && <span style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 6px', borderRadius: 4 }}>{stat.high} High</span>}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div style={{ color: 'var(--text-secondary)' }}>No specific language issues tracked or no vulnerabilities found.</div>
                  )}
                </div>
              </div>
            );
          })()}
          
          <div style={{ margin: '8px 0' }}>
            <AiSummaryPanel scanId={Number(completedScanId)} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <button 
              className="btn-primary" 
              onClick={() => navigate(`/scan/${completedScanId}`)}
              style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}
            >
              View Full Details & Code Fixes
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      ) : exploringRepo ? (
        fetchingTree ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
            <div className="scan-spinner" style={{ width: 40, height: 40, borderWidth: 3, marginBottom: 'var(--space-md)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Fetching file tree...</p>
          </div>
        ) : (
          <>
            {treeTruncated && (
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', color: '#f97316', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span><strong>Warning:</strong> This repository is very large. The file tree has been truncated by GitHub and some files may not be visible.</span>
              </div>
            )}
            <FileExplorer 
              files={repoFiles} 
              onScan={startBatchScan} 
              onCancel={() => setExploringRepo(null)} 
              isScanning={isScanning} 
            />
          </>
        )
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-3xl)', minHeight: '300px' }}>
          <div className="scan-spinner" style={{ width: 40, height: 40, borderWidth: 3, marginBottom: 'var(--space-md)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0.5px' }}>Fetching Details...</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="empty-scans" style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-3xl)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <h2 style={{ marginBottom: 8, fontSize: '1.25rem' }}>Link your GitHub Account</h2>
          <p style={{ marginBottom: 24 }}>Connect your account to access your repositories directly within IndAI.</p>
          <button 
            className="btn-primary" 
            onClick={handleConnect} 
            disabled={connecting}
            style={{ background: '#24292e', color: '#fff', border: '1px solid #1b1f23' }}
          >
            {connecting ? <span className="scan-spinner" /> : null}
            Connect GitHub
          </button>
        </div>
      ) : (
        <>
          <div className="repos-grid" style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {repos.map(repo => (
              <div key={repo.id} className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, wordBreak: 'break-all' }}>{repo.name}</h3>
                  {repo.private && <span style={{ fontSize: '0.65rem', padding: '2px 6px', border: '1px solid var(--border-color)', borderRadius: 12, opacity: 0.8 }}>Private</span>}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 16, flex: 1 }}>
                  {repo.description || "No description provided."}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {repo.language && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                        {repo.language}
                      </span>
                    )}
                  </div>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
                    onClick={() => handleExploreRepo(repo.full_name)}
                    disabled={fetchingTree && exploringRepo === repo.full_name}
                  >
                    {fetchingTree && exploringRepo === repo.full_name ? <span className="scan-spinner" /> : "Scan Repo"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {hasMoreRepos && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
              <button 
                className="btn-import" 
                onClick={() => fetchRepos(page + 1, true)}
                disabled={fetchingMore}
                style={{ background: 'var(--bg-surface)' }}
              >
                {fetchingMore ? <span className="scan-spinner" /> : "Load More Repositories"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
