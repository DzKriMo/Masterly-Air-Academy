"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Msg {
  id: string;
  sender_name: string;
  sender: string;
  sender_name: string;
  receiver: string;
  receiver_name: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

type Tab = "inbox" | "sent";

export default function StudentMessagesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [received, setReceived] = useState<Msg[]>([]);
  const [sent, setSent] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  // Compose modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipients, setRecipients] = useState<UserOption[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Reply modal
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  // Load recipients (admin and instructor roles - filter client-side)
  const loadRecipients = useCallback(() => {
    if (!isAuthenticated) return;
    api.get("/users/")
      .then((d: any) => {
        const allUsers = d.results || [];
        const allowedRoles = ['admin', 'instructor', 'system_admin', 'flight_instructor', 'chief_flight_instructor', 'ground_instructor', 'admin_responsible', 'admin_agent', 'quality_manager', 'finance_manager'];
        setRecipients(allUsers.filter((u: any) => allowedRoles.includes(u.role)));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const loadMessages = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get("/messages/").catch(() => ({ results: [] })),
      api.get("/messages/sent/").catch(() => ({ results: [] })),
    ]).then(([recvData, sentData]: any) => {
      setReceived(recvData.results || []);
      setSent(sentData.results || []);
      setError(null);
    }).catch(err => {
      console.error("Failed to load messages:", err);
      setError(t('student.messagesLoadError', "Failed to load messages. Please try again."));
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async () => {
    if (!recipientId || !subject.trim() || !body.trim()) {
      showToast("error", t('student.fillRequired', 'Please fill all required fields.'));
      return;
    }
    setSending(true);
    try {
      await api.post("/messages/", { receiver: recipientId, subject: subject.trim(), body: body.trim() });
      showToast("success", t('student.messageSent', 'Message sent successfully.'));
      setComposeOpen(false);
      setRecipientId("");
      setSubject("");
      setBody("");
      loadMessages();
    } catch {
      showToast("error", t('student.sendFailed', 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) {
      showToast("error", t('student.fillRequired', 'Please enter a message.'));
      return;
    }
    setSendingReply(true);
    try {
      await api.post("/messages/", { receiver: replyTo!.sender, subject: `Re: ${replyTo!.subject}`, body: replyBody.trim() });
      showToast("success", t('student.replySent', 'Reply sent successfully.'));
      setReplyOpen(false);
      setReplyBody("");
      setReplyTo(null);
      loadMessages();
    } catch {
      showToast("error", t('student.sendFailed', 'Failed to send reply.'));
    } finally {
      setSendingReply(false);
    }
  };

  const openCompose = () => {
    loadRecipients();
    setComposeOpen(true);
  };

  const openReply = (msg: Msg) => {
    loadRecipients();
    setReplyTo(msg);
    setRecipientId(msg.sender);
    setReplyOpen(true);
  };

  const filterOptions: FilterOption[] = [
    { key: "is_read", label: t('student.allMessages', 'All Messages'), options: [
      { value: "unread", label: t('student.unread', 'Unread') },
      { value: "read", label: t('student.read', 'Read') },
    ]},
  ];

  const currentMessages = activeTab === "inbox" ? received : sent;
  const filteredMessages = currentMessages.filter(m => {
    if (filters.is_read === "unread" && m.is_read) return false;
    if (filters.is_read === "read" && !m.is_read) return false;
    if (activeTab === "inbox") {
      if (search && !m.subject.toLowerCase().includes(search.toLowerCase()) && !m.sender_name.toLowerCase().includes(search.toLowerCase()) && !m.body.toLowerCase().includes(search.toLowerCase())) return false;
    } else {
      if (search && !m.subject.toLowerCase().includes(search.toLowerCase()) && !m.receiver_name.toLowerCase().includes(search.toLowerCase()) && !m.body.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const inboxColumns: Column<Msg>[] = [
    { key: "sender_name", header: t('student.from', 'From'), render: (item) => (
      <span className={`text-sm ${!item.is_read ? "text-white font-medium" : "text-gray-400"}`}>{item.sender_name}</span>
    )},
    { key: "subject", header: t('student.subject', 'Subject'), render: (item) => (
      <span className={`text-sm ${!item.is_read ? "text-white font-medium" : "text-gray-300"}`}>{item.subject}</span>
    )},
    { key: "body", header: t('student.messageLabel', 'Message'), render: (item) => (
      <span className="text-xs text-gray-500">{item.body.length > 80 ? `${item.body.slice(0, 80)}...` : item.body}</span>
    )},
    { key: "created_at", header: t('common.date'), render: (item) => (
      <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (item) => (
      <div className="flex items-center gap-2">
        {!item.is_read && <span className="inline-block w-2 h-2 bg-gold-500 rounded-full" />}
        <button onClick={(e) => { e.stopPropagation(); openReply(item); }} className="px-2 py-1 text-xs text-gold-500 border border-gold-500/30 rounded hover:bg-gold-500/10 transition-colors">
          {t('student.reply', 'Reply')}
        </button>
      </div>
    )},
  ];

  const sentColumns: Column<Msg>[] = [
    { key: "receiver_name", header: t('student.to', 'To'), render: (item) => (
      <span className="text-sm text-white font-medium">{item.receiver_name}</span>
    )},
    { key: "subject", header: t('student.subject', 'Subject'), render: (item) => (
      <span className="text-sm text-gray-300">{item.subject}</span>
    )},
    { key: "body", header: t('student.messageLabel', 'Message'), render: (item) => (
      <span className="text-xs text-gray-500">{item.body.length > 80 ? `${item.body.slice(0, 80)}...` : item.body}</span>
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

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t('student.messages')}</h1>
              <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCompose} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold hover:bg-gold-400 transition-colors">
              {t('student.compose', 'Compose')}
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={loadMessages} />}

        {loading ? <LoadingSkeleton type="table" rows={5} /> : (
          <>
            {/* Tab Switcher */}
            <div className="flex gap-1 mb-4 bg-navy-800 rounded-lg p-1 border border-navy-700 w-fit">
              <button onClick={() => setActiveTab("inbox")}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === "inbox" ? "bg-gold-500 text-navy-900 font-semibold" : "text-gray-400 hover:text-white"}`}>
                {t('student.inbox', 'Inbox')} ({received.length})
              </button>
              <button onClick={() => setActiveTab("sent")}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === "sent" ? "bg-gold-500 text-navy-900 font-semibold" : "text-gray-400 hover:text-white"}`}>
                {t('student.sent', 'Sent')} ({sent.length})
              </button>
            </div>

            {currentMessages.length === 0 ? (
              <EmptyState message={activeTab === "inbox"
                ? t('student.noMessages', 'No messages yet.')
                : t('student.noSent', 'No sent messages yet.')}
              />
            ) : (
              <>
                <FilterBar
                  filters={activeTab === "inbox" ? filterOptions : []}
                  values={filters}
                  onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                  onClear={() => { setFilters({}); setSearch(""); }}
                  searchPlaceholder={activeTab === "inbox"
                    ? t('student.searchMessages', 'Search messages...')
                    : t('student.searchSent', 'Search sent messages...')}
                  searchValue={search}
                  onSearchChange={setSearch}
                />
                <DataTable
                  columns={activeTab === "inbox" ? inboxColumns : sentColumns}
                  data={filteredMessages as any}
                  keyField="id"
                  emptyMessage={t('student.noMessagesFilter', 'No messages match your filters.')}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Compose Modal */}
      <ModalForm open={composeOpen} onClose={() => { setComposeOpen(false); setRecipientId(""); setSubject(""); setBody(""); }} title={t('student.composeMessage', 'Compose Message')}
        footer={
          <>
            <button onClick={() => { setComposeOpen(false); setRecipientId(""); setSubject(""); setBody(""); }} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
              {t('common.cancel', 'Cancel')}
            </button>
            <button onClick={handleSend} disabled={sending} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
              {sending ? t('common.sending', 'Sending...') : t('common.send', 'Send')}
            </button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('student.recipient', 'Recipient')} *</label>
            <select value={recipientId} onChange={e => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500">
              <option value="">{t('student.selectRecipient', 'Select a recipient...')}</option>
              {recipients.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('student.subject', 'Subject')} *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('student.messageLabel', 'Message')} *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
      </ModalForm>

      {/* Reply Modal */}
      <ModalForm open={replyOpen} onClose={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); }}
        title={replyTo ? `${t('student.replyTo', 'Reply to')} ${replyTo.sender_name}` : t('student.reply', 'Reply')}
        footer={
          <>
            <button onClick={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); }} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
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
              <p className="text-xs text-gray-500 mb-1">{t('student.originalMessage', 'Original message')}:</p>
              <p className="text-sm text-gray-300 font-medium">{replyTo.subject}</p>
              <p className="text-xs text-gray-500 mt-1">{replyTo.body.slice(0, 200)}</p>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('student.messageLabel', 'Message')} *</label>
            <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={5}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
