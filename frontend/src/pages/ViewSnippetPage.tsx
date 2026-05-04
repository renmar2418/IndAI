import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/api';
import { useToast } from '../components/ToastProvider';

interface SnippetMetadata {
  short_id: string;
  title: string;
  language: string;
  is_protected: boolean;
  max_reads: number | null;
  read_count: number;
  size_bytes: number;
  expiry_at: string | null;
  created_at: string | null;
}

interface SnippetData {
  title: string;
  code: string;
  language: string;
  max_reads: number | null;
  read_count: number;
  expiry_at: string | null;
  created_at: string | null;
  repro_context: string | null;
  is_protected: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) 
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ViewSnippetPage() {
  const { shortId } = useParams<{ shortId: string }>();
  const { showToast } = useToast();

  const [metadata, setMetadata] = useState<SnippetMetadata | null>(null);
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      if (!shortId) return;
      setLoading(true);
      try {
        const response = await apiService.getSnippetMetadata(shortId);
        if (response.success) {
          setMetadata(response.data);
          if (response.data.is_protected) {
            setPasswordRequired(true);
          }
        }
      } catch (err: any) {
        const errMsg = err.response?.data?.error || 'Failed to load snippet';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }
    fetchMetadata();
  }, [shortId]);

  async function handleReveal() {
    if (!shortId) return;
    if (passwordRequired && !password.trim()) {
      setPasswordError(true);
      return;
    }
    setRevealing(true);
    setPasswordError(false);
    try {
      const response = await apiService.revealSnippet(shortId, passwordRequired ? password : undefined);
      if (response.success) {
        // Short delay for the loading animation to play
        await new Promise(resolve => setTimeout(resolve, 800));
        setSnippet(response.data);
        setPasswordRequired(false);
      }
    } catch (err: any) {
      const errCode = err.response?.data?.error;
      if (errCode === 'password_required') {
        setPasswordRequired(true);
      } else if (errCode === 'Invalid password') {
        setPasswordError(true);
        showToast("Invalid password", "error");
      } else {
        setError(errCode || 'Failed to reveal snippet');
      }
    } finally {
      setRevealing(false);
    }
  }

  function handleCopyCode() {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    showToast("Code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  function getReadsRemaining(): number {
    if (!metadata?.max_reads) return -1;
    return metadata.max_reads - metadata.read_count;
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="share-container flex items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // ── Error ──
  if (error || !metadata) {
    return (
      <div className="share-container flex flex-col items-center justify-center min-h-[90vh] py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="share-card-main flex flex-col items-center text-center w-full max-w-2xl"
          style={{ 
            padding: '80px 60px',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.7), 0 0 80px rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '24px'
          }}
        >
          {/* Refined Warning Icon with Glow */}
          <div className="relative" style={{ marginBottom: '48px' }}>
            <div 
              style={{ 
                position: 'absolute', 
                inset: '-20px', 
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                zIndex: 0
              }} 
            />
            <div 
              className="snippet-warning-icon relative z-10" 
              style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '32px', 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.05)'
              }}
            >
              <svg style={{ width: '48px', height: '48px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} color="#ef4444">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <div style={{ marginBottom: '64px' }}>
            <h2 
              className="text-5xl font-black" 
              style={{ 
                marginBottom: '24px', 
                color: 'var(--text-primary)', 
                letterSpacing: '-2px',
                background: 'linear-gradient(to bottom, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Snippet Unavailable
            </h2>
            <p 
              className="text-slate-400" 
              style={{ 
                fontSize: '1.25rem', 
                lineHeight: '1.8', 
                maxWidth: '480px',
                margin: '0 auto' 
              }}
            >
              {error || "This link may have expired or reached its view limit."}
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link 
              to="/share" 
              className="share-btn-primary" 
              style={{ 
                padding: '20px 52px', 
                fontSize: '1.2rem', 
                borderRadius: '16px',
                boxShadow: '0 20px 40px -10px rgba(0, 240, 255, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              Create your own snippet
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </motion.div>

          <p style={{ marginTop: '40px', fontSize: '0.875rem', color: 'var(--text-muted)', opacity: 0.6 }}>
            Error Code: {error ? 'EXP_LIMIT_REACHED' : 'NOT_FOUND'}
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Revealing animation ──
  if (revealing) {
    return (
      <div className="share-container flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="snippet-reveal-loader"
        >
          <motion.div 
            className="snippet-reveal-spinner"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
          <motion.div
            className="snippet-reveal-lock"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          >
            <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} color="var(--accent-cyan)">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </motion.div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-bold"
          style={{ color: 'var(--text-muted)' }}
        >
          Decrypting and loading snippet...
        </motion.p>
      </div>
    );
  }

  // ── Phase 2: Code Revealed (LEFT-ALIGNED layout like reference) ──
  if (snippet) {
    return (
      <div className="share-container" style={{ maxWidth: 900 }}>
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="snippet-tagline mb-6"
        >
          Share Code Snippets Online Without Sending Screenshots or Files. Built for technical users who need practical output and a cleaner next step.
        </motion.p>

        {/* Title + Language — LEFT aligned */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="snippet-header-row"
        >
          <h1 className="snippet-title-inline">{snippet.title}</h1>
          <span className="snippet-language-badge-sm">{snippet.language}</span>
        </motion.div>

        {/* Self-destruct warning */}
        {snippet.max_reads && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="snippet-warning-banner"
          >
            <strong>Self-destructing snippet:</strong> This snippet self-destructs after {snippet.max_reads} total {snippet.max_reads === 1 ? 'read' : 'reads'}. Copy it before refreshing or closing this page. Download is disabled for protected/self-destructing snippets.
          </motion.div>
        )}

        {/* Status bar — Snippet Loaded + Copy Snippet */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="snippet-action-row"
        >
          <div className="snippet-action-row-left">
            <span className="snippet-badge-success">
              <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Snippet Loaded
            </span>
            <button onClick={handleCopyCode} className="snippet-badge-action">
              {copied ? '✓ Copied!' : 'Copy Snippet'}
            </button>
          </div>
          {snippet.max_reads && (
            <span className="snippet-reads-info-inline">
              Snippet loaded. {snippet.max_reads - snippet.read_count} read{snippet.max_reads - snippet.read_count !== 1 ? 's' : ''} remaining after this view. Copy it before leaving this page.
            </span>
          )}
        </motion.div>

        {/* Metadata — Horizontal inline row with icons */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="snippet-meta-inline"
        >
          <span className="snippet-meta-chip">
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Created: {formatDate(snippet.created_at)}
          </span>
          <span className="snippet-meta-chip">
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
            {formatBytes(snippet.code ? snippet.code.length : 0)}
          </span>
          <span className="snippet-meta-chip">
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Expires: {snippet.expiry_at ? formatDate(snippet.expiry_at) : 'Never'}
          </span>
          {snippet.max_reads && (
            <span className="snippet-meta-chip snippet-meta-chip--warning">
              <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Read usage: {snippet.read_count}/{snippet.max_reads}
            </span>
          )}
        </motion.div>

        {/* Code Display */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="share-card-main"
          style={{ marginTop: 0 }}
        >
          <div className="share-editor-minimal">
            <div className="share-editor-content" style={{ minHeight: '280px' }}>
              <div className="share-editor-gutter">
                {snippet.code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre className="flex-1 text-sm font-mono whitespace-pre-wrap overflow-auto bg-transparent m-0">{snippet.code}</pre>
            </div>
          </div>
          <div className="share-toolbar">
             <div className="flex items-center" style={{ gap: '16px' }}>
                <button 
                  onClick={handleCopyCode} 
                  className="setting-pill"
                  style={{ marginRight: '8px' }}
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  {copied ? '✓ Copied' : 'Copy Code'}
                </button>
                <Link 
                  to="/scan"
                  state={{ code: snippet.code, language: snippet.language }}
                  className="setting-pill setting-pill--accent"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Scan with IndAI
                </Link>
             </div>
             <span className="snippet-views-count">
               {snippet.read_count} {snippet.read_count === 1 ? 'View' : 'Views'}
             </span>
          </div>
        </motion.div>

        {/* Repro Context */}
        {snippet.repro_context && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="snippet-repro-context"
          >
            <h3 className="snippet-repro-title">
              <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Reproduction Context
            </h3>
            <p className="text-slate-400 text-sm whitespace-pre-wrap leading-relaxed">{snippet.repro_context}</p>
          </motion.div>
        )}

        {/* Bottom actions */}
        <div className="snippet-bottom-actions">
          <Link to="/share" className="share-btn-primary">
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Snippet
          </Link>
        </div>
      </div>
    );
  }

  // ── Phase 1: Landing Page ──
  const readsRemaining = getReadsRemaining();

  return (
    <div className="share-container max-w-2xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-8"
      >
        <p className="snippet-tagline">
          Ephemeral Code Sharing — Built for developers who need fast, secure, one-time code transfers.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="share-card-main snippet-landing-card"
      >
        <div className="text-center" style={{ marginBottom: 32 }}>
          <h1 className="snippet-title">{metadata.title}</h1>
          <div style={{ marginTop: 16 }}>
            <span className="snippet-language-badge">{metadata.language}</span>
          </div>
        </div>

        {metadata.max_reads && (
          <div className="snippet-warning-box" style={{ marginBottom: 32 }}>
            <div className="snippet-warning-icon">
              <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} color="#f59e0b">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="snippet-warning-title">Self-destructing snippet</p>
              <p className="snippet-warning-text">
                This snippet self-destructs after {metadata.max_reads} total {metadata.max_reads === 1 ? 'read' : 'reads'}. 
                Copy it before refreshing or closing this page. Download is disabled for protected/self-destructing snippets.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {passwordRequired && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="snippet-password-box">
                <div className="snippet-password-header">
                  <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} color="#a855f7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-purple-300 font-black text-sm">Password Required</span>
                </div>
                <p className="snippet-password-desc">This snippet is password protected. Enter the password to view.</p>
                <input 
                  type="password" 
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleReveal()}
                  className={`share-input-box ${passwordError ? 'border-red-500' : ''}`}
                />
                {passwordError && (
                  <p className="text-red-400 text-xs font-bold mt-3">Invalid password. Please try again.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center" style={{ marginBottom: 28 }}>
          <button 
            onClick={handleReveal}
            disabled={revealing}
            className="snippet-reveal-btn"
          >
            {revealing ? 'Loading...' : 'View Snippet Now (Uses 1 Read)'}
          </button>
        </div>

        <p className="snippet-reads-info" style={{ marginBottom: 20 }}>
          {readsRemaining > 0 
            ? `Click "View Snippet Now" when you are ready. ${readsRemaining} read${readsRemaining !== 1 ? 's' : ''} remaining before the snippet disappears.`
            : metadata.max_reads === null
              ? 'This snippet has unlimited reads.'
              : `Click "View Snippet Now" to reveal the code.`
          }
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-3 flex-wrap" style={{ marginTop: 28, marginBottom: 20 }}
      >
        {['JavaScript', 'XML', 'JSON', 'CSS', 'Raw'].map(lang => (
          <span key={lang} className="snippet-lang-pill">{lang}</span>
        ))}
      </motion.div>
    </div>
  );
}
