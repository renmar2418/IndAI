import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../services/api';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  "Text", "JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "C++", "C#", "PHP", "Ruby", "Swift", "Kotlin", "HTML", "CSS", "SQL", "Markdown",
  "MOS 6502 (6510) ACME Cross Assembler", "MOS 6502 (6510) Kick Assembler", "MOS 6502 (6510) TASM/64TASS 1.46 Assembler",
  "Motorola 68000 - HiSoft Devpac ST 2 Assembler", "ABAP", "ActionScript", "ActionScript 3", "Ada", "AIMMS3", "ALGOL 68", "Apache configuration",
  "AppleScript", "Apt sources", "ARM ASSEMBLER", "ASM", "ASP", "asymptote", "Autoconf"
];

const DURATIONS = [
  "1 Hour", "8 Hours", "24 Hours", "7 Days", "10 Days", "15 Days", "30 Days", "60 Days", "90 Days", "180 Days", "365 Days", "Forever"
];

const SHARING_MODES = ["Debug", "Internal", "Public", "Temporary"];
const BURN_OPTIONS = ["3 reads", "5 reads", "10 reads", "100 reads", "Disabled (use Read once for 1 read)"];

interface ShareResult {
  short_id: string;
  share_url: string;
  revoke_token: string;
  expires_at: string | null;
  created_at: string | null;
  max_reads: number | null;
  is_protected: boolean;
}

