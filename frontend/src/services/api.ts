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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

    // Response interceptor — handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("indai_token");
          window.location.href = "/";
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
}

// Singleton export
const apiService = new ApiService();
export default apiService;
