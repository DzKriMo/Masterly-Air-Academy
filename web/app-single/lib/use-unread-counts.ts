import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface UnreadCounts {
  notifications: number;
  messages: number;
}

export function useUnreadCounts(options?: {
  includeMessages?: boolean;
  enabled?: boolean;
}): UnreadCounts {
  const { includeMessages = false, enabled = true } = options || {};
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchUnread = () => {
      api.get("/notifications/unread-count/")
        .then((d: any) => setNotifications(d.count ?? 0))
        .catch(() => {});
      if (includeMessages) {
        api.get("/messages/unread-count/")
          .then((d: any) => setMessages(d.count ?? 0))
          .catch(() => {});
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [includeMessages, enabled]);

  return { notifications, messages };
}
