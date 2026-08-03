import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

export interface StreamNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  created_at: string;
}

/**
 * Subscribe to the real-time notification stream via fetch + ReadableStream
 * (EventSource cannot send the JWT Authorization header). Reconnects
 * automatically. Calls `onNotification` for each newly received event and
 * `onReconnect` after a successful reconnect.
 */
export function useNotificationStream(
  onNotification: (n: StreamNotification) => void,
  options?: { enabled?: boolean; since?: string | null }
) {
  const enabled = options?.enabled ?? true;
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;
  const sinceRef = useRef(options?.since ?? null);
  sinceRef.current = options?.since ?? sinceRef.current;

  useEffect(() => {
    if (!enabled || !api.isAuthenticated()) return;
    let controller: AbortController | null = null;
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (stopped) return;
      controller = new AbortController();
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      try {
        const headers: Record<string, string> = { Accept: "text/event-stream" };
        const token = api.getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`/api/notifications/stream/${qs}`, {
          headers,
          signal: controller.signal,
          credentials: "include",
        });
        if (stopped || !res.ok || !res.body) {
          throw new Error("stream failed");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // Track the newest created_at received so reconnect backfills only newer items.
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
                  const payload = JSON.parse(line.slice(6)) as StreamNotification;
                  if (payload?.id) {
                    if (!sinceRef.current || new Date(payload.created_at) > new Date(sinceRef.current)) {
                      sinceRef.current = payload.created_at;
                      handlerRef.current(payload);
                    }
                  }
                } catch {}
              }
            }
          }
        }
      } catch {
        // connection dropped or aborted — reconnect after backoff
      } finally {
        if (!stopped) {
          retryTimer = setTimeout(connect, 3000);
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
