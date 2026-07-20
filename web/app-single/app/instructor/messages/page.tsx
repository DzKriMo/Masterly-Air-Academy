"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Msg { id: string; sender: string; sender_name: string; receiver: string; receiver_name: string; subject: string; body: string; is_read: boolean; created_at: string; }

export default function InstructorMessagesPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [received, setReceived] = useState<Msg[]>([]);
  const [sent, setSent] = useState<Msg[]>([]);
  const [tab, setTab] = useState("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ receiver: "", subject: "", body: "" });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [viewMsg, setViewMsg] = useState<Msg | null>(null);

  // Reply state
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => { if (!authLoading && !isAuthenticated) { router.push("/login"); } }, [authLoading, isAuthenticated, router]);

  const fetchMessages = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/messages/")
      .then(data => { setReceived((data as unknown as any).results || []); setError(null); })
      .catch(err => { console.error("Failed to load messages:", err); setError(t("instructor.failedToLoadMessages", "Failed to load messages. Please try again.")); });
    api.get<any>("/messages/sent/")
      .then(data => { setSent(data as unknown as any[] || []); })
      .catch(() => {});
    api.get<any>("/students/")
      .then(data => { setUsers((data as unknown as any).results || (data as unknown as any) || []); })
      .catch(() => {});
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, [isAuthenticated]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiver) { showToast("error", t("instructor.selectRecipient", "Please select a recipient.")); return; }
    if (!form.subject.trim()) { showToast("error", t("instructor.enterSubject", "Please enter a subject.")); return; }
    if (!form.body.trim()) { showToast("error", t("instructor.enterMessage", "Please enter a message.")); return; }
    try {
      await api.post("/messages/", form);
      showToast("success", t("instructor.messageSent", "Message sent successfully"));
      setForm({ receiver: "", subject: "", body: "" });
      setShowCompose(false);
      setTab("sent");
    } catch (err: any) {
      showToast("error", err.message || t("instructor.connectionError", "Connection error"));
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) { showToast("error", t("instructor.enterMessage", "Please enter a message.")); return; }
    setSendingReply(true);
    try {
      await api.post("/messages/", { receiver: replyTo!.sender, subject: `Re: ${replyTo!.subject}`, body: replyBody.trim() });
      showToast("success", t("instructor.replySent", "Reply sent successfully"));
      setReplyOpen(false);
      setReplyBody("");
      setReplyTo(null);
      fetchMessages();
    } catch (err: any) {
      showToast("error", err.message || t("instructor.connectionError", "Connection error"));
    } finally { setSendingReply(false); }
  };

  const openView = (msg: Msg) => {
    setViewMsg(msg);
    // Mark as read if unread and in inbox
    if (tab === 'inbox' && !msg.is_read) {
      api.post(`/messages/${msg.id}/mark_read/`).catch(() => {});
      setReceived(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const openReply = (msg: Msg) => {
    setReplyTo(msg);
    setReplyBody("");
    setReplyOpen(true);
  };

  const display = tab === "inbox" ? received : sent;

  const filtered = useMemo(() => {
    let result = display;
    if (filterValues.readStatus === "unread" && tab === "inbox") result = result.filter(m => !m.is_read);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(m => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q) || (tab === "inbox" ? m.sender_name : m.receiver_name).toLowerCase().includes(q));
    }
    return result;
  }, [display, filterValues, searchValue, tab]);

  const columns: Column<Msg>[] = useMemo(() => [
    { key: "unread", header: "", sortable: false, render: (m) => tab === "inbox" && !m.is_read ? (
      <div className="w-2 h-2 rounded-full bg-gold-500" />
    ) : <div className="w-2 h-2" />},
    { key: "contact", header: tab === "inbox" ? t("inbox.from", "From") : t("inbox.to", "To"), render: (m) => (
      <span className={`text-sm ${tab === 'inbox' && !m.is_read ? 'text-white font-medium' : 'text-gray-400'}`}>{tab === "inbox" ? m.sender_name : m.receiver_name}</span>
    )},
    { key: "subject", header: t("common.subject", "Subject"), render: (m) => (
      <span className={tab === 'inbox' && !m.is_read ? 'text-white font-medium' : 'text-gray-300'}>{m.subject}</span>
    )},
    { key: "body", header: t("common.message", "Message"), render: (m) => (
      <span className="text-xs text-gray-400">{m.body.length > 80 ? m.body.slice(0, 80) + "..." : m.body}</span>
    )},
    { key: "created_at", header: t("common.date", "Date"), render: (m) => (
      <span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (m) => (
      tab === 'inbox' ? (
        <button onClick={(e) => { e.stopPropagation(); openReply(m); }} className="px-2 py-1 text-xs text-gold-500 border border-gold-500/30 rounded hover:bg-gold-500/10 transition-colors">
          {t('instructor.reply', 'Reply')}
        </button>
      ) : null
    )},
  ], [tab, t]);

  const userOptions = users.map((u: any) => ({ value: u.user_id || u.id, label: `${u.full_name} (${u.student_number})` }));

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t("instructor.messages", "Messages")}</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Dashboard")}</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <button onClick={() => setTab("inbox")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab==="inbox"?"bg-gold-500 text-navy-900":"bg-navy-800 text-gray-400 border border-navy-700"}`}>{t("inbox.inbox", "Inbox")}</button>
              <button onClick={() => setTab("sent")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab==="sent"?"bg-gold-500 text-navy-900":"bg-navy-800 text-gray-400 border border-navy-700"}`}>{t("inbox.sent", "Sent")}</button>
              <button onClick={() => setShowCompose(true)} className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gold-500 text-navy-900">{t("inbox.compose", "Compose")}</button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchMessages} />}

        <FilterBar
          filters={tab === "inbox" ? [
            { key: "readStatus", label: t("common.allMessages", "All Messages"), options: [
              { value: "unread", label: t("common.unreadOnly", "Unread Only") },
            ]},
          ] : []}
          values={filterValues}
          onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={t("instructor.searchMessages", "Search messages...")}
        />

        <ModalForm
          open={showCompose}
          onClose={() => setShowCompose(false)}
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
          <form id="compose-form" onSubmit={handleSend}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.to", "To")}</label>
                <select value={form.receiver} onChange={e => setForm({...form, receiver: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("instructor.selectStudent", "Select student...")}</option>
                  {users.map((u: any) => <option key={u.id} value={u.user_id || u.id}>{u.full_name} ({u.student_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.subject", "Subject")}</label>
                <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.message", "Message")}</label>
                <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} required rows={4} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
            </div>
          </form>
        </ModalForm>

        {/* View Message Modal */}
        <ModalForm
          open={!!viewMsg}
          onClose={() => setViewMsg(null)}
          title={viewMsg?.subject || ''}
          footer={viewMsg && tab === 'inbox' ? (
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
                  <span className="text-gray-500">{tab === 'inbox' ? t('inbox.from', 'From') : t('inbox.to', 'To')}: </span>
                  <span className="text-white font-medium">{tab === 'inbox' ? viewMsg.sender_name : viewMsg.receiver_name}</span>
                </div>
                <span className="text-xs text-gray-600">{new Date(viewMsg.created_at).toLocaleString()}</span>
              </div>
              <div className="bg-navy-900 border border-navy-700 rounded-lg p-4">
                <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{viewMsg.body}</p>
              </div>
            </div>
          )}
        </ModalForm>

        {/* Reply Modal */}
        <ModalForm
          open={replyOpen}
          onClose={() => { setReplyOpen(false); setReplyBody(""); setReplyTo(null); }}
          title={replyTo ? `${t('instructor.replyTo', 'Reply to')} ${replyTo.sender_name}` : t('instructor.reply', 'Reply')}
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
                <p className="text-xs text-gray-500 mb-1">{t('instructor.originalMessage', 'Original message')}:</p>
                <p className="text-sm text-gray-300 font-medium">{replyTo.subject}</p>
                <p className="text-xs text-gray-500 mt-1">{replyTo.body.slice(0, 200)}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('common.message', 'Message')} *</label>
              <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={5}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500 resize-none" />
            </div>
          </div>
        </ModalForm>

        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={tab === "inbox" ? t("instructor.noMessagesReceived", "No messages received.") : t("instructor.noMessagesSent", "No messages sent.")}
            title={display.length === 0 ? undefined : t("instructor.noMatchingMessages", "No matching messages")}
            action={display.length === 0 && tab === "inbox" ? { label: t("inbox.compose", "Compose Message"), onClick: () => setShowCompose(true) } : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(msg) => openView(msg as Msg)} />
        )}
      </main>
    </div>
  );
}
