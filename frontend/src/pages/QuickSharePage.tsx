/**
 * IndAI — QuickShare Page
 * Minimal, instant code sharing. Paste → Share → Link generated.
 * No configuration needed. Uses sensible defaults.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../services/api';

export default function QuickSharePage() {
  const [code, setCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{
    url: string;
    expiresAt: string | null;
    maxReads: number | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async () => {
    if (!code.trim()) return;

    setIsSharing(true);
    setError('');
    setShareResult(null);

    try {
      const now = new Date();
      const title = `Quick snippet — ${now.toLocaleString()}`;

      const response = await apiService.shareSnippet({
        code: code.trim(),
        title,
        language: 'text',
        expiry: '8 Hours',
        burn_reads: '10 reads',
      });

      if (response.success && response.data) {
        const fullUrl = `${window.location.origin}/s/${response.data.short_id}`;
        setShareResult({
          url: fullUrl,
          expiresAt: response.data.expires_at,
          maxReads: response.data.max_reads,
        });
      } else {
        setError('Failed to create snippet. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = shareResult.url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isReady = code.trim().length > 0;

  return (
    <div className="quickshare-page">
      <motion.div
        className="quickshare-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="quickshare-header">
          <div className="quickshare-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="quickshare-title">QuickShare</h1>
            <p className="quickshare-subtitle">Paste. Share. Done.</p>
          </div>
        </div>

        {/* Code Editor */}
        <div className="quickshare-editor-wrap">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
            className="quickshare-textarea"
            spellCheck={false}
            autoFocus
          />
          <div className="quickshare-char-count">
            {code.length > 0 && <span>{code.length.toLocaleString()} chars</span>}
          </div>
        </div>

        {/* Share Button */}
        <motion.button
          className="quickshare-btn"
          onClick={handleShare}
          disabled={!isReady || isSharing}
          whileHover={isReady && !isSharing ? { scale: 1.02 } : {}}
          whileTap={isReady && !isSharing ? { scale: 0.98 } : {}}
        >
          {isSharing ? (
            <>
              <svg className="quickshare-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Sharing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Share Instantly
            </>
          )}
        </motion.button>

        {/* Error */}
        {error && (
          <motion.div
            className="quickshare-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </motion.div>
        )}

        {/* Result */}
        {shareResult && (
          <motion.div
            className="quickshare-result"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="quickshare-result-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Link generated!
            </div>
            <div className="quickshare-url-row">
              <input
                type="text"
                value={shareResult.url}
                readOnly
                className="quickshare-url-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button className="quickshare-copy-btn" onClick={handleCopy}>
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>
            <p className="quickshare-meta">
              Expires in 8 hours · {shareResult.maxReads ?? '∞'} reads
            </p>
          </motion.div>
        )}

        {/* Defaults info */}
        <div className="quickshare-defaults">
          <span>Auto-expiry: 8h</span>
          <span>·</span>
          <span>10 reads max</span>
          <span>·</span>
          <span>No password</span>
          <span>·</span>
          <span>No login required</span>
        </div>
      </motion.div>
    </div>
  );
}
