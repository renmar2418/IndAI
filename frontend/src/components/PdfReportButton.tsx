/**
 * IndAI — PDF Report Button Component
 * Generates a professional vulnerability report as a downloadable PDF.
 */

import { useState } from "react";
import { jsPDF } from "jspdf";
import type { ScanResult, Vulnerability } from "../types";

interface PdfReportButtonProps {
  result: ScanResult;
  language: string;
}

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  critical: [239, 68, 68],
  high: [249, 115, 22],
  medium: [234, 179, 8],
  low: [59, 130, 246],
  info: [107, 114, 128],
};

export default function PdfReportButton({ result, language }: PdfReportButtonProps) {
  const [generating, setGenerating] = useState(false);

  function handleExport() {
    setGenerating(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // === Header ===
      doc.setFillColor(6, 10, 20);
      doc.rect(0, 0, pageWidth, 35, "F");

      doc.setTextColor(0, 240, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("IndAI", margin, 18);

      doc.setTextColor(168, 85, 247);
      doc.setFontSize(12);
      doc.text("Security Vulnerability Report", margin, 27);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.text(new Date().toLocaleString(), pageWidth - margin, 27, { align: "right" });

      y = 45;

      // === Summary Box ===
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "F");

      doc.setTextColor(226, 232, 240);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Scan Summary", margin + 5, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Language: ${language.toUpperCase()}`, margin + 5, y + 15);
      doc.text(`Total Issues: ${result.total_issues}`, margin + 60, y + 15);
      doc.text(`Risk Score: ${result.summary.risk_score ?? "N/A"}/100`, margin + 110, y + 15);

      // Severity breakdown
      const severities = result.summary.by_severity;
      let sx = margin + 5;
      doc.text("Severity:", sx, y + 23);
      sx += 22;
      for (const [sev, count] of Object.entries(severities)) {
        if (count === 0) continue;
        const color = SEVERITY_COLORS[sev] || [107, 114, 128];
        doc.setTextColor(color[0], color[1], color[2]);
        const label = `${sev.toUpperCase()}: ${count}`;
        doc.text(label, sx, y + 23);
        sx += doc.getTextWidth(label) + 8;
      }

      y += 38;

      // === Vulnerabilities ===
      doc.setTextColor(226, 232, 240);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Detected Vulnerabilities", margin, y);
      y += 8;

      result.vulnerabilities.forEach((vuln: Vulnerability, index: number) => {
        // Check if we need a new page
        if (y > 260) {
          doc.addPage();
          y = margin;
        }

        const color = SEVERITY_COLORS[vuln.severity] || [107, 114, 128];

        // Severity badge
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(margin, y, 18, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(vuln.severity.toUpperCase(), margin + 1, y + 3.8);

        // Title
        doc.setTextColor(226, 232, 240);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${vuln.title}`, margin + 22, y + 4);
        y += 8;

        // Rule ID + Line
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`${vuln.rule_id}${vuln.line_number ? ` • Line ${vuln.line_number}` : ""}${vuln.owasp_category ? ` • ${vuln.owasp_category}` : ""}`, margin + 3, y);
        y += 5;

        // Description
        doc.setTextColor(180, 190, 210);
        doc.setFontSize(8);
        const descLines = doc.splitTextToSize(vuln.description, contentWidth - 6);
        doc.text(descLines, margin + 3, y);
        y += descLines.length * 3.5 + 2;

        // Code snippet
        if (vuln.code_snippet) {
          if (y > 260) { doc.addPage(); y = margin; }
          doc.setFillColor(20, 25, 40);
          const snippetLines = doc.splitTextToSize(vuln.code_snippet.trim(), contentWidth - 10);
          const snippetHeight = snippetLines.length * 3.5 + 4;
          doc.roundedRect(margin + 3, y, contentWidth - 6, snippetHeight, 2, 2, "F");
          doc.setTextColor(239, 68, 68);
          doc.setFontSize(7);
          doc.setFont("courier", "normal");
          doc.text(snippetLines, margin + 6, y + 4);
          y += snippetHeight + 3;
        }

        // Suggested fix
        if (vuln.suggested_fix) {
          if (y > 260) { doc.addPage(); y = margin; }
          doc.setFillColor(15, 30, 20);
          const fixLines = doc.splitTextToSize(vuln.suggested_fix.trim(), contentWidth - 10);
          const fixHeight = fixLines.length * 3.5 + 4;
          doc.roundedRect(margin + 3, y, contentWidth - 6, fixHeight, 2, 2, "F");
          doc.setTextColor(34, 197, 94);
          doc.setFontSize(7);
          doc.setFont("courier", "normal");
          doc.text(fixLines, margin + 6, y + 4);
          y += fixHeight + 3;
        }

        y += 4; // spacing between vulnerabilities
      });

      // === Footer ===
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Generated by IndAI Security Scanner — Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save(`indai-report-${result.scan_id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      className="btn-export btn-pdf"
      id="pdf-export-button"
      title="Download vulnerability report as PDF"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
      </svg>
      {generating ? "Generating..." : "Export PDF Report"}
    </button>
  );
}