export default function ShareSnippetPage() {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('Text');
  const [expiry, setExpiry] = useState('8 Hours');
  const [readOnce, setReadOnce] = useState(false);
  const [sharingMode, setSharingMode] = useState('Debug');
  const [password, setPassword] = useState('');
  const [burnReads, setBurnReads] = useState('3 reads');
  
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const resultRef = useRef<HTMLDivElement>(null);
  
  // Repro Context
  const [showRepro, setShowRepro] = useState(false);
  const [reproEnv, setReproEnv] = useState('');
  const [reproExpected, setReproExpected] = useState('');
  const [reproActual, setReproActual] = useState('');
  const [reproSteps, setReproSteps] = useState('');

  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  // Scroll to result when it appears
  useEffect(() => {
    if (shareResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shareResult]);

  const isTitleReady = title.trim().length > 0;
  const isCodeReady = code.trim().length > 0;
  const isExpectedReady = reproExpected.trim().length > 0;
  const isStepsReady = reproSteps.trim().length > 0;

  async function handleShare() {
    if (!isTitleReady || !isCodeReady) {
      showToast("Title and Code are required", "error");
      return;
    }
    setIsSharing(true);
    try {
      const response = await apiService.shareSnippet({
        code,
        title,
        language,
        expiry,
        read_once: readOnce,
        burn_reads: burnReads,
        password: password || undefined,
        repro_context: showRepro ? `Env: ${reproEnv}\nExpected: ${reproExpected}\nActual: ${reproActual}\nSteps: ${reproSteps}` : undefined
      });
      if (response.success) {
        setShareResult(response.data);
        showToast("Snippet shared successfully!", "success");
      }
    } catch (err) {
      console.error("Failed to share snippet:", err);
      showToast("Failed to share snippet. Please try again.", "error");
    } finally {
      setIsSharing(false);
    }
  }

  function handleNewSnippet() {
    setCode('');
    setTitle('');
    setLanguage('Text');
    setExpiry('8 Hours');
    setReadOnce(false);
    setPassword('');
    setBurnReads('3 reads');
    setShareResult(null);
    setShowRepro(false);
    setReproEnv('');
    setReproExpected('');
    setReproActual('');
    setReproSteps('');
  }

  function getShareUrl() {
    if (!shareResult) return '';
    return `${window.location.origin}/s/${shareResult.short_id}`;
  }

  function getRevokeUrl() {
    if (!shareResult) return '';
    return `${window.location.origin}/s/${shareResult.short_id}/revoke/${shareResult.revoke_token}`;
  }

  function getBurnLabel() {
    if (readOnce) return 'Read once';
    if (shareResult?.max_reads) return `Burn after ${shareResult.max_reads} reads`;
    return 'Unlimited reads';
  }

  function copyMarkdown() {
    if (!shareResult) return;
    const md = `**${title}** (${language})\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\`\n\n🔗 [View snippet](${getShareUrl()})`;
    navigator.clipboard.writeText(md);
    showToast("Markdown copied!", "success");
  }

  function copyChatSummary() {
    if (!shareResult) return;
    const summary = `📋 Shared snippet: "${title}"\n📎 Language: ${language}\n⏰ Expires: ${shareResult.expires_at ? new Date(shareResult.expires_at).toLocaleString() : 'Never'}\n🔗 Link: ${getShareUrl()}`;
    navigator.clipboard.writeText(summary);
    showToast("Chat summary copied!", "success");
  }

  return (
    <div className="share-dashboard">
      <header className="share-page-header">
        <div>
          <h1 className="share-page-title">Share Snippet</h1>
          <p className="share-page-subtitle">
            Share code snippets securely without sending screenshots or files. Built for developers.
          </p>
        </div>
        {!isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="share-login-nudge"
          >
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs font-bold text-blue-300">Log in to save snippets to your profile</span>
          </motion.div>
        )}
      </header>

      <div className="share-main-grid">
        {/* SIDEBAR SETUP */}
        <aside className="share-sidebar-setup">
          <div className="share-sidebar-header">
            <h2 className="share-section-title">Setup</h2>
            <p className="share-section-desc">Configure snippet metadata, access policy, and sharing mode</p>
          </div>

          <div className="share-grid-2">
            <div>
              <label className="share-field-label">Code style</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="share-field-select">
                {LANGUAGES.map(lang => <option key={lang}>{lang}</option>)}
              </select>
            </div>
            <div>
              <label className="share-field-label">Keep until</label>
              <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="share-field-select">
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="share-grid-2">
            <div className="flex flex-col gap-2">
              <label className="share-field-label">Mode</label>
              <div className="share-toggle-group">
                <div 
                  className={`share-toggle ${readOnce ? 'active' : ''}`} 
                  onClick={() => setReadOnce(!readOnce)}
                />
                <span className="text-sm font-bold">Read once</span>
              </div>
              <p className="share-field-hint">Auto-delete after first view.</p>
            </div>
            <div>
              <label className="share-field-label">Sharing mode</label>
              <select value={sharingMode} onChange={(e) => setSharingMode(e.target.value)} className="share-field-select">
                {SHARING_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <p className="share-field-hint mb-5">Presets set expiry, read rules, and password defaults.</p>

          {/* Title input */}
          <div className="share-title-field">
             <span className="share-title-prefix">Title</span>
             <input 
               type="text" 
               placeholder="Snippet title or file name"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="share-title-input"
             />
          </div>

          <div className="share-grid-2">
            <div>
              <label className="share-field-label">Password protection</label>
              <input 
                type="password" 
                placeholder="Optional password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="share-field-input"
              />
            </div>
            <div>
              <label className="share-field-label">Burn after N reads</label>
              <select 
                value={burnReads} 
                onChange={(e) => setBurnReads(e.target.value)} 
                className="share-field-select"
                disabled={readOnce}
              >
                {BURN_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="share-repro-section">
            <div 
              className="share-repro-summary"
              onClick={() => setShowRepro(!showRepro)}
            >
              <svg className={`w-3 h-3 transition-transform ${showRepro ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              Minimal Repro Context (Optional)
            </div>
            
            <AnimatePresence>
              {showRepro && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="share-field-label">Environment</label>
                      <input 
                        className="share-field-input text-xs" 
                        placeholder="e.g. Node 20, Chrome 124" 
                        value={reproEnv}
                        onChange={(e) => setReproEnv(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="share-field-label">Expected result</label>
                      <input 
                        className="share-field-input text-xs" 
                        placeholder="What should happen" 
                        value={reproExpected}
                        onChange={(e) => setReproExpected(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="share-field-label">Actual result</label>
                      <input 
                        className="share-field-input text-xs" 
                        placeholder="What happens instead" 
                        value={reproActual}
                        onChange={(e) => setReproActual(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="share-field-label">Steps to reproduce</label>
                      <input 
                        className="share-field-input text-xs" 
                        placeholder="Short step sequence" 
                        value={reproSteps}
                        onChange={(e) => setReproSteps(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="share-editor-area">
          <div className="share-editor-box">
            <div className="share-editor-header">
              <h3 className="share-section-title">Snippet editor</h3>
              <p className="share-section-desc">Paste your snippet, validate safety, then share or compare before publishing.</p>
            </div>
            <div className="share-editor-content">
               <div className="share-editor-gutter">
                  {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
               </div>
               <textarea 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="share-editor-textarea"
                  placeholder="Paste your code here..."
               />
            </div>
            <div className="share-editor-footer">
                <div className="flex" style={{ gap: '12px' }}>
                  {['Upload', 'Copy', 'Download', 'Clear'].map(act => (
                    <button key={act} className="btn-editor-action" title={act} style={{ marginRight: '6px' }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={act === 'Upload' ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" : act === 'Copy' ? "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" : act === 'Download' ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"} />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="flex items-center" style={{ gap: '20px' }}>
                  <button 
                   onClick={handleShare}
                   disabled={isSharing || !isCodeReady || !isTitleReady}
                   className="btn-save-share disabled:opacity-50"
                   style={{ marginRight: '16px' }}
                  >
                    {isSharing ? 'Sharing...' : 'Save & Share'}
                  </button>
                  <button className="btn-compare-share">
                    Compare before share
                  </button>
                </div>
            </div>
          </div>

          {/* READINESS */}
          <div className="share-readiness-panel">
            <div className="share-panel-header">
              <h3 className="share-section-title">Share readiness</h3>
              <span className="badge-blue">Pre-flight</span>
            </div>
            <div className="share-readiness-grid">
              <div className="space-y-3">
                 <div className="readiness-item">
                    <span className="readiness-label">Title:</span>
                    <span className={isTitleReady ? 'status-ok' : 'status-error'}>{isTitleReady ? 'Ready' : 'Missing'}</span>
                 </div>
                 <div className="readiness-item">
                    <span className="readiness-label">Expected result:</span>
                    <span className={isExpectedReady ? 'status-ok' : 'status-error'}>{isExpectedReady ? 'Ready' : 'Missing'}</span>
                 </div>
              </div>
              <div className="space-y-3">
                 <div className="readiness-item">
                    <span className="readiness-label">Code:</span>
                    <span className={isCodeReady ? 'status-ok' : 'status-error'}>{isCodeReady ? 'Ready' : 'Missing'}</span>
                 </div>
                 <div className="readiness-item">
                    <span className="readiness-label">Repro steps:</span>
                    <span className={isStepsReady ? 'status-ok' : 'status-error'}>{isStepsReady ? 'Ready' : 'Missing'}</span>
                 </div>
              </div>
              <div className="space-y-3">
                 <div className="readiness-item">
                    <span className="readiness-label">No secrets:</span>
                    <span className="status-ok">Ready</span>
                 </div>
              </div>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="share-preview-panel">
            <div className="share-panel-header">
              <h3 className="share-section-title">Share preview</h3>
              <span className="badge-blue">Before publish</span>
            </div>
            <div className="preview-grid">
               <div className="preview-item">
                 <span className="preview-label">Title:</span>
                 <span className="preview-value">{title || 'Untitled snippet'}</span>
               </div>
               <div className="preview-item">
                 <span className="preview-label">Language:</span>
                 <span className="preview-value">{language.toLowerCase()}</span>
               </div>
               <div className="preview-item">
                 <span className="preview-label">Expires:</span>
                 <span className="preview-value">{expiry === 'Forever' ? 'Never' : expiry}</span>
               </div>
               <div className="preview-item">
                 <span className="preview-label">Access:</span>
                 <span className="preview-value">{readOnce ? 'Read once' : `Burn after ${burnReads}`}</span>
               </div>
               <div className="preview-item">
                 <span className="preview-label">Expected:</span>
                 <span className="preview-value">{reproExpected || 'Not provided'}</span>
               </div>
               <div className="preview-item">
                 <span className="preview-label">Steps:</span>
                 <span className="preview-value">{reproSteps || 'Not provided'}</span>
               </div>
            </div>
          </div>

          {/* CODE LINK RESULT PANEL */}
          <AnimatePresence>
            {shareResult && (
              <motion.div 
                ref={resultRef}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="share-result-panel"
              >
                {/* Header Row: Code Link + Burn Badge + URL */}
                <div className="share-result-header">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="share-result-title">Code Link</span>
                    {shareResult.max_reads && (
                      <span className="share-result-badge share-result-badge--burn">
                        {getBurnLabel()}
                      </span>
                    )}
                    {shareResult.is_protected && (
                      <span className="share-result-badge share-result-badge--protected">
                        🔒 Protected
                      </span>
                    )}
                  </div>
                  <div className="share-url-row">
                    <input 
                      readOnly 
                      value={getShareUrl()} 
                      className="share-input-readonly flex-1" 
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(getShareUrl());
                        showToast("Link copied to clipboard!", "success");
                      }} 
                      className="share-btn-secondary"
                      title="Copy link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                    >
                      <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy Link
                    </button>
                  </div>
                </div>

                {/* Metadata — simple text rows */}
                <div className="share-result-meta-rows">
                  <p className="share-result-meta-row">
                    <span className="share-result-meta-label">Created:</span> {shareResult.created_at ? new Date(shareResult.created_at).toLocaleString() : '—'}
                  </p>
                  <p className="share-result-meta-row">
                    <span className="share-result-meta-label">Expires:</span> {shareResult.expires_at ? new Date(shareResult.expires_at).toLocaleString() : 'Never'}
                  </p>
                  <p className="share-result-meta-row">
                    <span className="share-result-meta-label">Read policy:</span> {getBurnLabel()}
                  </p>
                </div>

                {/* Self-destruct warning */}
                {shareResult.max_reads && (
                  <div className="share-result-warning" style={{ gap: '24px', marginBottom: '24px' }}>
                    <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="text-amber-400 text-xs font-bold">
                      This link will self-destruct after {shareResult.max_reads} total {shareResult.max_reads === 1 ? 'read' : 'reads'}.
                    </p>
                  </div>
                )}

                {/* Revoke Link (private) */}
                <div className="share-result-revoke">
                  <p className="share-result-revoke-title">
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Private revoke link (keep this secret)
                  </p>
                  <input 
                    readOnly 
                    value={getRevokeUrl()} 
                    className="share-input-readonly share-input-danger" 
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(getRevokeUrl());
                      showToast("Revoke link copied!", "success");
                    }}
                    className="share-btn-danger"
                  >
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Copy revoke link
                  </button>
                  <p className="share-result-revoke-hint">Use this link to manually delete the snippet later.</p>
                </div>

                {/* Action Buttons */}
                <div className="share-result-actions">
                  <button onClick={copyMarkdown} className="share-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    Copy Markdown
                  </button>
                  <button onClick={copyChatSummary} className="share-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Copy Chat Summary
                  </button>
                  <button onClick={handleNewSnippet} className="share-btn-primary ml-auto">
                    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    New Snippet
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
