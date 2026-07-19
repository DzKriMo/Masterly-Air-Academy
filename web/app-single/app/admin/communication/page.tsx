"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { ModalForm } from "@/components/modal-form";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { useToast } from "@/components/toast";

// ── Types ────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
}

interface Notification {
  id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── Constants ────────────────────────────────────────────

const ROLES = [
  "director_general", "head_of_training",
  "chief_ground_instructor", "ground_instructor",
  "chief_flight_instructor", "flight_instructor",
  "system_admin", "admin_responsible", "admin_agent",
  "finance_responsible", "accounting_agent",
  "admissions_responsible",
  "quality_manager", "compliance_monitoring_manager", "safety_manager",
  "scheduler",
  "student", "candidate", "graduate",
] as const;

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ── Tab Config ───────────────────────────────────────────

const TABS = [
  { key: "role", label: "Send to Role" },
  { key: "user", label: "Send to User" },
  { key: "history", label: "History" },
];

// ── Page Component ───────────────────────────────────────

export default function AdminCommunicationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState("role");
  const [detailNotif, setDetailNotif] = useState<Notification | null>(null);

  // ── Tab 1: Send to Role ──
  const [roleForm, setRoleForm] = useState({ role: "", title: "", message: "" });

  // ── Tab 2: Send to User ──
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ title: "", message: "" });

  // ── Tab 3: History ──
  const [filterType, setFilterType] = useState("");

  // ── Queries ──

  // Search users for Tab 2
  const usersQuery = useQuery({
    queryKey: ["admin-communication-users", userSearch],
    queryFn: async () => {
      if (!userSearch || userSearch.length < 2) return [];
      const d: any = await api.get(`/users/?search=${encodeURIComponent(userSearch)}`);
      return (d?.results || d || []) as User[];
    },
    enabled: isAuthenticated && activeTab === "user" && userSearch.length >= 2,
    staleTime: 10000,
  });

  // Notification history for Tab 3
  const historyQuery = useQuery({
    queryKey: ["admin-communication-history"],
    queryFn: async () => {
      const d: any = await api.get("/notifications/");
      const items = (d?.results || d || []) as Notification[];
      return items.slice(0, 50);
    },
    enabled: isAuthenticated,
  });

  const historyData = historyQuery.data ?? [];

  // ── Mutations ──

  // Broadcast by role
  const broadcastByRoleMutation = useMutation({
    mutationFn: (body: { role: string; title: string; message: string }) =>
      api.post("/notifications/broadcast/", body),
    onSuccess: (data: any) => {
      showToast("success", `Notification sent to ${data.sent} user(s)`);
      setRoleForm({ role: "", title: "", message: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-communication-history"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to send notification");
    },
  });

  // Send to specific user
  const sendToUserMutation = useMutation({
    mutationFn: (body: { user_id: string; title: string; message: string }) =>
      api.post("/notifications/broadcast/", body),
    onSuccess: () => {
      showToast("success", "Notification sent to user");
      setSelectedUser(null);
      setUserForm({ title: "", message: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-communication-history"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to send notification");
    },
  });

  // ── Handlers ──

  const handleBroadcastByRole = () => {
    if (!roleForm.role || !roleForm.title) {
      showToast("error", "Role and title are required");
      return;
    }
    broadcastByRoleMutation.mutate(roleForm);
  };

  const handleSendToUser = () => {
    if (!selectedUser || !userForm.title) {
      showToast("error", "User and title are required");
      return;
    }
    sendToUserMutation.mutate({
      user_id: selectedUser.id,
      title: userForm.title,
      message: userForm.message,
    });
  };

  // ── Filter history ──
  const filteredHistory = useMemo(() => {
    let r = historyData;
    if (filterType) r = r.filter((n) => n.type === filterType);
    return r;
  }, [historyData, filterType]);

  // ── History columns ──
  const historyColumns: Column<Notification>[] = useMemo(
    () => [
      {
        key: "created_at",
        header: "Date",
        render: (n) => (
          <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(n.created_at)}</span>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (n) => (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {n.type}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        render: (n) => (
          <span className="text-sm text-white font-medium">{n.title}</span>
        ),
      },
      {
        key: "message",
        header: "Message",
        render: (n) => (
          <span className="text-xs text-gray-400 max-w-xs truncate block">{n.message}</span>
        ),
      },
      {
        key: "is_read",
        header: "Read",
        render: (n) => (
          <span className={`text-xs px-2 py-0.5 rounded-full ${n.is_read ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
            {n.is_read ? "Read" : "Unread"}
          </span>
        ),
      },
    ],
    [],
  );

  // ── Render ──

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-navy-900">
      {/* ─── Navbar ──────────────────────────────────── */}
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">Communication</h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500 transition-colors"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ─── Tabs ──────────────────────────────────── */}
        <div className="flex border-b border-navy-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "text-gold-500 border-gold-500"
                  : "text-gray-400 border-transparent hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* TAB 1: Send to Role                           */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === "role" && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Send Notification to Role</h2>
            <p className="text-sm text-gray-400 mb-6">
              Send a broadcast notification to all users with a specific role.
            </p>
            <div className="space-y-4">
              {/* Role */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  value={roleForm.role}
                  onChange={(e) => setRoleForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select a role...</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{formatRole(r)}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.title}
                  onChange={(e) => setRoleForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Notification title"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <textarea
                  value={roleForm.message}
                  onChange={(e) => setRoleForm((f) => ({ ...f, message: e.target.value }))}
                  rows={4}
                  placeholder="Notification message (optional)"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleBroadcastByRole}
                disabled={broadcastByRoleMutation.isPending || !roleForm.role || !roleForm.title}
                className="px-6 py-2.5 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {broadcastByRoleMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Notification"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* TAB 2: Send to User                           */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === "user" && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Send Notification to User</h2>
            <p className="text-sm text-gray-400 mb-6">
              Send a notification to a specific user.
            </p>
            <div className="space-y-4">
              {/* User search */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Search User <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setSelectedUser(null);
                  }}
                  placeholder="Type at least 2 characters to search..."
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
                {/* Search results */}
                {usersQuery.data && usersQuery.data.length > 0 && !selectedUser && (
                  <div className="mt-2 bg-navy-900 border border-navy-700 rounded-lg max-h-48 overflow-y-auto">
                    {usersQuery.data.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearch(u.email);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-navy-700 hover:text-white transition-colors border-b border-navy-700 last:border-0"
                      >
                        <span className="font-medium">{u.email}</span>
                        <span className="text-xs text-gray-500 ml-2">({formatRole(u.role)})</span>
                      </button>
                    ))}
                  </div>
                )}
                {usersQuery.data && usersQuery.data.length === 0 && userSearch.length >= 2 && !selectedUser && (
                  <p className="text-sm text-gray-500 mt-2">No users found.</p>
                )}
                {selectedUser && (
                  <div className="mt-2 flex items-center gap-2 bg-navy-900 border border-navy-700 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-white font-medium">{selectedUser.email}</span>
                    <span className="text-xs text-gray-500">({formatRole(selectedUser.role)})</span>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setUserSearch("");
                      }}
                      className="ml-auto text-xs text-red-400 hover:text-red-300"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.title}
                  onChange={(e) => setUserForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Notification title"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <textarea
                  value={userForm.message}
                  onChange={(e) => setUserForm((f) => ({ ...f, message: e.target.value }))}
                  rows={4}
                  placeholder="Notification message (optional)"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSendToUser}
                disabled={sendToUserMutation.isPending || !selectedUser || !userForm.title}
                className="px-6 py-2.5 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {sendToUserMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send to User"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* TAB 3: History                                */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Notifications</h2>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-sm bg-navy-800 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="broadcast">Broadcast</option>
                <option value="invoice_created">Invoice Created</option>
                <option value="invoice_overdue">Invoice Overdue</option>
                <option value="flight_scheduled">Flight Scheduled</option>
                <option value="flight_evaluated">Flight Evaluated</option>
                <option value="exam_result">Exam Result</option>
                <option value="course_scheduled">Course Scheduled</option>
              </select>
            </div>

            {historyQuery.isLoading ? (
              <LoadingSkeleton type="table" rows={8} />
            ) : filteredHistory.length === 0 ? (
              <EmptyState
                title="No notifications"
                message={historyData.length === 0 ? "No notifications recorded yet." : "No notifications match the filter."}
              />
            ) : (
              <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                <DataTable columns={historyColumns} data={filteredHistory} keyField="id" pageSize={15} onRowClick={(n) => setDetailNotif(n as Notification)} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail modal for viewing full notification */}
      {detailNotif && (
        <ModalForm open={!!detailNotif} onClose={() => setDetailNotif(null)} title={detailNotif.title}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{detailNotif.type}</span>
              <span className="text-xs text-gray-500">{new Date(detailNotif.created_at).toLocaleString()}</span>
              <span className={`text-xs ml-auto ${detailNotif.is_read ? "text-gray-500" : "text-gold-500"}`}>{detailNotif.is_read ? "Read" : "Unread"}</span>
            </div>
            <div className="bg-navy-900 rounded-lg p-4 border border-navy-700">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{detailNotif.message}</p>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
