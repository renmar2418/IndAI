/**
 * IndAI — Agentic Engine (Local Intelligence)
 * Runs 100% in the browser — ZERO API calls for intent detection.
 * Only calls existing REST endpoints for CRUD operations (delete, list, etc.)
 * This means it NEVER fails due to AI service outages.
 */

import apiService from "../services/api";

// ============================================
// Types
// ============================================

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
  action?: AgentAction;
  suggestions?: string[];
  feedback?: "upvote" | "downvote" | "none";
}

export interface AgentAction {
  type: "navigate" | "show_scans" | "scan_deleted" | "show_summary" | "open_scan_page" | string;
  payload?: any;
  label?: string;
}

// ============================================
// Intent Patterns
// ============================================

type IntentType =
  | "greeting"
  | "scan_create"
  | "scan_list"
  | "scan_delete"
  | "scan_delete_all"
  | "scan_summary"
  | "navigate"
  | "suggest"
  | "security_tip"
  | "unknown";

const INTENT_PATTERNS: { type: IntentType; patterns: RegExp[]; weight: number }[] = [
  {
    type: "greeting",
    patterns: [
      /^(hi|hello|hey|yo|sup|good\s?(morning|afternoon|evening)|kumusta|musta|bonjour|hola)/i,
      /^(what's up|whats up|how are you)/i,
    ],
    weight: 1.5,
  },
  {
    type: "scan_create",
    patterns: [
      /\b(scan|check|analyze|audit|review)\b.*\b(code|script|file|my)\b/i,
      /\b(new|create|start|run|do)\b.*\b(scan|analysis|audit)\b/i,
      /\bscan\s+(this|my|the)\b/i,
    ],
    weight: 1.2,
  },
  {
    type: "scan_delete_all",
    patterns: [
      /\b(delete|remove|clear|erase)\s+(all|every|each)\b/i,
      /\bclear\s+(all\s+)?scans?/i,
      /\bdelete\s+all\b/i,
      /\bremove\s+(all|every)\b/i,
    ],
    weight: 2.0, // Must always beat scan_delete
  },
  {
    type: "scan_delete",
    patterns: [
      /\b(delete|remove|clear|erase)\b.*\b(scan|result)/i,
      /\bdelete\s+(scan\s*)?(#?\d+)/i,
    ],
    weight: 1.4,
  },
  {
    type: "scan_list",
    patterns: [
      /\b(show|list|view|get|display|see)\b.*\b(scan|recent|history|result)/i,
      /\b(my|all)\s+(scan|result|histor)/i,
      /\bhow many\b.*\b(scan|vulnerabilit|issue)/i,
      /\b(recent|latest|last)\s+(scan|result)/i,
    ],
    weight: 1.3,
  },
  {
    type: "scan_summary",
    patterns: [
      /\b(summar|explain|tell me about|describe)\b.*\b(scan|result|finding|vulnerabilit)/i,
      /\bsummarize\b/i,
    ],
    weight: 1.2,
  },
  {
    type: "navigate",
    patterns: [
      /\b(go\s+to|open|navigate\s+to|take\s+me\s+to|show\s+me)\b\s+(the\s+)?(dashboard|scan|home|detail)/i,
      /\bgo\s+(dashboard|scan|home)\b/i,
    ],
    weight: 1.5,
  },
  {
    type: "suggest",
    patterns: [
      /\b(what\s+should|suggest|recommend|help|what\s+can|what\s+do)\b/i,
      /\b(next\s+step|what\s+now|tips?)\b/i,
    ],
    weight: 1.0,
  },
  {
    type: "security_tip",
    patterns: [
      /\b(teach|learn|explain|what\s+is)\b.*\b(sql\s*inject|xss|csrf|owasp|injection|cross.?site|brute.?force)/i,
      /\b(owasp|injection|xss|csrf|auth|crypto|access\s+control)\b/i,
      /\b(how\s+to|prevent|protect|fix)\b.*\b(hack|attack|exploit|inject|vulnerabilit)/i,
      /\bsecurity\s+(tip|best\s+practice|advice|rule)/i,
    ],
    weight: 1.3,
  },
];

// ============================================
// Security Knowledge Base (OWASP)
// ============================================

const SECURITY_TIPS: Record<string, { title: string; explanation: string; prevention: string }> = {
  injection: {
    title: "🔴 A03:2021 — Injection",
    explanation: "Injection attacks occur when untrusted data is sent to an interpreter. SQL injection, OS command injection, and LDAP injection are common.",
    prevention: "✅ Use parameterized queries\n✅ Validate all inputs\n✅ Use ORM frameworks\n✅ Apply least privilege to DB accounts",
  },
  xss: {
    title: "🟠 A03:2021 — Cross-Site Scripting (XSS)",
    explanation: "XSS injects malicious scripts into web pages viewed by other users, stealing cookies or redirecting users.",
    prevention: "✅ Escape output in HTML/JS/CSS contexts\n✅ Use Content Security Policy headers\n✅ Sanitize HTML with DOMPurify\n✅ Use auto-escaping frameworks (React)",
  },
  csrf: {
    title: "🟠 Cross-Site Request Forgery (CSRF)",
    explanation: "CSRF tricks authenticated users into submitting unwanted requests to a server.",
    prevention: "✅ Use anti-CSRF tokens\n✅ Set SameSite cookie attribute\n✅ Verify Origin/Referer headers\n✅ Re-authenticate for sensitive actions",
  },
  auth: {
    title: "🔴 A07:2021 — Authentication Failures",
    explanation: "Weak authentication allows brute-force attacks, default credentials, or session hijacking.",
    prevention: "✅ Enforce 12+ char passwords\n✅ Implement MFA\n✅ Rate-limit login attempts\n✅ Use secure HttpOnly cookies",
  },
  crypto: {
    title: "🟠 A02:2021 — Cryptographic Failures",
    explanation: "Weak crypto, hardcoded secrets, or cleartext transmission exposes sensitive data.",
    prevention: "✅ Use AES-256, bcrypt, argon2\n✅ Never hardcode API keys\n✅ Enforce HTTPS everywhere\n✅ Store secrets in env vars",
  },
  access_control: {
    title: "🔴 A01:2021 — Broken Access Control",
    explanation: "Lets users act outside their permissions — accessing other users' data or escalating privileges.",
    prevention: "✅ Deny by default\n✅ Implement RBAC\n✅ Validate permissions server-side\n✅ Log access control failures",
  },
  owasp: {
    title: "🛡️ OWASP Top 10 Overview",
    explanation: "The OWASP Top 10 is the industry standard for web application security risks.",
    prevention: "Top categories:\n1. Broken Access Control\n2. Cryptographic Failures\n3. Injection\n4. Insecure Design\n5. Security Misconfiguration\n6. Vulnerable Components\n7. Auth Failures\n8. Data Integrity Failures\n9. Logging Failures\n10. SSRF",
  },
};

const GREETINGS = [
  "Hey there! 👋 I'm your IndAI security assistant. I can scan code, manage your scans, or teach you about security. What do you need?",
  "Hello! 🤖 I'm ready to help with security scanning. Ask me to scan code, show recent results, or learn about OWASP!",
  "Hi! 🛡️ I can help you keep your code secure. Try \"show my recent scans\" or \"teach me about SQL injection\".",
];

// ============================================
// Agent Engine
// ============================================

export class AgentEngine {
  /**
   * Detect the intent of a user message — runs locally, no API.
   */
  private static detectIntent(message: string): { type: IntentType; entities: Record<string, string> } {
    const input = message.trim().toLowerCase();
    let bestType: IntentType = "unknown";
    let bestScore = 0;
    const entities: Record<string, string> = {};

    for (const { type, patterns, weight } of INTENT_PATTERNS) {
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          const score = weight * (match[0].length / input.length + 0.5);
          if (score > bestScore) {
            bestScore = score;
            bestType = type;
          }
        }
      }
    }

    // Extract scan ID
    const scanIdMatch = input.match(/(scan\s*)?#?(\d+)/);
    if (scanIdMatch) entities.scanId = scanIdMatch[2];

    // Extract nav target
    const navMatch = input.match(/\b(dashboard|scan|home|detail)\b/i);
    if (navMatch) entities.page = navMatch[1].toLowerCase();

    // Extract security topic
    for (const topic of Object.keys(SECURITY_TIPS)) {
      if (input.includes(topic) || input.includes(topic.replace("_", " "))) {
        entities.topic = topic;
      }
    }
    if (input.includes("sql inject")) entities.topic = "injection";
    if (input.includes("cross-site scripting") || input.includes("cross site scripting")) entities.topic = "xss";

    return { type: bestType, entities };
  }

  /**
   * Process a user message — fully local with API calls only for CRUD.
   * Uses explicit keyword pre-checks for critical intents to avoid
   * pattern-scoring edge cases.
   */
  static async processMessage(
    message: string,
    _history: AgentMessage[],
    context?: { page?: string; scanId?: number }
  ): Promise<AgentMessage> {
    const input = message.trim().toLowerCase();

    // ─── Explicit pre-checks (highest priority) ─────────────

    // Range delete: "delete scan 33 to 37" / "delete 10-20" / "remove scan 5 to 15"
    const rangeMatch = input.match(/\b(delete|remove|erase)\b.*?(\d+)\s*(to|-|through)\s*(\d+)/i);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[2], 10);
      const to = parseInt(rangeMatch[4], 10);
      return this.handleScanDeleteRange(Math.min(from, to), Math.max(from, to));
    }

    // "delete all" / "remove all" / "clear all"
    if (/\b(delete|remove|clear|erase)\b.*\ball\b/i.test(input)) {
      return this.handleDeleteAll();
    }

    // "go to dashboard" / "open scan" / "navigate to home"
    const navPrecheck = input.match(/\b(go\s*to|open|navigate\s*to|take\s*me\s*to)\s+(the\s+)?(dashboard|scan|home)\b/i);
    if (navPrecheck) {
      return this.handleNavigate(navPrecheck[3].toLowerCase());
    }

    // ─── Pattern-based detection for everything else ────────
    const { type, entities } = this.detectIntent(message);

    switch (type) {
      case "greeting":
        return this.makeReply(
          GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
          undefined,
          ["Show my recent scans", "Scan code for vulnerabilities", "What is SQL injection?"]
        );

      case "scan_create":
        return this.makeReply(
          "🔍 Let's scan some code! Taking you to the scan page now...",
          { type: "navigate", payload: "/scan", label: "Go to Scan Page" },
          ["What is the OWASP Top 10?", "Show recent scans"]
        );

      case "scan_list":
        return this.handleScanList();

      case "scan_delete_all":
        return this.handleDeleteAll();

      case "scan_delete":
        return this.handleScanDelete(entities.scanId);

      case "scan_summary":
        return this.handleScanSummary(entities.scanId, context?.scanId);

      case "navigate":
        return this.handleNavigate(entities.page || "dashboard");

      case "suggest":
        return this.handleSuggest(context?.page);

      case "security_tip":
        return this.handleSecurityTip(entities.topic);

      case "unknown":
      default:
        try {
          // Transform history to match backend expectations
          const backendHistory = history.map(msg => ({
            role: msg.role === "agent" ? "model" : "user",
            text: msg.text
          }));
          
          // Append current message
          backendHistory.push({ role: "user", text: message });

          const chatResponse = await apiService.sendAgentMessage(backendHistory, context);
          if (chatResponse.success && chatResponse.data) {
            return {
              id: crypto.randomUUID(),
              role: "agent",
              text: chatResponse.data.text,
              timestamp: new Date(),
              action: chatResponse.data.action as AgentAction | undefined,
              suggestions: ["What can you do?", "Show my scans", "Security tips"]
            };
          }
        } catch (e) {
          console.error("AI Chat fallback failed:", e);
        }
        
        return this.makeReply(
          "I'm not sure I understand that. Try asking me to:\n\n• **Show my recent scans**\n• **Delete scan #5** or **Delete all scans**\n• **What is SQL injection?**\n• **Go to dashboard**",
          undefined,
          ["What can you do?", "Show my scans", "Security tips"]
        );
    }
  }

  // ============================================
  // CRUD Handlers — call existing API endpoints
  // ============================================

  private static async handleScanList(): Promise<AgentMessage> {
    try {
      const response = await apiService.getDashboard();
      if (response.success) {
        const { stats, recent_scans } = response.data;
        if (stats.total_scans === 0) {
          return this.makeReply(
            "📭 You haven't run any scans yet! Want to scan your first piece of code?",
            { type: "navigate", payload: "/scan", label: "Start Scanning" },
            ["Scan code now", "What is OWASP?"]
          );
        }

        let text = `📊 **Your scan overview:**\n• Total scans: **${stats.total_scans}**\n• Vulnerabilities found: **${stats.total_vulnerabilities}**\n\n`;
        text += `🕐 **Recent scans:**\n`;
        recent_scans.slice(0, 8).forEach((scan, i) => {
          const badge = scan.vulnerability_count > 0 ? `⚠️ ${scan.vulnerability_count} issues` : "✅ Clean";
          const date = new Date(scan.created_at.endsWith("Z") ? scan.created_at : scan.created_at + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          text += `${i + 1}. #${scan.id} · **${scan.language}** · ${badge} · ${date}\n`;
        });

        return this.makeReply(text, undefined, ["Delete all scans", "Go to dashboard", "Scan more code"]);
      }
      return this.makeReply("❌ Couldn't fetch your scans. Make sure the backend is running.");
    } catch {
      return this.makeReply("⚠️ Couldn't connect to the server. Is your backend running on port 5000?", undefined, ["Try again"]);
    }
  }

  private static async handleScanDelete(scanIdStr?: string): Promise<AgentMessage> {
    if (!scanIdStr) {
      // Show available scans with details so user can pick
      try {
        const dashboard = await apiService.getDashboard();
        if (dashboard.success && dashboard.data.recent_scans.length > 0) {
          let text = "🗑️ Which scan do you want to delete?\n\n";
          dashboard.data.recent_scans.slice(0, 8).forEach((scan) => {
            const date = new Date(scan.created_at.endsWith("Z") ? scan.created_at : scan.created_at + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });
            text += `• #${scan.id} · **${scan.language}** · ${scan.vulnerability_count} vulns · ${date}\n`;
          });
          text += "\nSay **\"Delete scan #5\"** or **\"Delete scan 33 to 37\"**";
          return this.makeReply(text, undefined, ["Delete all scans", "Show my scans"]);
        }
      } catch { /* fallthrough */ }
      return this.makeReply(
        "🗑️ Which scan? Say **\"Delete scan #5\"** or **\"Delete scan 33 to 37\"** for a range",
        undefined,
        ["Show my scans", "Delete all scans"]
      );
    }

    const scanId = parseInt(scanIdStr, 10);
    try {
      const response = await apiService.deleteScan(scanId);
      if (response.success) {
        return this.makeReply(
          `✅ **Scan #${scanId} deleted successfully!** 🗑️`,
          { type: "scan_deleted", payload: scanId },
          ["Show my scans", "Go to dashboard"]
        );
      }
      return this.makeReply(`❌ Couldn't delete scan #${scanId}. It may not exist.`);
    } catch {
      return this.makeReply(`⚠️ Error deleting scan #${scanId}. The scan might not exist.`, undefined, ["Show my scans"]);
    }
  }

  private static async handleScanDeleteRange(from: number, to: number): Promise<AgentMessage> {
    const count = to - from + 1;
    if (count > 50) {
      return this.makeReply(`⚠️ Range too large (${count} scans). Try a smaller range or **\"Delete all scans\"**.`);
    }

    let deleted = 0;
    let failed = 0;
    const failedIds: number[] = [];

    for (let id = from; id <= to; id++) {
      try {
        await apiService.deleteScan(id);
        deleted++;
      } catch {
        failed++;
        failedIds.push(id);
      }
    }

    let text = "";
    if (failed === 0) {
      text = `✅ **${deleted} scans deleted** (#${from} to #${to})! 🗑️`;
    } else if (deleted === 0) {
      text = `❌ None of the scans #${from}-#${to} could be deleted. They may not exist.`;
    } else {
      text = `⚠️ Deleted **${deleted}/${count}** scans. ${failed} not found: ${failedIds.join(", ")}`;
    }

    return this.makeReply(text, { type: "scan_deleted", payload: { from, to } }, ["Show my scans", "Go to dashboard"]);
  }

  private static async handleDeleteAll(): Promise<AgentMessage> {
    try {
      // Fetch all scans first
      const dashboard = await apiService.getDashboard();
      if (!dashboard.success || dashboard.data.recent_scans.length === 0) {
        return this.makeReply("📭 No scans to delete — your history is already clean!", undefined, ["Scan code now"]);
      }

      const scans = dashboard.data.recent_scans;
      const total = scans.length;
      let deleted = 0;
      let failed = 0;

      // Delete each scan
      for (const scan of scans) {
        try {
          await apiService.deleteScan(scan.id);
          deleted++;
        } catch {
          failed++;
        }
      }

      const text = failed === 0
        ? `✅ **All ${deleted} scans deleted successfully!** 🗑️\n\nYour scan history is now clean.`
        : `⚠️ Deleted **${deleted}/${total}** scans. ${failed} failed (may have been already deleted).`;

      return this.makeReply(text, { type: "navigate", payload: "/dashboard", label: "Go to Dashboard" }, ["Scan code now", "Go to dashboard"]);
    } catch {
      return this.makeReply("⚠️ Error connecting to the server. Please try again.", undefined, ["Try again"]);
    }
  }

  private static async handleScanSummary(scanIdStr?: string, contextScanId?: number): Promise<AgentMessage> {
    const scanId = scanIdStr ? parseInt(scanIdStr, 10) : contextScanId;
    if (!scanId) {
      return this.makeReply("📝 Which scan? Tell me the number:\n• **\"Summarize scan #3\"**", undefined, ["Show my scans"]);
    }

    try {
      const response = await apiService.getScanSummary(scanId, "en");
      if (response.success) {
        const { summary_text, risk_level } = response.data;
        const emoji: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵", safe: "🟢" };
        return this.makeReply(
          `${emoji[risk_level] || "🔍"} **Scan #${scanId} — ${risk_level.toUpperCase()}:**\n\n${summary_text}`,
          { type: "navigate", payload: `/scan/${scanId}`, label: `View Scan #${scanId}` },
          ["Show my scans"]
        );
      }
      return this.makeReply(`❌ Couldn't get summary for scan #${scanId}.`);
    } catch {
      return this.makeReply(`⚠️ Error fetching summary for scan #${scanId}.`, undefined, ["Show my scans"]);
    }
  }

  private static handleNavigate(page: string): AgentMessage {
    const routes: Record<string, { path: string; label: string }> = {
      dashboard: { path: "/dashboard", label: "Dashboard" },
      scan: { path: "/scan", label: "Scan Code" },
      home: { path: "/", label: "Home Page" },
    };
    const route = routes[page] || routes.dashboard;
    return this.makeReply(
      `🧭 Taking you to **${route.label}**...`,
      { type: "navigate", payload: route.path, label: `Go to ${route.label}` },
      ["Show my scans", "What can you do?"]
    );
  }

  private static handleSuggest(currentPage?: string): AgentMessage {
    let text = "💡 Here's what I can do:\n\n";
    text += "🔍 **Scan** — \"Scan my code for vulnerabilities\"\n";
    text += "📊 **List** — \"Show my recent scans\"\n";
    text += "🗑️ **Delete** — \"Delete scan #5\" or \"Delete all scans\"\n";
    text += "📝 **Summarize** — \"Summarize scan #3\"\n";
    text += "🛡️ **Learn** — \"What is SQL injection?\"\n";
    text += "🧭 **Navigate** — \"Go to dashboard\"\n";

    if (currentPage === "scan") text += "\n💡 **Tip:** You're on the scan page — paste code and hit Scan!";
    if (currentPage === "dashboard") text += "\n💡 **Tip:** You're on the dashboard — click any scan to view details.";

    return this.makeReply(text, undefined, ["Scan code", "Show my scans", "Delete all scans", "What is XSS?"]);
  }

  private static handleSecurityTip(topic?: string): AgentMessage {
    if (!topic || !SECURITY_TIPS[topic]) {
      const topics = Object.keys(SECURITY_TIPS);
      topic = topics[Math.floor(Math.random() * topics.length)];
    }
    const tip = SECURITY_TIPS[topic!];
    const text = `${tip.title}\n\n📖 **What is it?**\n${tip.explanation}\n\n🛡️ **Prevention:**\n${tip.prevention}`;
    const others = Object.keys(SECURITY_TIPS).filter(t => t !== topic).slice(0, 3).map(t => `What is ${t.replace("_", " ")}?`);
    return this.makeReply(text, undefined, others);
  }

  // ============================================
  // Utilities
  // ============================================

  private static makeReply(text: string, action?: AgentAction, suggestions?: string[]): AgentMessage {
    return {
      id: crypto.randomUUID(),
      role: "agent",
      text,
      timestamp: new Date(),
      action,
      suggestions,
    };
  }

  static getSuggestions(page?: string): string[] {
    const base = ["What can you do?"];
    switch (page) {
      case "scan": return [...base, "Show recent scans", "What is XSS?", "Go to dashboard"];
      case "dashboard": return [...base, "Delete all scans", "What is SQL injection?", "Security tips"];
      case "detail": return [...base, "Summarize this scan", "Delete this scan", "Show all scans"];
      default: return [...base, "Scan code", "Show my scans", "Learn about OWASP"];
    }
  }
}
