/**
 * IndAI — Agentic Widget
 * Floating AI assistant that provides CRUD automation, security tips,
 * and intelligent suggestions. Available on every authenticated page.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AgentEngine } from "../utils/agentEngine";
import type { AgentMessage } from "../utils/agentEngine";
import apiService from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AgenticWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem("indai_agent_msgs");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((m: AgentMessage) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch { /* ignore */ }
    return [];
  });
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try { sessionStorage.setItem("indai_agent_msgs", JSON.stringify(messages.slice(-50))); } catch { /* full */ }
    }
  }, [messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Determine current page for context
  const currentPage = location.pathname.startsWith("/scan/")
    ? "detail"
    : location.pathname === "/scan"
    ? "scan"
    : location.pathname === "/dashboard"
    ? "dashboard"
    : "home";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Welcome message on first open
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
    if (messages.length === 0) {
      const welcomeSuggestions = AgentEngine.getSuggestions(currentPage);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: "👋 Hey! I'm your **IndAI Security Assistant**. I can scan code, manage your results, and teach you about security.\n\nWhat would you like to do?",
          timestamp: new Date(),
          suggestions: welcomeSuggestions,
        },
      ]);
    }
  }, [messages.length, currentPage]);

  // Send message
  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isProcessing) return;

    // Add user message
    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      // Extract scan ID from URL context
      const scanIdMatch = location.pathname.match(/\/scan\/(\d+)/);
      const contextScanId = scanIdMatch ? parseInt(scanIdMatch[1], 10) : undefined;

      // Check if user is admin
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";

      const response = await AgentEngine.processMessage(messageText, messages, {
        page: currentPage,
        scanId: contextScanId,
        isAdmin,
      });

      setMessages((prev) => [...prev, response]);

      // Auto-execute actions based on response type
      if (response.action) {
        const { type: actionType, payload } = response.action;

        // Auto-navigate — the widget does it, not the user
        if (actionType === "navigate" && payload) {
          setTimeout(() => {
            navigate(payload);
          }, 800);
        }

        // Auto-refresh — if scans were deleted, reload if on dashboard
        if (actionType === "scan_deleted" && currentPage === "dashboard") {
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: "⚠️ Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, currentPage, location.pathname, navigate, messages]);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Handle action button clicks
  const handleAction = (action: AgentMessage["action"]) => {
    if (!action) return;
    if (action.type === "navigate" && action.payload) {
      navigate(action.payload);
    }
  };

  // Render markdown-like bold text
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Handle feedback
  const handleFeedback = async (messageId: string, rating: "upvote" | "downvote") => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: rating } : msg
      )
    );
    try {
      await apiService.sendAgentFeedback(messageId, rating);
    } catch (e) {
      console.error("Failed to save feedback", e);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`agent-toggle ${isOpen ? "open" : ""} ${hasUnread ? "unread" : ""}`}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        id="agent-toggle"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="agent-toggle-icon">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <div className="agent-toggle-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="agent-toggle-icon">
              <path d="M12 2a4 4 0 0 1 4 4v2h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-1H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
              <circle cx="9" cy="13" r="1" fill="currentColor" />
              <circle cx="15" cy="13" r="1" fill="currentColor" />
            </svg>
            <span className="agent-toggle-text">Ask AI Buddy</span>
          </div>
        )}
        {hasUnread && <span className="agent-unread-dot" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="agent-panel" id="agent-panel" role="dialog" aria-label="AI Security Assistant">
          {/* Header */}
          <div className="agent-header">
            <div className="agent-header-left">
              <div className="agent-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a4 4 0 0 1 4 4v2h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-1H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
                  <circle cx="9" cy="13" r="1" fill="currentColor" />
                  <circle cx="15" cy="13" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="agent-title">IndAI Assistant</div>
                <div className="agent-status">
                  <span className="agent-status-dot" />
                  Online
                </div>
              </div>
            </div>
            <button
              className="agent-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="agent-messages" id="agent-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`agent-msg ${msg.role}`}>
                <div className="agent-msg-bubble">
                  {msg.text.split("\n").map((line, i) =>
                    line.trim() ? (
                      <p key={i}>{renderText(line)}</p>
                    ) : (
                      <br key={i} />
                    )
                  )}

                  {/* Action button */}
                  {msg.action?.label && (
                    <button
                      className="agent-action-btn"
                      onClick={() => handleAction(msg.action)}
                    >
                      {msg.action.label} →
                    </button>
                  )}
                  
                  {/* Feedback UI (Only for agent responses) */}
                  {msg.role === "agent" && msg.id && (
                    <div className="agent-feedback">
                      <button 
                        className={`feedback-btn ${msg.feedback === "upvote" ? "active" : ""}`}
                        onClick={() => handleFeedback(msg.id, "upvote")}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button 
                        className={`feedback-btn ${msg.feedback === "downvote" ? "active" : ""}`}
                        onClick={() => handleFeedback(msg.id, "downvote")}
                        title="Not helpful"
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggestion chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="agent-suggestions">
                    {msg.suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="agent-chip"
                        onClick={() => handleSend(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isProcessing && (
              <div className="agent-msg agent">
                <div className="agent-msg-bubble agent-typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="agent-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="agent-input"
              id="agent-input"
              disabled={isProcessing}
              autoComplete="off"
            />
            <button
              className="agent-send"
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
