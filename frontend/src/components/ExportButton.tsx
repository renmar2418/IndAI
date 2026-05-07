/**
 * IndAI — Export Button Component
 * Downloads corrected code as a file.
 */

import { useState } from "react";
import JSZip from "jszip";
import type { ExportButtonProps } from "../types";

const EXTENSION_MAP: Record<string, string> = {
  javascript: ".js",
  typescript: ".ts",
  python: ".py",
  php: ".php",
  java: ".java",
  csharp: ".cs",
  go: ".go",
  ruby: ".rb",
};

export default function ExportButton({
  code,
  originalCode,
  scanName,
  language,
  disabled,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!code || isExporting) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const extension = EXTENSION_MAP[language] || ".txt";
      const baseName = scanName ? scanName.replace(/\.[^/.]+$/, "") : "code";
      
      zip.file(`fixed_${baseName}${extension}`, code);
      
      if (originalCode) {
        zip.file(`original_${baseName}${extension}`, originalCode);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `indai_${baseName}_export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate zip", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="btn-export"
      id="export-button"
      title="Download corrected code"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {isExporting ? "Zipping..." : "Extract Code"}
    </button>
  );
}
