/**
 * IndAI — Code Editor Component
 * Textarea with line numbers, language selector, file import, and scan button.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import type { CodeEditorProps } from "../types";
import apiService from "../services/api";
import { detectLanguage } from "../utils/detectLanguage";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "php", label: "PHP" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "ruby", label: "Ruby" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash / Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "perl", label: "Perl" },
  { value: "lua", label: "Lua" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "r", label: "R" },
  { value: "xml", label: "XML / SVG" },
  { value: "html", label: "HTML" },
  { value: "yaml", label: "YAML" },
];

// All accepted file extensions
const ACCEPTED_EXTENSIONS = [
  // Code files
  ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".h",
  ".cs", ".go", ".rb", ".rs", ".php", ".swift", ".kt",
  ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml",
  ".sql", ".sh", ".bash",
  // Text & docs
  ".txt", ".md", ".rtf", ".log", ".csv",
  // Documents
  ".pdf", ".docx", ".pptx", ".xlsx",
  ".odt", ".ods", ".odp",
  // Media (for user-friendly error)
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".mp3", ".wav", ".m4a",
  ".mp4", ".mov",
].join(",");

// Extensions that can be read directly in the browser
const TEXT_READABLE = new Set([
  ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".h",
  ".cs", ".go", ".rb", ".rs", ".php", ".swift", ".kt",
  ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml",
  ".sql", ".sh", ".bash", ".txt", ".md", ".rtf", ".log", ".csv",
  ".env", ".gitignore",
]);

// Map extensions to language dropdown values
const EXT_TO_LANG: Record<string, string> = {
  ".py": "python",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
  ".ts": "typescript", ".tsx": "typescript",
  ".java": "java",
  ".cs": "csharp",
  ".c": "c", ".h": "c",
  ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp",
  ".go": "go",
  ".rb": "ruby",
  ".php": "php",
  ".sql": "sql",
  ".sh": "bash", ".bash": "bash",
  ".ps1": "powershell",
  ".pl": "perl", ".pm": "perl",
  ".lua": "lua",
  ".rs": "rust",
  ".swift": "swift",
  ".kt": "kotlin", ".kts": "kotlin",
  ".r": "r",
  ".xml": "xml", ".svg": "xml",
  ".html": "html", ".htm": "html",
  ".yaml": "yaml", ".yml": "yaml",
};

export default function CodeEditor({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onScan,
  isScanning,
}: CodeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importInfo, setImportInfo] = useState("");
  const [showGithubPanel, setShowGithubPanel] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");

  // Helper to set code — used for clear button
  const setCode = (value: string) => onCodeChange(value);

  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 20) }, (_, i) =>
    String(i + 1)
  );

  // Debounced language detection on typing (800ms)
  const debouncedDetect = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const detected = detectLanguage(text);
      if (detected && detected !== language) {
        onLanguageChange(detected);
        const label = LANGUAGES.find(l => l.value === detected)?.label || detected;
        setImportInfo(`🔍 Auto-switched language to: ${label}`);
        setTimeout(() => setImportInfo(""), 3000);
      }
    }, 800);
  }, [language, onLanguageChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Handle code changes with debounced detection
  const handleCodeChange = (newCode: string) => {
    onCodeChange(newCode);
    if (newCode.trim().length > 20) {
      debouncedDetect(newCode);
    } else {
      // no-op: code too short for detection
    }
  };

  // Instant detection on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");

    // Auto-fetch if the user pasted a GitHub URL directly
    if (pastedText.trim().match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/.*$/)) {
      e.preventDefault();
      fetchFromGithub(pastedText.trim());
      return;
    }

    if (pastedText.trim().length > 20) {
      // Capture selection positions before the async timeout (e.currentTarget may be null later)
      const selStart = e.currentTarget.selectionStart;
      const selEnd = e.currentTarget.selectionEnd;
      setTimeout(() => {
        const fullText = code
          ? code.slice(0, selStart) + pastedText + code.slice(selEnd)
          : pastedText;
        const detected = detectLanguage(fullText);
        if (detected && detected !== language) {
          // Auto-apply on paste for a smoother experience
          onLanguageChange(detected);
          const label = LANGUAGES.find(l => l.value === detected)?.label || detected;
          setImportInfo(`🔍 Auto-detected language: ${label}`);
          setTimeout(() => setImportInfo(""), 3000);
        }
      }, 50);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    setImportInfo("");

    // Try reading text files directly in the browser (faster)
    if (TEXT_READABLE.has(ext)) {
      try {
        const text = await file.text();
        onCodeChange(text);

        // Auto-detect language
        const detectedLang = EXT_TO_LANG[ext];
        if (detectedLang) onLanguageChange(detectedLang);

        setImportInfo(`✅ Imported ${file.name} (${text.split("\n").length} lines)`);
      } catch {
        setImportInfo(`❌ Failed to read ${file.name}`);
      }
    } else {
      // Binary files — upload to backend for processing
      setIsUploading(true);
      try {
        const response = await apiService.uploadFile(file);
        if (response.success && response.data) {
          onCodeChange(response.data.content);

          // Auto-detect language from backend
          const langMatch = LANGUAGES.find(l => l.value === response.data!.language);
          if (langMatch) onLanguageChange(langMatch.value);

          setImportInfo(
            `✅ Imported ${response.data.filename} (${response.data.file_type.toUpperCase()}, ${response.data.lines} lines)`
          );
        } else {
          setImportInfo(`❌ ${response.error || "Upload failed"}`);
        }
      } catch (err: any) {
        const msg = err.response?.data?.error || err.message || "Upload failed";
        setImportInfo(`❌ ${msg}`);
      } finally {
        setIsUploading(false);
      }
    }

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleGithubClick = () => {
    setShowGithubPanel((prev) => !prev);
  };

  const handleGithubSubmit = async () => {
    if (!githubUrl.trim()) return;
    setShowGithubPanel(false);
    await fetchFromGithub(githubUrl.trim());
    setGithubUrl("");
  };

  const fetchFromGithub = async (url: string) => {
    setImportInfo("");
    setIsUploading(true);
    try {
      const response = await apiService.fetchGithubCode(url);
      if (response.success && response.data) {
        onCodeChange(response.data.content);

        // Auto-detect language
        const ext = "." + response.data.filename.split(".").pop()?.toLowerCase();
        const detectedLang = EXT_TO_LANG[ext] || detectLanguage(response.data.content);
        if (detectedLang) {
          onLanguageChange(detectedLang);
        }

        setImportInfo(`✅ Fetched ${response.data.filename} from GitHub`);
      } else {
        setImportInfo(`❌ ${response.error || "Failed to fetch from GitHub"}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to fetch from GitHub";
      setImportInfo(`❌ ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="code-editor" id="code-editor">
      <div className="editor-toolbar" id="editor-toolbar">
        <div className="toolbar-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", gap: "6px", marginRight: "8px" }}>
            <div className="toolbar-dot red" />
            <div className="toolbar-dot yellow" />
            <div className="toolbar-dot green" />
          </div>

          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="language-select"
            id="language-selector"
            style={{ padding: "6px 24px 6px 12px", fontSize: "0.85rem", borderRadius: "6px" }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleGithubClick}
            disabled={isUploading || isScanning}
            className="btn-import"
            style={{ background: "#24292e", border: "1px solid #444d56", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", borderRadius: "6px", cursor: "pointer", color: "#e1e4e8" }}
            title="Fetch from GitHub URL"
          >
            {isUploading ? (
              <span className="scan-spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            GitHub
          </button>

          <button
            onClick={handleImportClick}
            disabled={isUploading || isScanning}
            className="btn-import"
            id="import-button"
            title="Import file"
            style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", borderRadius: "6px", cursor: "pointer" }}
          >
            {isUploading ? (
              <span className="scan-spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            Import
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelected}
            style={{ display: "none" }}
            id="file-input"
          />

          {/* Clear Code Button — only visible when code exists */}
          {code.trim() && (
            <button
              onClick={() => setCode("")}
              disabled={isScanning}
              className="btn-clear-code"
              id="clear-code-button"
              title="Clear all code"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Clear
            </button>
          )}

          <button
            onClick={onScan}
            disabled={isScanning || !code.trim()}
            className={`btn-scan ${isScanning ? "scanning" : ""}`}
            id="scan-button"
            style={{ padding: "6px 16px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", borderRadius: "6px" }}
          >
            {isScanning ? (
              <>
                <span className="scan-spinner" />
                Scanning...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Scan Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* GitHub Floating Panel */}
      {showGithubPanel && (
        <div className="github-floating-panel" id="github-panel">
          <div className="github-panel-header">
            <span className="github-panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Import from GitHub
            </span>
            <button className="github-panel-close" onClick={() => setShowGithubPanel(false)} aria-label="Close">✕</button>
          </div>
          <p className="github-panel-hint">Paste a public GitHub file or raw URL:</p>
          <div className="github-panel-input-row">
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGithubSubmit()}
              placeholder="https://github.com/user/repo/blob/main/app.py"
              className="github-panel-input"
              autoFocus
            />
            <button
              onClick={handleGithubSubmit}
              disabled={!githubUrl.trim() || isUploading}
              className="github-panel-fetch"
            >
              {isUploading ? <span className="scan-spinner" /> : "Fetch"}
            </button>
          </div>
          <p className="github-panel-examples">Supports: single files, raw URLs</p>
        </div>
      )}

      {/* Import Status Message */}
      {importInfo && (
        <div
          className={`import-status ${importInfo.startsWith("❌") ? "error" : "success"}`}
          id="import-status"
        >
          {importInfo}
          <button
            className="import-status-close"
            onClick={() => setImportInfo("")}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Language Detection Suggestion (Removed since it auto-switches) */}

      <div className="editor-body">
        <div className="line-numbers" aria-hidden="true">
          {lineNumbers.map((num) => (
            <span key={num} className="line-number">
              {num}
            </span>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onPaste={handlePaste}
          className="code-textarea"
          id="code-input"
          placeholder={"// Paste your code here or click Import to upload a file\n\n// Supported file types:\n// 📄 Code: .py, .js, .ts, .java, .cpp, .go, .rb, .php\n// 📝 Text: .txt, .md, .json, .xml, .yaml, .csv\n// 📑 Docs: .pdf, .docx, .pptx, .xlsx\n// 🖼️ Images: .png, .jpg, .jpeg, .webp (Text will be extracted via OCR)\n\n// Example vulnerable code:\n// eval(userInput)\n// password = 'admin123'\n// os.system('rm -rf ' + user_data)"}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>

      <div className="editor-footer">
        <span className="editor-info">
          Lines: {lineCount} | Characters: {code.length}
        </span>
        <span className="editor-info">
          Language: {LANGUAGES.find((l) => l.value === language)?.label}
        </span>
      </div>
    </div>
  );
}
