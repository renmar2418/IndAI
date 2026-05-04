/**
 * IndAI — AI Summary Cache
 * Stores AI summaries in localStorage to eliminate redundant API calls.
 * Used by both ScanPage (write) and ScanDetailPage (read).
 */

import type { AiSummary } from "../types";

const CACHE_KEY = "indai_ai_summaries";

interface SummaryCache {
  [scanId: string]: AiSummary;
}

function readCache(): SummaryCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: SummaryCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full — silently fail
  }
}

/**
 * Save an AI summary to the local cache.
 */
export function saveSummary(scanId: number, summary: AiSummary): void {
  const cache = readCache();
  cache[String(scanId)] = summary;
  writeCache(cache);
}

/**
 * Retrieve a cached AI summary. Returns null if not found.
 */
export function getSummary(scanId: number): AiSummary | null {
  const cache = readCache();
  return cache[String(scanId)] || null;
}

/**
 * Remove a single cached summary (e.g. when a scan is deleted).
 */
export function removeSummary(scanId: number): void {
  const cache = readCache();
  delete cache[String(scanId)];
  writeCache(cache);
}

/**
 * Clear the entire summary cache.
 */
export function clearSummaryCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // no-op
  }
}
