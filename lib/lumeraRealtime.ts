"use client";

export type LumeraDataScope = "transactions" | "bills" | "overview" | "all";

const STORAGE_KEY = "lumera:data-change";
const CHANNEL_NAME = "lumera-platform-sync";

export function notifyLumeraDataChange(scope: LumeraDataScope = "all") {
  if (typeof window === "undefined") return;

  const detail = { scope, at: Date.now(), nonce: crypto.randomUUID() };
  window.dispatchEvent(new CustomEvent("lumera:data-changed", { detail }));

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // Storage may be blocked in strict privacy modes.
  }

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(detail);
    channel.close();
  } catch {
    // BroadcastChannel is optional; Supabase Realtime remains active.
  }
}

export const lumeraRealtimeKeys = {
  storage: STORAGE_KEY,
  channel: CHANNEL_NAME,
} as const;
