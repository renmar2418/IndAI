/**
 * IndAI — Scan Page
 * Main scanning interface with code editor and results panel side by side.
 */

import { useState } from "react";
import CodeEditor from "../components/CodeEditor";
import ResultsPanel from "../components/ResultsPanel";
import AiSummaryPanel from "../components/AiSummaryPanel";
import ExportButton from "../components/ExportButton";
import PdfReportButton from "../components/PdfReportButton";
import apiService from "../services/api";
import { saveSummary } from "../utils/summaryCache";
import type { ScanResult } from "../types";
import RobotMascot, { type MascotStatus } from "../components/RobotMascot";

export default function ScanPage() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  async function handleScan() {
    if (!code.trim()) return;

    setIsScanning(true);
    setError("");
    setResult(null);

    try {
      const response = await apiService.submitScan(code, language);
      if (response.success) {
        setResult(response.data);
        // Cache the inline AI summary for instant retrieval on View page
        if (response.data.ai_summary) {
          saveSummary(response.data.scan_id, response.data.ai_summary);
        }
      } else {
        setError(response.error || "Scan failed");
      }
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      // Handle 422 validation error (not valid code)
      if (status === 422 && data?.error === "invalid_code") {
        setError(data.message || "Input is not valid source code.");
      } else {
        setError(
          data?.message || data?.error || err.message || "An error occurred"
        );
      }
    } finally {
      setIsScanning(false);
    }
  }

  // Only show export when there ARE vulnerabilities with corrected code
  const hasVulnerabilities = result && result.total_issues > 0;
  const hasCorrectedCode = result && result.corrected_code;
  const showExport = hasVulnerabilities && hasCorrectedCode;

  // Determine Mascot Status
  let mascotStatus: MascotStatus = 'idle';
  if (isScanning) {
    mascotStatus = 'scanning';
  } else if (result) {
    mascotStatus = result.total_issues === 0 ? 'safe' : 'danger';
  }

  return (
    <div className="scan-page relative" id="scan-page">
      <RobotMascot status={mascotStatus} />
      
      <div className="scan-header">
        <h1>Security Scan</h1>
        <p className="scan-subtitle">
          Paste your code below to analyze for vulnerabilities
        </p>
      </div>

      {error && (
        <div className="scan-error" id="scan-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="scan-layout">
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
            <div className="export-section" id="export-section" style={{ display: 'flex', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <ExportButton
                code={result!.corrected_code}
                language={language}
                disabled={false}
              />
              <PdfReportButton
                result={result!}
                language={language}
              />
            </div>
          ) : result && result.total_issues === 0 ? (
            <div className="export-section" id="export-section" style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <button className="btn-export" disabled title="No vulnerabilities to fix" style={{ width: 'auto' }}>
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

      {/* AI Summary (Full Width Bottom) */}
      {result && (
        <div className="scan-bottom-full">
          <AiSummaryPanel
            scanId={result.scan_id}
            initialSummary={result.ai_summary || null}
          />
        </div>
      )}
    </div>
  );
}
