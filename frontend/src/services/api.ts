/**
 * IndAI — API Service Layer
 * Centralized HTTP client for all backend communication.
 * Uses Axios with JWT interceptors.
 */

import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  DashboardData,
  ScanResult,
  ScanDetailData,
  ScanSummary,
  SecurityRule,
  OwaspSuggestion,
} from "../types";
import { getUserFriendlyErrorMessage } from "../utils/errorHandler";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1/experience`,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    // Request interceptor — attach JWT token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("indai_token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — handle errors and auth
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle auth errors first
        if (error.response?.status === 401) {
          const path = window.location.pathname;
          const isPublicPage = path === '/share' || path.startsWith('/s/');
          if (!isPublicPage) {
            localStorage.removeItem("indai_token");
            window.location.href = "/";
          }
        }

        // Transform into user-friendly message
        const userMessage = getUserFriendlyErrorMessage(error);
        
        // Attach userMessage to the error object so components can use it
        error.userMessage = userMessage;
        
        // If the error has a response object with data, update the data.error field too
        // for backward compatibility with components that check err.response?.data?.error
        if (error.response?.data) {
          error.response.data.error = userMessage;
        }

        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // Auth
  // ============================================

  getGoogleLoginUrl(): string {
    return `${API_BASE_URL}/api/v1/process/auth/google/login`;
  }

  getFacebookLoginUrl(): string {
    return `${API_BASE_URL}/api/v1/process/auth/facebook/login`;
  }

  async loginWithCredentials(identifier: string, password: string): Promise<{ token: string; user: import("../types").User }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/process/auth/login`, { identifier, password });
    return response.data;
  }

  async register(data: any): Promise<{ token: string; user: import("../types").User }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/process/auth/register`, data);
    return response.data;
  }

  async getAuthStatus(): Promise<{
    authenticated: boolean;
    user: import("../types").User;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/process/auth/status`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
        },
      }
    );
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/process/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          },
        }
      );
    } finally {
      localStorage.removeItem("indai_token");
    }
  }

  async updateProfile(data: { phone_number?: string; display_name?: string } | FormData): Promise<{ message: string; user: import("../types").User }> {
    const isFormData = data instanceof FormData;
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/process/auth/profile`,
      data,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
        },
      }
    );
    return response.data;
  }

  // ============================================
  // Scanning
  // ============================================

  async submitScan(
    code: string,
    language: string = "javascript"
  ): Promise<ApiResponse<ScanResult>> {
    const response = await this.client.post("/scan", { code, language });
    return response.data;
  }

  // ============================================
  // Dashboard
  // ============================================

  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    const response = await this.client.get("/dashboard");
    return response.data;
  }

  // ============================================
  // Scan Details
  // ============================================

  async getScanDetail(
    scanId: number
  ): Promise<ApiResponse<ScanDetailData>> {
    const response = await this.client.get(`/scan/${scanId}`);
    return response.data;
  }

  async deleteScan(scanId: number): Promise<{ success: boolean; message?: string }> {
    const response = await this.client.delete(`/scan/${scanId}`);
    return response.data;
  }

  async getOwaspSuggestions(scanId: number): Promise<ApiResponse<{
    scan_id: number;
    total_categories: number;
    suggestions: OwaspSuggestion[];
  }>> {
    const response = await this.client.get(`/scan/${scanId}/suggestions`);
    return response.data;
  }

  // ============================================
  // AI Summary
  // ============================================

  async getScanSummary(scanId: number, lang: string = "en"): Promise<ApiResponse<{
    summary_text: string;
    language: string;
    language_code: string;
    severity_breakdown: Record<string, number>;
    risk_level: string;
  }>> {
    const response = await this.client.get(`/scan/${scanId}/summary?lang=${lang}`);
    return response.data;
  }
  // ============================================
  // Rules
  // ============================================

  async getRules(): Promise<{ data: SecurityRule[]; count: number }> {
    const response = await this.client.get("/rules");
    return response.data;
  }

  // ============================================
  // Agentic Widget
  // ============================================

  async sendAgentMessage(history: any[], context?: any): Promise<{
    success: boolean;
    data: {
      text: string;
      action?: { type: string; payload: string; label?: string };
    };
  }> {
    const response = await this.client.post("/agent/chat", { history, context });
    return response.data;
  }

  async sendAgentFeedback(messageId: string, rating: "upvote" | "downvote"): Promise<{
    success: boolean;
    message?: string;
  }> {
    const response = await this.client.post("/agent/feedback", { message_id: messageId, rating });
    return response.data;
  }

  // ============================================
  // History (via Process API)
  // ============================================

  async getScanHistory(): Promise<{
    data: ScanSummary[];
    count: number;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/process/report/history`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
        },
      }
    );
    return response.data;
  }

  // ============================================
  // File Upload
  // ============================================

  async uploadFile(file: File): Promise<{
    success: boolean;
    data?: {
      content: string;
      language: string;
      filename: string;
      file_type: string;
      lines: number;
    };
    error?: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000, // 60s for large files
    });
    return response.data;
  }

  // ============================================
  // GitHub Integration
  // ============================================

  async fetchGithubCode(url: string): Promise<{
    success: boolean;
    data?: {
      content: string;
      filename: string;
      url: string;
    };
    error?: string;
  }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/process/github/fetch`,
      { url },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    return response.data;
  }

  // ============================================
  // Snippet Sharing
  // ============================================

  async shareSnippet(data: {
    code: string;
    title: string;
    language?: string;
    expiry?: string;
    read_once?: boolean;
    burn_reads?: string;
    password?: string;
    repro_context?: string;
  }): Promise<ApiResponse<{
    short_id: string;
    share_url: string;
    revoke_token: string;
    expires_at: string | null;
    created_at: string | null;
    max_reads: number | null;
    is_protected: boolean;
  }>> {
    const response = await this.client.post("/share", data);
    return response.data;
  }

  async getSnippetMetadata(
    shortId: string
  ): Promise<ApiResponse<{
    short_id: string;
    title: string;
    language: string;
    is_protected: boolean;
    max_reads: number | null;
    read_count: number;
    size_bytes: number;
    expiry_at: string | null;
    created_at: string | null;
  }>> {
    const response = await this.client.get(`/share/${shortId}`);
    return response.data;
  }

  async revealSnippet(
    shortId: string,
    password?: string
  ): Promise<ApiResponse<any>> {
    const response = await this.client.post(`/share/${shortId}/reveal`, { password });
    return response.data;
  }

  async revokeSnippet(revokeToken: string): Promise<{ success: boolean; message?: string }> {
    const response = await this.client.delete(`/share/revoke/${revokeToken}`);
    return response.data;
  }

  // --- GitHub Integrations ---
  getGitHubConnectUrl(userId: number | string): string {
    return `${API_BASE_URL}/api/v1/process/github/connect?user_id=${userId}`;
  }

  async getGitHubRepoTree(repoFullName: string): Promise<ApiResponse<any>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/process/github/repos/tree?repo=${encodeURIComponent(repoFullName)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          },
        }
      );
      return { success: true, data: { files: response.data.files, truncated: response.data.truncated } };
    } catch (error: any) {
      return { success: false, data: null as any, error: getUserFriendlyErrorMessage(error) };
    }
  }

  async scanGitHubRepo(repoFullName: string, files: string[]): Promise<ApiResponse<{ scan_id: string, message: string }>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/process/github/repos/scan?repo=${encodeURIComponent(repoFullName)}`,
        { files },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, data: null as any, error: getUserFriendlyErrorMessage(error) };
    }
  }

  async getGitHubScanStatus(scanId: string): Promise<ApiResponse<any>> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/process/github/scans/${scanId}/status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          },
        }
      );
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return { success: false, data: null as any, error: getUserFriendlyErrorMessage(error) };
    }
  }

  async cancelGitHubScan(scanId: string): Promise<ApiResponse<any>> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/v1/process/github/scans/${scanId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, data: null as any, error: getUserFriendlyErrorMessage(error) };
    }
  }
  async executeScan(code: string, language: string = "javascript"): Promise<ScanResult> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/process/scan/analyze`,
      { code, language },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
        },
      }
    );
    return response.data;
  }

  async executeDemoScan(code: string, language: string = "javascript"): Promise<ScanResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/process/scan/demo-scan`,
        { code, language }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error("You have reached the daily limit for free demo scans. Please log in to continue scanning without limits.");
      }
      throw error;
    }
  }

  async getGitHubRepos(page: number = 1): Promise<any> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/process/github/repos?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("indai_token")}`,
        },
      }
    );
    return response.data;
  }

  // ============================================
  // Admin Dashboard (RBAC)
  // ============================================

  async getAdminDashboard(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async getAdminUsers(page: number = 1, search: string = ""): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/users`, {
      params: { page, search },
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async createAdminUser(data: { email: string; display_name?: string; role: "user" | "admin" }): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/process/admin/users`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async impersonateUser(userId: number): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/process/admin/users/${userId}/impersonate`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async updateUserRole(userId: number, role: "user" | "admin"): Promise<any> {
    const response = await axios.put(`${API_BASE_URL}/api/v1/process/admin/users/${userId}/role`, 
      { role },
      { headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` } }
    );
    return response.data;
  }

  async deleteUser(userId: number): Promise<any> {
    const response = await axios.delete(`${API_BASE_URL}/api/v1/process/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async getAdminScans(page: number = 1): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/scans`, {
      params: { page },
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async getAdminAuditLogs(page: number = 1): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/audit`, {
      params: { page },
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async getAdminConfig(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async updateAdminConfig(key: string, value: any): Promise<any> {
    const response = await axios.put(`${API_BASE_URL}/api/v1/process/admin/config`, 
      { key, value },
      { headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` } }
    );
    return response.data;
  }

  async getAdminAlerts(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/alerts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async markAdminAlertsRead(): Promise<any> {
    const response = await axios.put(`${API_BASE_URL}/api/v1/process/admin/alerts/read`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async clearAdminAlerts(): Promise<any> {
    const response = await axios.delete(`${API_BASE_URL}/api/v1/process/admin/alerts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async getSystemHealth(): Promise<any> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/health`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` }
    });
    return response.data;
  }

  async blacklistIP(ipAddress: string, reason?: string): Promise<any> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/process/admin/blacklist`, 
      { ip_address: ipAddress, reason },
      { headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` } }
    );
    return response.data;
  }

  async downloadComplianceReport(): Promise<void> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/process/admin/report/csv`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("indai_token")}` },
      responseType: 'blob'
    });
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'indai_compliance_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

// Singleton export
const apiService = new ApiService();
export default apiService;
