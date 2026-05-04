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
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper function for new pages
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          // Add subtle header to continued pages
          doc.setFillColor(248, 250, 252);
          doc.rect(0, 0, pageWidth, 15, "F");
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("IndAI Security Vulnerability Report - Continued", margin, 10);
          y = 25;
        }
      };

      // === Professional Cover / Header ===
      // Deep blue branding header
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, pageWidth, 45, "F");

      // Logo/Title
      doc.setTextColor(0, 240, 255); // Cyan accent
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("IndAI", margin, 22);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Automated Security Audit Report", margin, 32);

      // Date & Meta
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, 25, { align: "right" });
      doc.text(`Target: ${language.toUpperCase()} Codebase`, pageWidth - margin, 32, { align: "right" });

      y = 55;

      // === Executive Summary Section ===
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", margin, y);
      
      // Horizontal Rule
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Summary Grid
      const gridY = y;
      doc.setFillColor(248, 250, 252); // Light slate
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, gridY, contentWidth, 35, 2, 2, "FD");

      // Score
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("RISK SCORE", margin + 10, gridY + 12);
      
      doc.setTextColor((result.summary?.risk_score ?? 0) > 60 ? 239 : ((result.summary?.risk_score ?? 0) > 30 ? 234 : 34), 
                       (result.summary?.risk_score ?? 0) > 60 ? 68 : ((result.summary?.risk_score ?? 0) > 30 ? 179 : 197), 
                       (result.summary?.risk_score ?? 0) > 60 ? 68 : ((result.summary?.risk_score ?? 0) > 30 ? 8 : 94));
      doc.setFontSize(24);
      doc.text(`${result.summary?.risk_score ?? 0}/100`, margin + 10, gridY + 24);

      // Total Issues
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text("TOTAL ISSUES", margin + 60, gridY + 12);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(24);
      doc.text(`${result.total_issues}`, margin + 60, gridY + 24);

      // Breakdown
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text("SEVERITY BREAKDOWN", margin + 110, gridY + 12);
      
      let bx = margin + 110;
      doc.setFontSize(9);
      for (const [sev, count] of Object.entries(result.summary.by_severity)) {
        if (count === 0) continue;
        const color = SEVERITY_COLORS[sev] || [107, 114, 128];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`${sev.toUpperCase()}: ${count}`, bx, gridY + 22);
        bx += 25;
      }

      y += 50;

      // === Vulnerability Details ===
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Findings", margin, y);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      result.vulnerabilities.forEach((vuln: Vulnerability, index: number) => {
        const color = SEVERITY_COLORS[vuln.severity] || [107, 114, 128];
        
        checkPageBreak(30);

        // Finding Header Background (very light tint of severity color)
        doc.setFillColor(color[0], color[1], color[2]);
        doc.setGState(new (doc as any).GState({opacity: 0.05}));
        doc.rect(margin, y, contentWidth, 10, "F");
        doc.setGState(new (doc as any).GState({opacity: 1.0}));

        // Left accent border
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(margin, y, 3, 10, "F");

        // Title
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${vuln.title}`, margin + 6, y + 6.5);
        
        // Severity Badge (right aligned)
        const sevText = vuln.severity.toUpperCase();
        doc.setFontSize(8);
        const sevWidth = doc.getTextWidth(sevText);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(pageWidth - margin - sevWidth - 6, y + 2.5, sevWidth + 4, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(sevText, pageWidth - margin - sevWidth - 4, y + 6);
        
        y += 14;

        // Meta Info
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Rule ID: ", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${vuln.rule_id}`, margin + 15, y);
        
        if (vuln.line_number) {
            doc.setFont("helvetica", "bold");
            doc.text("Location: ", margin + 60, y);
            doc.setFont("helvetica", "normal");
            doc.text(`Line ${vuln.line_number}`, margin + 76, y);
        }

        if (vuln.owasp_category) {
            doc.setFont("helvetica", "bold");
            doc.text("OWASP: ", margin + 110, y);
            doc.setFont("helvetica", "normal");
            doc.text(`${vuln.owasp_category}`, margin + 125, y);
        }
        
        y += 6;

        // Description
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(vuln.description, contentWidth);
        checkPageBreak(descLines.length * 5);
        doc.text(descLines, margin, y);
        y += descLines.length * 4.5 + 4;

        // Code Snippet (Vulnerable Code)
        if (vuln.code_snippet) {
          const snippetLines = doc.splitTextToSize(vuln.code_snippet.trim(), contentWidth - 8);
          const snippetHeight = snippetLines.length * 4 + 8;
          checkPageBreak(snippetHeight + 10);
          
          doc.setTextColor(239, 68, 68); // Red label
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("VULNERABLE CODE", margin, y);
          y += 3;

          doc.setFillColor(248, 250, 252); // Light gray block
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin, y, contentWidth, snippetHeight, 1, 1, "FD");
          
          doc.setTextColor(15, 23, 42); // Dark text
          doc.setFont("courier", "normal");
          doc.text(snippetLines, margin + 4, y + 6);
          y += snippetHeight + 6;
        }

        // Suggested Fix
        const fixText = vuln.accurate_fix || vuln.suggested_fix;
        if (fixText) {
          const fixLines = doc.splitTextToSize(fixText.trim(), contentWidth - 8);
          const fixHeight = fixLines.length * 4 + 8;
          checkPageBreak(fixHeight + 10);
          
          doc.setTextColor(34, 197, 94); // Green label
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("SUGGESTED REMEDIATION", margin, y);
          y += 3;

          doc.setFillColor(240, 253, 244); // Very light green block
          doc.setDrawColor(187, 247, 208);
          doc.roundedRect(margin, y, contentWidth, fixHeight, 1, 1, "FD");
          
          doc.setTextColor(20, 83, 45); // Dark green text
          doc.setFont("courier", "normal");
          doc.text(fixLines, margin + 4, y + 6);
          y += fixHeight + 8;
        }

        y += 6; // Spacing before next finding
      });

      // === Footer ===
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        doc.text(
          `IndAI Confidential Security Report — Generated ${new Date().toLocaleDateString()}`,
          margin,
          pageHeight - 8
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" }
        );
      }

      doc.save(`IndAI_Security_Report_${result.scan_id}.pdf`);
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
