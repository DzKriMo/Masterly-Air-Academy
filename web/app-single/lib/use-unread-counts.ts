import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface UnreadCounts {
  notifications: number;
  messages: number;
  applicationsPending: number;
}

export function useUnreadCounts(options?: {
  includeMessages?: boolean;
  includeApplications?: boolean;
  enabled?: boolean;
}): UnreadCounts {
  const { includeMessages = false, includeApplications = false, enabled = true } = options || {};
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);
  const [applicationsPending, setApplicationsPending] = useState(0);

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
      if (includeApplications) {
        api.get("/applications/?status=pending")
          .then((d: any) => setApplicationsPending(d.count ?? 0))
          .catch(() => {});
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    const onChanged = () => fetchUnread();
    window.addEventListener("maa:notifications-changed", onChanged);
    const onMsgChanged = () => fetchUnread();
    window.addEventListener("maa:messages-changed", onMsgChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener("maa:notifications-changed", onChanged);
      window.removeEventListener("maa:messages-changed", onMsgChanged);
    };
  }, [includeMessages, enabled]);

  return { notifications, messages, applicationsPending };
}
