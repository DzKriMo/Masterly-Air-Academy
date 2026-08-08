"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";
import { useMessageStream } from "@/lib/use-message-stream";
import type { StreamMessage } from "@/lib/use-message-stream";
import { Paperclip, Download, X } from "lucide-react";

export type MessagesRole =
  | "admin"
  | "finance"
  | "quality"
  | "instructor"
  | "student"
  | "director"
  | "scheduler"
  | "marketing";

interface MsgAttachment {
  name: string;
  size: number;
  content_type: string;
  url: string;
}

interface Msg {
  id: string;
  sender: string;
  sender_name: string;
  receiver: string;
  receiver_name: string;
  subject: string;
  body: string;
  reply_to: string | null;
  attachments: MsgAttachment[];
  attachment_count?: number;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

type Tab = "inbox" | "sent";

interface MessagesConfig {
  layout: "standard" | "instructor";
  titleKey: string;
  titleFallback: string;
  backHref: string;
  backLabelKey: string;
  backLabelFallback: string;
  loginPath: string;
  deleteEnabled: boolean;
  recipientsEndpoint: string;
  filterStudentRecipients: boolean;
  showUnreadBanner: boolean;
  ns: string;
  mainMaxWidth: string;
  headerMaxWidth?: string;
  loadingRows: number;
}

const STANDARD_STAFF_ROLES = [
  'admin', 'instructor', 'system_admin', 'flight_instructor', 'chief_flight_instructor',
  'ground_instructor', 'admin_responsible', 'admin_agent', 'quality_manager', 'finance_manager',
];

const roleConfigs: Record<MessagesRole, MessagesConfig> = {
  admin: {
    layout: "standard",
    titleKey: "admin.messages",
    titleFallback: "Messages",
    backHref: "/admin/dashboard",
    backLabelKey: "common.back",
    backLabelFallback: "Back",
    loginPath: "/login",
    deleteEnabled: true,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: false,
    showUnreadBanner: true,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
  finance: {
    layout: "standard",
    titleKey: "finance.messages",
    titleFallback: "Messages",
    backHref: "/finance/dashboard",
    backLabelKey: "finance.dashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/login",
    deleteEnabled: false,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: false,
    showUnreadBanner: true,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
  quality: {
    layout: "standard",
    titleKey: "quality.messages",
    titleFallback: "Messages",
    backHref: "/quality/dashboard",
    backLabelKey: "quality.dashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/login",
    deleteEnabled: false,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: false,
    showUnreadBanner: true,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
  student: {
    layout: "standard",
    titleKey: "student.messages",
    titleFallback: "Messages",
    backHref: "/student/dashboard",
    backLabelKey: "student.backToDashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/student/login",
    deleteEnabled: false,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: true,
    showUnreadBanner: false,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
  instructor: {
    layout: "instructor",
    titleKey: "instructor.messages",
    titleFallback: "Messages",
    backHref: "/instructor/dashboard",
    backLabelKey: "instructor.backToDashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/login",
    deleteEnabled: false,
    recipientsEndpoint: "/students/",
    filterStudentRecipients: false,
    showUnreadBanner: false,
    ns: "instructor",
    mainMaxWidth: "max-w-5xl",
    headerMaxWidth: undefined,
    loadingRows: 6,
  },
  director: {
    layout: "standard",
    titleKey: "director.messages",
    titleFallback: "Messages",
    backHref: "/director/dashboard",
    backLabelKey: "director.dashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/login",
    deleteEnabled: false,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: false,
    showUnreadBanner: true,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
  scheduler: {
    layout: "standard",
    titleKey: "scheduler.messages",
    titleFallback: "Messages",
    backHref: "/scheduler/dashboard",
    backLabelKey: "scheduler.dashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/login",
    deleteEnabled: false,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: false,
    showUnreadBanner: true,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
  marketing: {
    layout: "standard",
    titleKey: "marketing.messages",
    titleFallback: "Messages",
    backHref: "/marketing/dashboard",
    backLabelKey: "marketing.dashboard",
    backLabelFallback: "Back to Dashboard",
    loginPath: "/login",
    deleteEnabled: false,
    recipientsEndpoint: "/users/",
    filterStudentRecipients: false,
    showUnreadBanner: true,
    ns: "student",
    mainMaxWidth: "max-w-4xl",
    headerMaxWidth: "max-w-4xl",
    loadingRows: 5,
  },
};

interface MessagesPageProps {
  role: MessagesRole;
  backHref?: string;
  maxWidth?: string;
}

interface MsgQuery {
  results: Msg[];
  next: string | null;
  count?: number;
}

const PAGE_SIZE = 20;

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function MessagesPage({ role, backHref, maxWidth }: MessagesPageProps) {
  const config = roleConfigs[role];
  const isInstructor = config.layout === "instructor";
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [received, setReceived] = useState<Msg[]>([]);
  const [sent, setSent] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  const [receivedPage, setReceivedPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const [hasMoreRecv, setHasMoreRecv] = useState(false);
  const [hasMoreSent, setHasMoreSent] = useState(false);

  const [recipients, setRecipients] = useState<UserOption[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MsgAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ receiver: "", subject: "", body: "" });

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<MsgAttachment[]>([]);
  const [sendingReply, setSendingReply] = useState(false);

  const [viewMsg, setViewMsg] = useState<Msg | null>(null);
  const [thread, setThread] = useState<Msg[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const inboxRef = useRef<Msg[]>([]);
  inboxRef.current = received;

  useAuthGuard(isAuthenticated, isLoading, config.loginPath);

  const k = (key: string, fallback: string) => t(`${config.ns}.${key}`, fallback);

  const loadRecipients = useCallback(() => {
    if (!isAuthenticated) return;
    api.get(config.recipientsEndpoint)
      .then((d: any) => {
        const allUsers = d.results || [];
        if (config.filterStudentRecipients) {
          setRecipients(allUsers.filter((u: any) => STANDARD_STAFF_ROLES.includes(u.role)));
        } else {
          setRecipients(allUsers.filter((u: any) => u.id !== user?.id));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user?.id, config]);

  const fetchPage = useCallback(async (path: string): Promise<MsgQuery> => {
    const d: any = await api.get(path);
    if (Array.isArray(d)) return { results: d as Msg[], next: null };
    return { results: (d?.results || []) as Msg[], next: d?.next ?? null, count: d?.count };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [recvData, sentData, studentsData] = await Promise.all([
        fetchPage("/messages/?page=1"),
        fetchPage("/messages/sent/?page=1"),
        isInstructor ? api.get("/students/").catch(() => ({ results: [] })) : Promise.resolve(null),
      ]);
      setReceived(recvData.results || []);
      setSent(sentData.results || []);
      setHasMoreRecv(!!recvData.next);
      setHasMoreSent(!!sentData.next);
      setReceivedPage(1);
      setSentPage(1);
      if (studentsData) {
        setUsers((studentsData as any)?.results || (studentsData as any) || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError(isInstructor
        ? t("instructor.failedToLoadMessages", "Failed to load messages. Please try again.")
        : t('student.messagesLoadError', "Failed to load messages. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isInstructor, t, fetchPage]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Debounced server-side search — refetch page 1 with ?search=
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search.trim()) { setReceivedPage(1); setHasMoreRecv(false); setSentPage(1); setHasMoreSent(false); return; }
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      const base = activeTab === "inbox" ? "/messages/" : "/messages/sent/";
      api.get(`${base}?page=1&search=${encodeURIComponent(search.trim())}`)
        .then((d: any) => {
          const results = (d?.results || []) as Msg[];
          if (activeTab === "inbox") {
            setReceived(results); setHasMoreRecv(!!d?.next); setReceivedPage(1);
          } else {
            setSent(results); setHasMoreSent(!!d?.next); setSentPage(1);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, activeTab, isAuthenticated]);

  const loadMoreMessages = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const isInbox = activeTab === "inbox";
      const nextPage = isInbox ? receivedPage + 1 : sentPage + 1;
      const qs = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
      const path = isInbox ? `/messages/?page=${nextPage}${qs}` : `/messages/sent/?page=${nextPage}${qs}`;
      const d = await fetchPage(path);
      const results = d.results || [];
      if (isInbox) {
        setReceived(prev => [...prev, ...results]);
        setHasMoreRecv(!!d.next);
        setReceivedPage(nextPage);
      } else {
        setSent(prev => [...prev, ...results]);
        setHasMoreSent(!!d.next);
        setSentPage(nextPage);
      }
    } catch {
      setError(t('student.messagesLoadError', "Failed to load messages. Please try again."));
    } finally {
      setLoadingMore(false);
    }
  };

  const uploadFiles = async (files: FileList | null, mode: "compose" | "reply") => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: MsgAttachment[] = [];
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const d = await api.upload<any>("/messages/upload/", fd);
        const att = (d?.url ? d : JSON.parse(d?.data || "{}"));
        const url = att?.url;
        if (!url) continue;
        uploaded.push({ name: att.name || f.name, size: att.size || f.size, content_type: att.content_type || "application/octet-stream", url });
      }
      if (mode === "compose") setAttachments(prev => [...prev, ...uploaded]);
      else setReplyAttachments(prev => [...prev, ...uploaded]);
      if (uploaded.length > 0) showToast("success", t('common.uploaded', "Uploaded"));
    } catch {
      showToast("error", t('common.uploadFailed', "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (att: MsgAttachment) => {
    try {
      const res = await api.download(`/messages/download/?url=${encodeURIComponent(att.url)}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      showToast("error", t('common.downloadFailed', "Download failed"));
    }
  };

  const handleSend = async () => {
    if (!recipientId || !subject.trim() || !body.trim()) {
      showToast("error", k('fillRequired', 'Please fill all required fields.'));
      return;
    }
    setSending(true);
    try {
      await api.post("/messages/", { receiver: recipientId, subject: subject.trim(), body: body.trim(), attachments });
      showToast("success", k('messageSent', 'Message sent successfully.'));
      setComposeOpen(false);
      setRecipientId(""); setSubject(""); setBody(""); setAttachments([]);
      loadMessages();
    } catch {
      showToast("error", k('sendFailed', 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const handleSendInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiver || !form.subject.trim() || !form.body.trim()) {
      showToast("error", t('instructor.fillRequired', 'Please fill all required fields.'));
      return;
    }
    setSending(true);
    try {
      await api.post("/messages/", {
        receiver: form.receiver,
        subject: form.subject.trim(),
        body: form.body.trim(),
        attachments,
      });
      showToast("success", t('instructor.messageSent', 'Message sent successfully.'));
      setComposeOpen(false);
      setForm({ receiver: "", subject: "", body: "" });
      setAttachments([]);
      loadMessages();
    } catch (err: any) {
      showToast("error", err?.message || t('instructor.sendFailed', 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) {
      showToast("error", isInstructor
        ? t("instructor.enterMessage", "Please enter a message.")
        : t('student.fillRequired', 'Please enter a message.'));
      return;
    }
    if (!replyTo) return;
    setSendingReply(true);
    try {
      await api.post("/messages/", {
        receiver: replyTo.sender,
        subject: `Re: ${replyTo.subject}`,
        body: replyBody.trim(),
        reply_to: replyTo.id,
        attachments: replyAttachments,
      });
      showToast("success", isInstructor
        ? t("instructor.replySent", "Reply sent successfully")
        : t('student.replySent', 'Reply sent successfully.'));
      setReplyOpen(false);
      setReplyBody("");
      setReplyAttachments([]);
      setReplyTo(null);
      loadMessages();
    } catch (err: any) {
      if (isInstructor) {
        showToast("error", err.message || t("instructor.connectionError", "Connection error"));
      } else {
        showToast("error", t('student.sendFailed', 'Failed to send reply.'));
      }
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!viewMsg) return;
    setDeleting(true);
    try {
      await api.delete(`/messages/${viewMsg.id}/`);
      showToast("success", t('student.messageDeleted', 'Message deleted.'));
      setReceived(prev => prev.filter(m => m.id !== viewMsg.id));
      setSent(prev => prev.filter(m => m.id !== viewMsg.id));
      setViewMsg(null);
      setThread(null);
    } catch {
      showToast("error", t('student.deleteFailed', 'Failed to delete message.'));
    } finally {
      setDeleting(false);
    }
  };

  const openCompose = () => {
    loadRecipients();
    setComposeOpen(true);
  };

  const openReply = (msg: Msg) => {
    if (isInstructor) {
      setReplyTo(msg);
      setReplyBody("");
      setReplyOpen(true);
    } else {
      loadRecipients();
      setReplyTo(msg);
      setRecipientId(msg.sender);
      setReplyOpen(true);
    }
  };

  const openView = (msg: Msg) => {
    setViewMsg(msg);
    setThread(null);
    if (activeTab === 'inbox' && !msg.is_read) {
      api.post(`/messages/${msg.id}/mark_read/`).catch(() => {});
      setReceived(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    // Load full conversation thread
    setThreadLoading(true);
    api.get<Msg[]>(`/messages/${msg.id}/thread/`)
      .then((d: any) => {
        const list = Array.isArray(d) ? d : (d?.results || []);
        setThread(list);
        // Mark any unread thread members as read
        const unreadIds = list.filter((m: any) => !m.is_read && (m.receiver === user?.id)).map((m: any) => m.id);
        if (unreadIds.length) {
          unreadIds.forEach((id: string) => api.post(`/messages/${id}/mark_read/`).catch(() => {}));
          setReceived(prev => prev.map(m => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)));
        }
      })
      .catch(() => {})
      .finally(() => setThreadLoading(false));
  };

  // Real-time stream: prepend new incoming messages, refresh badges
  useMessageStream((m: StreamMessage) => {
    const already = inboxRef.current.some(x => x.id === m.id);
    if (already) return;
    setReceived(prev => [m as unknown as Msg, ...prev]);
    showToast("info", t('common.newMessage', "New message"));
  }, { enabled: isAuthenticated });

  const [users, setUsers] = useState<any[]>([]);

  const filterOptions: FilterOption[] = [
    { key: "is_read", label: k('allMessages', 'All Messages'), options: [
      { value: "unread", label: k('unread', 'Unread') },
      { value: "read", label: k('read', 'Read') },
    ]},
  ];

  const currentMessages = activeTab === "inbox" ? received : sent;
  const filteredMessages = useMemo(() => {
    let list = currentMessages;
    if (activeTab === "inbox" && filters.is_read === "unread") list = list.filter(m => !m.is_read);
    if (activeTab === "inbox" && filters.is_read === "read") list = list.filter(m => m.is_read);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.subject || "").toLowerCase().includes(q) ||
        (m.body || "").toLowerCase().includes(q) ||
        (activeTab === "inbox" ? (m.sender_name || "") : (m.receiver_name || "")).toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentMessages, filters, search, activeTab]);

  const unreadCount = received.filter(m => !m.is_read).length;

  const attachmentChips = (list: MsgAttachment[], onRemove?: (i: number) => void) => (
    list.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-2">
        {list.map((att, i) => (
          <span key={`${att.url}-${i}`} className="inline-flex items-center gap-1.5 bg-navy-900 border border-navy-600 rounded-lg px-2.5 py-1 text-xs text-gray-300">
            <Paperclip className="w-3.5 h-3.5 text-gold-500" />
            <button type="button" onClick={() => handleDownload(att)} className="hover:text-white underline decoration-dotted">
              {att.name} ({formatBytes(att.size)})
            </button>
            {onRemove && (
              <button type="button" onClick={() => onRemove(i)} aria-label="Remove attachment"
                className="text-gray-500 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>
    )
  );

  const inboxColumns: Column<Msg>[] = [
    { key: "sender_name", header: k('from', 'From'), render: (item) => (
      <span className={`text-sm ${!item.is_read ? "text-white font-medium" : "text-gray-400"}`}>{item.sender_name}</span>
    )},
    { key: "subject", header: k('subject', 'Subject'), render: (item) => (
      <span className={`text-sm ${!item.is_read ? "text-white font-medium" : "text-gray-300"}`}>{item.subject}</span>
    )},
    { key: "body", header: k('messageLabel', 'Message'), render: (item) => (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {item.attachment_count ? <Paperclip className="w-3 h-3 text-gray-500" /> : null}
        {item.body.length > 60 ? `${item.body.slice(0, 60)}...` : item.body}
      </span>
    )},
    { key: "created_at", header: t('common.date'), render: (item) => (
      <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (item) => (
      <div className="flex items-center gap-2">
        {!item.is_read && <span className="inline-block w-2 h-2 bg-gold-500 rounded-full" />}
        <button onClick={(e) => { e.stopPropagation(); openReply(item); }} className="px-2 py-1 text-xs text-gold-500 border border-gold-500/30 rounded hover:bg-gold-500/10 transition-colors">
          {k('reply', 'Reply')}
        </button>
      </div>
    )},
  ];

  const sentColumns: Column<Msg>[] = [
    { key: "receiver_name", header: k('to', 'To'), render: (item) => (
      <span className="text-sm text-white font-medium">{item.receiver_name}</span>
    )},
    { key: "subject", header: k('subject', 'Subject'), render: (item) => (
      <span className="text-sm text-gray-300">{item.subject}</span>
    )},
    { key: "body", header: k('messageLabel', 'Message'), render: (item) => (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {item.attachment_count ? <Paperclip className="w-3 h-3 text-gray-500" /> : null}
        {item.body.length > 60 ? `${item.body.slice(0, 60)}...` : item.body}
      </span>
    )},
    { key: "created_at", header: t('common.date'), render: (item) => (
      <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
    )},
    { key: "is_read", header: t('common.status'), render: (item) => (
      <span className={`text-xs px-2 py-0.5 rounded ${item.is_read ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
        {item.is_read ? t('common.read', 'Read') : t('common.sent', 'Sent')}
      </span>
    )},
  ];

  const renderThread = () => (
    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
      {threadLoading && !thread ? (
        <p className="text-sm text-gray-500 text-center py-4">{t('common.loading', 'Loading...')}</p>
      ) : (thread && thread.length > 0 ? (
        thread.map((m) => {
          const isMine = m.sender === user?.id;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 border ${isMine ? "bg-gold-500/10 border-gold-500/20" : "bg-navy-900 border-navy-700"}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={`text-xs font-medium ${isMine ? "text-gold-400" : "text-gray-300"}`}>
                    {isMine ? t('common.you', 'You') : m.sender_name}
                  </span>
                  <span className="text-[10px] text-gray-500">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{m.body}</p>
                {attachmentChips(m.attachments || [])}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">{t('common.noThread', 'No messages in this conversation.')}</p>
      ))}
    </div>
  );

  const mainWidth = maxWidth ?? config.mainMaxWidth;
  const headerWidth = maxWidth ?? config.headerMaxWidth;
  const headerTitle = t(config.titleKey, config.titleFallback);
  const headerBackHref = backHref ?? config.backHref;
  const headerBackLabel = t(config.backLabelKey, config.backLabelFallback);

  return (
    <div className="min-h-screen bg-navy-900">
      {isInstructor ? (
        <PageHeader
          title={headerTitle}
          backHref={headerBackHref}
          backLabel={headerBackLabel}
          actions={
            <div className="flex gap-2">
              <button onClick={() => setActiveTab("inbox")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${activeTab === "inbox" ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-gray-400 border border-navy-700"}`}>{t("inbox.inbox", "Inbox")}</button>
              <button onClick={() => setActiveTab("sent")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${activeTab === "sent" ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-gray-400 border border-navy-700"}`}>{t("inbox.sent", "Sent")}</button>
              <button onClick={() => setComposeOpen(true)} className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gold-500 text-navy-900">{t("inbox.compose", "Compose")}</button>
            </div>
          }
        />
      ) : (
        <PageHeader
          title={headerTitle}
          backHref={headerBackHref}
          backLabel={headerBackLabel}
          maxWidth={headerWidth}
          actions={
            <button onClick={openCompose} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold hover:bg-gold-400 transition-colors">
              {k('compose', 'Compose')}
            </button>
          }
        />
      )}

      {isInstructor ? (
        <main className={`${mainWidth} mx-auto px-6 py-8`}>
          {error && <ErrorCard message={error} onRetry={loadMessages} />}

          <FilterBar
            filters={activeTab === "inbox" ? [
              { key: "is_read", label: t("common.allMessages", "All Messages"), options: [
                { value: "unread", label: t("common.unreadOnly", "Unread Only") },
              ]},
            ] : []}
            values={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClear={() => { setFilters({}); setSearch(""); }}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("instructor.searchMessages", "Search messages...")}
          />

          <ModalForm
            open={composeOpen}
            onClose={() => { setComposeOpen(false); setAttachments([]); setForm({ receiver: "", subject: "", body: "" }); }}
            title={t("instructor.composeMessage", "Compose Message")}
            footer={
              <button
                type="submit"
                form="compose-form"
                className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm"
              >
                {t("instructor.sendMessage", "Send Message")}
              </button>
            }
          >
            <form id="compose-form" onSubmit={handleSendInstructor}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("common.to", "To")}</label>
                  <select value={form.receiver} onChange={e => setForm({ ...form, receiver: e.target.value })} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                    <option value="">{t("instructor.selectStudent", "Select student...")}</option>
                    {users.map((u: any) => <option key={u.id} value={u.user_id || u.id}>{u.full_name} ({u.student_number})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("common.subject", "Subject")}</label>
                  <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("common.message", "Message")}</label>
                  <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required rows={4} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("common.attachments", "Attachments")}</label>
                  <input type="file" multiple onChange={e => uploadFiles(e.target.files, "compose")} className="w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-navy-700 file:text-gold-500 file:text-sm file:cursor-pointer" />
                  {attachmentChips(attachments, (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i)))}
                  {uploading && <p className="text-xs text-gray-500 mt-1">{t('common.uploading', 'Uploading...')}</p>}
                </div>
              </div>
            </form>
          </ModalForm>

          <ModalForm
            open={!!viewMsg}
            onClose={() => { setViewMsg(null); setThread(null); }}
            title={viewMsg?.subject || ''}
            wide
            footer={viewMsg && activeTab === 'inbox' ? (
              <button
                onClick={() => { setViewMsg(null); openReply(viewMsg); }}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors"
              >
                {t('instructor.reply', 'Reply')}
              </button>
            ) : undefined}
          >
            {viewMsg && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-500">{activeTab === 'inbox' ? t('inbox.from', 'From') : t('inbox.to', 'To')}: </span>
                    <span className="text-white font-medium">{activeTab === 'inbox' ? viewMsg.sender_name : viewMsg.receiver_name}</span>
                  </div>
                  <span className="text-xs text-gray-600">{new Date(viewMsg.created_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1">{t('common.thread', 'Conversation')}:</div>
                {renderThread()}
              </div>
            )}
          </ModalForm>

          <ModalForm
            open={replyOpen}
            onClose={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); setReplyAttachments([]); }}
            title={replyTo ? `${t('instructor.replyTo', 'Reply to')} ${replyTo.sender_name}` : t('instructor.reply', 'Reply')}
            footer={
              <>
                <button onClick={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); setReplyAttachments([]); }} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
                  {t('common.cancel', 'Cancel')}
                </button>
                <button onClick={handleReply} disabled={sendingReply} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
                  {sendingReply ? t('common.sending', 'Sending...') : t('common.send', 'Send')}
                </button>
              </>
            }>
            <div className="space-y-4">
              {replyTo && (
                <div className="bg-navy-900/50 border border-navy-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('instructor.originalMessage', 'Original message')}:</p>
                  <p className="text-sm text-gray-300 font-medium">{replyTo.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">{replyTo.body.slice(0, 200)}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('common.message', 'Message')} *</label>
                <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={4}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.attachments", "Attachments")}</label>
                <input type="file" multiple onChange={e => uploadFiles(e.target.files, "reply")} className="w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-navy-700 file:text-gold-500 file:text-sm file:cursor-pointer" />
                {attachmentChips(replyAttachments, (i) => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i)))}
                {uploading && <p className="text-xs text-gray-500 mt-1">{t('common.uploading', 'Uploading...')}</p>}
              </div>
            </div>
          </ModalForm>

          {loading ? (
            <LoadingSkeleton type="table" rows={config.loadingRows} />
          ) : filteredMessages.length === 0 ? (
            <EmptyState
              message={activeTab === "inbox" ? t("instructor.noMessagesReceived", "No messages received.") : t("instructor.noMessagesSent", "No messages sent.")}
              title={currentMessages.length === 0 ? undefined : t("instructor.noMatchingMessages", "No matching messages")}
              action={currentMessages.length === 0 && activeTab === "inbox" ? { label: t("inbox.compose", "Compose Message"), onClick: () => setComposeOpen(true) } : undefined}
            />
          ) : (
            <DataTable columns={activeTab === "inbox" ? inboxColumns : sentColumns} data={filteredMessages} keyField="id" onRowClick={(msg) => openView(msg as Msg)} />
          )}
          {(activeTab === "inbox" ? hasMoreRecv : hasMoreSent) && (
            <div className="mt-4 text-center">
              <button onClick={loadMoreMessages} disabled={loadingMore} className="px-4 py-2 text-sm text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-colors disabled:opacity-50">
                {loadingMore ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load more')}
              </button>
            </div>
          )}
        </main>
      ) : (
        <main className={`${mainWidth} mx-auto px-6 py-8`}>
          {error && <ErrorCard message={error} onRetry={loadMessages} />}

          {config.showUnreadBanner && unreadCount > 0 && !loading && (
            <div className="mb-4 flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 rounded-lg px-4 py-2.5 w-fit">
              <span className="inline-block w-2 h-2 bg-gold-500 rounded-full" />
              <span className="text-sm text-gold-400 font-medium">
                {unreadCount} {unreadCount === 1 ? k('unreadMsg', 'unread message') : k('unreadMsgs', 'unread messages')}
              </span>
            </div>
          )}

          {loading ? <LoadingSkeleton type="table" rows={config.loadingRows} /> : (
            <>
              <div className="flex gap-1 mb-4 bg-navy-800 rounded-lg p-1 border border-navy-700 w-fit">
                <button onClick={() => setActiveTab("inbox")}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === "inbox" ? "bg-gold-500 text-navy-900 font-semibold" : "text-gray-400 hover:text-white"}`}>
                  {k('inbox', 'Inbox')} ({received.length})
                </button>
                <button onClick={() => setActiveTab("sent")}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === "sent" ? "bg-gold-500 text-navy-900 font-semibold" : "text-gray-400 hover:text-white"}`}>
                  {k('sent', 'Sent')} ({sent.length})
                </button>
              </div>

              {currentMessages.length === 0 ? (
                <EmptyState message={activeTab === "inbox"
                  ? k('noMessages', 'No messages yet.')
                  : k('noSent', 'No sent messages yet.')}
                />
              ) : (
                <>
                  <FilterBar
                    filters={activeTab === "inbox" ? filterOptions : []}
                    values={filters}
                    onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                    onClear={() => { setFilters({}); setSearch(""); }}
                    searchPlaceholder={activeTab === "inbox"
                      ? k('searchMessages', 'Search messages...')
                      : k('searchSent', 'Search sent messages...')}
                    searchValue={search}
                    onSearchChange={setSearch}
                  />
                  <DataTable
                    columns={activeTab === "inbox" ? inboxColumns : sentColumns}
                    data={filteredMessages}
                    keyField="id"
                    onRowClick={(msg) => openView(msg as Msg)}
                    emptyMessage={k('noMessagesFilter', 'No messages match your filters.')}
                  />
                  {(activeTab === "inbox" ? hasMoreRecv : hasMoreSent) && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={loadMoreMessages}
                        disabled={loadingMore}
                        className="px-5 py-2 text-sm bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load more')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      )}

      {!isInstructor && (
        <ModalForm open={composeOpen} onClose={() => { setComposeOpen(false); setRecipientId(""); setSubject(""); setBody(""); setAttachments([]); }} title={k('composeMessage', 'Compose Message')}
          footer={
            <>
              <button onClick={() => { setComposeOpen(false); setRecipientId(""); setSubject(""); setBody(""); setAttachments([]); }} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
                {t('common.cancel', 'Cancel')}
              </button>
              <button onClick={handleSend} disabled={sending || uploading} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
                {sending ? t('common.sending', 'Sending...') : t('common.send', 'Send')}
              </button>
            </>
          }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{k('recipient', 'Recipient')} *</label>
              <select value={recipientId} onChange={e => setRecipientId(e.target.value)}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500">
                <option value="">{k('selectRecipient', 'Select a recipient...')}</option>
                {recipients.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{k('subject', 'Subject')} *</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{k('messageLabel', 'Message')} *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("common.attachments", "Attachments")}</label>
              <input type="file" multiple onChange={e => uploadFiles(e.target.files, "compose")} className="w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-navy-700 file:text-gold-500 file:text-sm file:cursor-pointer" />
              {attachmentChips(attachments, (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i)))}
              {uploading && <p className="text-xs text-gray-500 mt-1">{t('common.uploading', 'Uploading...')}</p>}
            </div>
          </div>
        </ModalForm>
      )}

      {!isInstructor && (
        <ModalForm open={replyOpen} onClose={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); setReplyAttachments([]); }}
          title={replyTo ? `${t('student.replyTo', 'Reply to')} ${replyTo.sender_name}` : t('student.reply', 'Reply')}
          footer={
            <>
              <button onClick={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); setReplyAttachments([]); }} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
                {t('common.cancel', 'Cancel')}
              </button>
              <button onClick={handleReply} disabled={sendingReply || uploading} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
                {sendingReply ? t('common.sending', 'Sending...') : t('common.send', 'Send')}
              </button>
            </>
          }>
          <div className="space-y-4">
            {replyTo && (
              <div className="bg-navy-900/50 border border-navy-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{t('student.originalMessage', 'Original message')}:</p>
                <p className="text-sm text-gray-300 font-medium">{replyTo.subject}</p>
                <p className="text-xs text-gray-500 mt-1">{replyTo.body.slice(0, 200)}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('student.messageLabel', 'Message')} *</label>
              <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={4}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("common.attachments", "Attachments")}</label>
              <input type="file" multiple onChange={e => uploadFiles(e.target.files, "reply")} className="w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-navy-700 file:text-gold-500 file:text-sm file:cursor-pointer" />
              {attachmentChips(replyAttachments, (i) => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i)))}
              {uploading && <p className="text-xs text-gray-500 mt-1">{t('common.uploading', 'Uploading...')}</p>}
            </div>
          </div>
        </ModalForm>
      )}

      {!isInstructor && (
        <ModalForm
          open={!!viewMsg}
          onClose={() => { setViewMsg(null); setThread(null); }}
          title={viewMsg?.subject || ''}
          wide
          footer={
            config.deleteEnabled && viewMsg && activeTab === 'inbox' ? (
              <div className="flex gap-2 w-full justify-end">
                <button onClick={() => { setViewMsg(null); setReplyTo(viewMsg); setRecipientId(viewMsg.sender); setReplyOpen(true); }} className="px-4 py-2 text-sm text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-colors">
                  {t('student.reply', 'Reply')}
                </button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  {deleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                </button>
                <button onClick={() => setViewMsg(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
                  {t('common.close', 'Close')}
                </button>
              </div>
            ) : undefined
          }
        >
          {viewMsg && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-500">{activeTab === 'inbox' ? t('student.from', 'From') : t('student.to', 'To')}: </span>
                  <span className="text-white font-medium">{activeTab === 'inbox' ? viewMsg.sender_name : viewMsg.receiver_name}</span>
                </div>
                <span className="text-xs text-gray-600">{new Date(viewMsg.created_at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-500 mb-1">{t('common.thread', 'Conversation')}:</div>
              {renderThread()}
            </div>
          )}
        </ModalForm>
      )}
    </div>
  );
}