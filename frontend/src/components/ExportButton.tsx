/**
 * IndAI — Export Button Component
 * Downloads corrected code as a file.
 */

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
  language,
  disabled,
}: ExportButtonProps) {
  const handleExport = () => {
    if (!code) return;

    const extension = EXTENSION_MAP[language] || ".txt";
    const filename = `indai_corrected_code${extension}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      Extract Corrected Code
    </button>
  );
}
