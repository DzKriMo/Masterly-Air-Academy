import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

export interface StreamMessage {
  id: string;
  sender: string;
  sender_name: string;
  receiver: string;
  receiver_name: string;
  subject: string;
  body: string;
  reply_to: string | null;
  attachments: { name: string; size: number; content_type: string; url: string }[];
  is_read: boolean;
  created_at: string;
}

/**
 * Subscribe to the real-time message stream via fetch + ReadableStream
 * (EventSource cannot send the JWT Authorization header). Reconnects
 * automatically. Calls `onMessage` for each newly received message. Since the
 * stream returns both backfilled (already-shown) and live messages, the caller
 * should dedupe by id.
 */
export function useMessageStream(
  onMessage: (m: StreamMessage) => void,
  options?: { enabled?: boolean; since?: string | null }
) {
  const enabled = options?.enabled ?? true;
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;
  const sinceRef = useRef<string | null>(options?.since ?? null);
  sinceRef.current = options?.since ?? sinceRef.current;

  useEffect(() => {
    const authenticated = api.isAuthenticated();
    if (!enabled || !authenticated) return;
    let controller: AbortController | null = null;
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;

    const connect = async () => {
      if (stopped || !api.isAuthenticated()) return;
      controller = new AbortController();
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      try {
        const headers: Record<string, string> = { Accept: "text/event-stream" };
        const token = api.getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`/api/messages/stream/${qs}`, {
          headers,
          signal: controller.signal,
          credentials: "include",
        });
        if (stopped || !res.ok || !res.body) {
          throw new Error("stream failed");
        }
        retryDelay = 1000;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            for (const line of part.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  const payload = JSON.parse(line.slice(6)) as StreamMessage;
                  if (payload?.id) {
                    if (
                      !sinceRef.current ||
                      new Date(payload.created_at) > new Date(sinceRef.current)
                    ) {
                      sinceRef.current = payload.created_at;
                      handlerRef.current(payload);
                      try {
                        window.dispatchEvent(new CustomEvent("maa:messages-changed"));
                      } catch {}
                    }
                  }
                } catch {}
              }
            }
          }
        }
      } catch {
        // dropped/aborted — reconnect with exponential backoff
      } finally {
        if (!stopped) {
          const jitter = Math.random() * 1000;
          retryTimer = setTimeout(connect, retryDelay + jitter);
          retryDelay = Math.min(retryDelay * 2, 30000);
        }
      }
    };

    connect();

    return () => {
      stopped = true;
      controller?.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled]);
}