/**
 * IndAI — TypeScript Type Definitions
 * Central type definitions for the entire frontend application.
 */

// ============================================
// Domain Models
// ============================================

export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Scan {
  id: number;
  user_id: number;
  original_code: string;
  corrected_code: string | null;
  language: string;
  status: ScanStatus;
  vulnerability_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScanSummary {
  id: number;
  language: string;
  status: ScanStatus;
  vulnerability_count: number;
  created_at: string;
}

export type ScanStatus = "pending" | "scanning" | "completed" | "failed";

export interface Vulnerability {
  id: number;
  scan_id: number;
  rule_id: string;
  severity: Severity;
  severity_color: string;
  severity_order: number;
  title: string;
  description: string;
  line_number: number | null;
  column: number | null;
  code_snippet: string;
  suggested_fix: string;
  owasp_category: string;
  created_at: string;
}

export type Severity = "critical" | "high" | "medium" | "low" | "info";

// ============================================
// API Response Types
// ============================================

export interface ScanResult {
  scan_id: number;
  status: string;
  original_code: string;
  corrected_code: string;
  language: string;
  vulnerabilities: Vulnerability[];
  summary: ScanSummaryStats;
  total_issues: number;
  ai_summary?: AiSummary;
  created_at: string;
}

export interface AiSummary {
  summary_text: string;
  language: string;
  language_code: string;
  severity_breakdown: Record<string, number>;
  risk_level: string;
}

export interface ScanSummaryStats {
  by_severity: Record<Severity, number>;
  by_owasp?: Record<string, number>;
  total: number;
  risk_score?: number;
}

export interface DashboardData {
  user: User;
  stats: {
    total_scans: number;
    total_vulnerabilities: number;
    scans_with_fixes: number;
    average_vulnerabilities: number;
  };
  recent_scans: ScanSummary[];
  available_rules: number;
}

export interface ScanDetailData {
  scan: Scan;
  vulnerabilities: Vulnerability[];
  summary: ScanSummaryStats;
}

export interface SecurityRule {
  rule_id: string;
  title: string;
  description: string;
  severity: Severity;
  owasp_category: string;
}

export interface OwaspSuggestion {
  owasp_category: string;
  vulnerability_count: number;
  worst_severity: Severity;
  affected_rules: string[];
  solution: string;
  steps: string[];
  reference: string;
  priority: number;
}

// ============================================
// API Response Wrappers
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  count: number;
}

// ============================================
// Component Props
// ============================================

export interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  onScan: () => void;
  isScanning: boolean;
}

export interface ResultsPanelProps {
  result: ScanResult | null;
  isLoading: boolean;
}

export interface ExportButtonProps {
  code: string;
  language: string;
  disabled: boolean;
}
