/**
 * IndAI — useAutoRefresh Hook
 * Automatically refreshes data at intervals and when the user returns to the tab.
 * 
 * Features:
 * - Polls at a configurable interval (default: 30s)
 * - Pauses when tab is hidden (saves API calls)
 * - Instantly refreshes when user switches back to the tab
 * - Cleans up all timers on unmount
 */

import { useEffect, useRef, useCallback } from "react";

interface AutoRefreshOptions {
  /** Polling interval in milliseconds (default: 30000 = 30s) */
  interval?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Whether to refresh when the tab becomes visible again (default: true) */
  refreshOnFocus?: boolean;
}

export function useAutoRefresh(
  fetchFn: () => void | Promise<void>,
  options: AutoRefreshOptions = {}
) {
  const {
    interval = 2000,
    enabled = true,
    refreshOnFocus = true,
  } = options;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef(fetchFn);

  // Keep fetchRef current so the interval always calls the latest version
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchRef.current();
    }, interval);
  }, [interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Start the interval timer
    startPolling();

    // Handle tab visibility changes
    function handleVisibilityChange() {
      if (document.hidden) {
        // Tab is hidden — stop wasting API calls
        stopPolling();
      } else {
        // Tab is visible again — refresh immediately + restart polling
        if (refreshOnFocus) {
          fetchRef.current();
        }
        startPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, startPolling, stopPolling, refreshOnFocus]);
}
