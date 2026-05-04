import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CodeEditor from "../components/CodeEditor";
import ResultsPanel from "../components/ResultsPanel";
import ExportButton from "../components/ExportButton";
import apiService from "../services/api";
import type { ScanResult } from "../types";
import RobotMascot, { type MascotStatus } from "../components/RobotMascot";

export default function DemoPage() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const navigate = useNavigate();

  async function handleScan() {
    if (!code.trim()) return;

    setIsScanning(true);
    setError("");
    setResult(null);

    try {
      const response = await apiService.executeDemoScan(code, language);
      setResult(response);
    } catch (err: any) {
      if (err.message && err.message.includes("daily limit")) {
        setLimitReached(true);
        setError("You have reached your free daily limit.");
      } else {
        const data = err.response?.data;
        if (err.response?.status === 422 && data?.error === "invalid_code") {
          setError(data.message || "Input is not valid source code.");
        } else {
          setError(data?.message || data?.error || err.message || "An error occurred");
        }
      }
    } finally {
      setIsScanning(false);
    }
  }

  const hasVulnerabilities = result && result.total_issues > 0;
  const hasCorrectedCode = result && result.corrected_code;
  const showExport = hasVulnerabilities && hasCorrectedCode;

  let mascotStatus: MascotStatus = "idle";
  if (isScanning) {
    mascotStatus = "scanning";
  } else if (result) {
    mascotStatus = result.total_issues === 0 ? "safe" : "danger";
  }

  return (
    <div className="demo-page" style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Navbar Minimal */}
      <nav className="landing-nav" style={{ 
        padding: "20px 0", 
        borderBottom: "1px solid rgba(255,255,255,0.05)", 
        background: "rgba(10, 15, 30, 0.8)", 
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div className="container" style={{ 
          maxWidth: "1200px", 
          margin: "0 auto", 
          padding: "0 40px",
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <Link to="/" className="landing-logo" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 2L3 8v12l11 6 11-6V8L14 2z" stroke="url(#demo-grad)" strokeWidth="2" />
                <path d="M14 8l-5 3v6l5 3 5-3v-6l-5-3z" fill="url(#demo-grad)" opacity="0.7" />
                <circle cx="14" cy="14" r="2" fill="#0A0F1E" />
                <defs>
                  <linearGradient id="demo-grad" x1="3" y1="2" x2="25" y2="26">
                    <stop stopColor="#00f0ff" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="logo-text" style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Ind<span className="logo-accent" style={{ color: "var(--accent-cyan)" }}>AI</span></span>
          </Link>
          <div className="nav-actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link to="/auth" className="btn-secondary" style={{ textDecoration: "none", color: "var(--text-secondary)" }}>Log In</Link>
            <Link to="/auth" className="btn-primary" style={{ textDecoration: "none", padding: "8px 24px", borderRadius: "8px" }}>Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="scan-page relative" style={{ padding: "40px" }}>
        <RobotMascot status={mascotStatus} />

        <div className="scan-header" style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "3rem", marginBottom: "10px" }}>Interactive Demo</h1>
          <p className="scan-subtitle" style={{ fontSize: "1.2rem", maxWidth: "600px", margin: "0 auto" }}>
            Paste your code below to instantly see how IndAI detects vulnerabilities and generates secure, production-ready fixes.
          </p>
        </div>

        {error && !limitReached && (
          <div className="scan-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Limit Reached Modal / Alert */}
        {limitReached && (
          <div className="demo-limit-alert" style={{
            background: "rgba(168, 85, 247, 0.1)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto 30px auto"
          }}>
            <h2 style={{ color: "var(--accent-purple)", marginBottom: "10px" }}>Demo Limit Reached</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
              You have reached the maximum number of free demo scans for today. Create a free account to unlock unlimited scanning, full reports, and code sharing!
            </p>
            <button onClick={() => navigate("/auth")} className="btn-primary" style={{ padding: "12px 30px", fontSize: "1.1rem" }}>
              Create Free Account
            </button>
          </div>
        )}

        <div className="scan-layout" style={limitReached ? { opacity: 0.5, pointerEvents: "none" } : {}}>
          {/* Left Panel — Code Editor */}
          <div className="scan-left">
            <CodeEditor
              code={code}
              onCodeChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
              onScan={handleScan}
              isScanning={isScanning}
            />
          </div>

          {/* Right Panel — Results */}
          <div className="scan-right">
            <ResultsPanel result={result} isLoading={isScanning} />

            {showExport ? (
              <div className="export-section" style={{ display: "flex", gap: "16px", marginTop: "16px", marginBottom: "16px" }}>
                <ExportButton
                  code={result!.corrected_code}
                  language={language}
                  disabled={false}
                />
              </div>
            ) : result && result.total_issues === 0 ? (
              <div className="export-section" style={{ marginTop: "16px", marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                <button className="btn-export" disabled title="No vulnerabilities to fix" style={{ width: "auto" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  No Fixes Needed — Code is Clean
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
