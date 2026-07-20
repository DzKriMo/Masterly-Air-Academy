"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";

// ── Types ─────────────────────────────────────────────────

interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  entity_id: string;
  ip_address: string;
  created_at: string;
  details?: string;
}

// ── Constants ─────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function downloadExport() {
  const token =
    (() => { try { const s = JSON.parse(sessionStorage.getItem('maa_session') || '{}'); return s.token; } catch { return null; } })();
  const url = `${API_BASE}/api/export/audit-logs/`;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.responseType = 'blob';
  xhr.onload = function () {
    if (xhr.status === 200) {
      const blob = xhr.response;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'audit_logs.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };
  xhr.send();
}

const ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "view",
  "export",
  "approve",
  "reject",
  "reset_password",
];

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/10 text-green-400",
  update: "bg-blue-500/10 text-blue-400",
  delete: "bg-red-500/10 text-red-400",
  login: "bg-cyan-500/10 text-cyan-400",
  logout: "bg-gray-500/10 text-gray-400",
  view: "bg-purple-500/10 text-purple-400",
  export: "bg-amber-500/10 text-amber-400",
  approve: "bg-emerald-500/10 text-emerald-400",
  reject: "bg-rose-500/10 text-rose-400",
  reset_password: "bg-orange-500/10 text-orange-400",
};

const fmtAction = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

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

// ── Component ─────────────────────────────────────────────

export default function AdminAuditLogsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Detail modal state ──
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery<AuditLog[]>({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const d = await api.get<any>("/audit-logs/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
    // Refresh every 30 seconds
    refetchInterval: 30000,
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!logs) return [];
    let r = logs;
    if (filterValues.action)
      r = r.filter((l) => l.action === filterValues.action);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (l) =>
          (l.user || "").toLowerCase().includes(q) ||
          (l.entity || "").toLowerCase().includes(q) ||
          (l.entity_id || "").toLowerCase().includes(q) ||
          (l.details || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [logs, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<AuditLog>[] = useMemo(
    () => [
      {
        key: "created_at",
        header: t("common.date", "Date"),
        render: (l) => (
          <span className="text-xs text-gray-400 whitespace-nowrap font-mono">
            {formatDateTime(l.created_at)}
          </span>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (l) => (
          <span className="text-sm text-white">{l.user || "—"}</span>
        ),
      },
      {
        key: "action",
        header: "Action",
        render: (l) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              ACTION_COLORS[l.action] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtAction(l.action)}
          </span>
        ),
      },
      {
        key: "entity",
        header: "Entity",
        render: (l) => (
          <div>
            <span className="text-sm text-gray-300">{l.entity}</span>
            {l.entity_id && (
              <span className="text-xs text-gray-500 ml-1 font-mono">
                #{l.entity_id}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "ip_address",
        header: "IP",
        render: (l) => (
          <span className="text-xs text-gray-500 font-mono">
            {l.ip_address || "—"}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.auditLogs", "Audit Logs")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Auto-refreshes every 30s
            </span>
            <button
              onClick={downloadExport}
              className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Export Excel
            </button>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 hover:text-white transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load audit logs"}
            onRetry={() => refetch()}
          />
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "action",
              label: "All Actions",
              options: ACTIONS.map((a) => ({
                value: a,
                label: fmtAction(a),
              })),
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search user, entity, or details..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              logs?.length === 0
                ? "No audit log entries recorded yet."
                : "No log entries match your filters."
            }
            title={
              logs?.length === 0 ? "No audit logs yet" : "No matching entries"
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelectedLog(item as AuditLog)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={selectedLog !== null}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Detail"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Action</label>
              {selectedLog?.action ? (
                <span className={`text-xs px-2 py-0.5 rounded ${ACTION_COLORS[selectedLog.action] || "bg-gray-500/10 text-gray-400"}`}>
                  {fmtAction(selectedLog.action)}
                </span>
              ) : (
                <p className="text-white">—</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">User</label>
              <p className="text-white">{selectedLog?.user || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entity</label>
              <p className="text-white">{selectedLog?.entity || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entity ID</label>
              <p className="text-white font-mono">{selectedLog?.entity_id || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">IP Address</label>
              <p className="text-white font-mono">{selectedLog?.ip_address || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Created At</label>
              <p className="text-white">{formatDateTime(selectedLog?.created_at)}</p>
            </div>
            {selectedLog?.details && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Details</label>
                <p className="text-white text-sm whitespace-pre-wrap">{selectedLog.details}</p>
              </div>
            )}
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
