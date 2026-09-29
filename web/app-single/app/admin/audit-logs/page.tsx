"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { fmtLabel, formatDateTime } from "@/lib/format-utils";

// ── Types ─────────────────────────────────────────────────

interface AuditLog {
  id: string;
  user: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string;
  entity_name?: string;
  summary?: string;
  ip_address: string;
  user_agent?: string;
  created_at: string;
  old_values?: any;
  new_values?: any;
}

// ── Change formatting ──────────────────────────────────────

/**
 * Turn a stored field name into something readable: `first_name` -> `First name`,
 * `dateOfBirth` -> `Date Of Birth`, `id` -> `Id`.
 */
function humanizeField(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render one audit value compactly; anything long or structured is summarised. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > 60 ? `${json.slice(0, 60)}…` : json;
  }
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

interface ChangeRow {
  field: string;
  label: string;
  before: string;
  after: string;
  same: boolean;
}

/**
 * Build a field-by-field diff. A field present on only one side still produces a
 * row (a create or a removal), so the table never silently drops half the
 * change the way a raw JSON dump could hide it.
 */
function buildChangeRows(
  oldValues: Record<string, unknown> | undefined | null,
  newValues: Record<string, unknown> | undefined | null
): ChangeRow[] {
  const before = oldValues && typeof oldValues === 'object' ? oldValues : {};
  const after = newValues && typeof newValues === 'object' ? newValues : {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  return keys.map((key) => {
    const hadBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hadAfter = Object.prototype.hasOwnProperty.call(after, key);
    // Compare serialised forms so objects/arrays compare by content, and so
    // 1 vs "1" is correctly reported as a change.
    const same =
      hadBefore &&
      hadAfter &&
      JSON.stringify(before[key]) === JSON.stringify(after[key]);
    return {
      field: key,
      label: humanizeField(key),
      before: hadBefore ? formatValue(before[key]) : '—',
      after: hadAfter ? formatValue(after[key]) : '—',
      same,
    };
  });
}

function summariseChanges(rows: ChangeRow[]): string {
  const changed = rows.filter((r) => !r.same).length;
  if (rows.length === 0) return 'No field-level detail recorded';
  const plural = rows.length === 1 ? '' : 's';
  if (changed === 0) return `No field changes (${rows.length} field${plural} recorded)`;
  return `${changed} of ${rows.length} field${plural} changed`;
}

// ── Constants ─────────────────────────────────────────────

async function downloadExport() {
  try {
    const res = await api.download("/export/audit-logs/");
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'audit_logs.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch {
    // export failures are surfaced by the caller's toast
  }
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



// ── Component ─────────────────────────────────────────────

export default function AdminAuditLogsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Detail modal state ──
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // ── Auth guard ──

  // ── Query ──
  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery<AuditLog[]>({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/audit-logs/"));
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
    // Refresh every 30 seconds
    refetchInterval: 30000,
  });

  // Field-by-field diff for the selected entry's detail modal.
  const changeRows = useMemo(
    () => buildChangeRows(selectedLog?.old_values, selectedLog?.new_values),
    [selectedLog]
  );

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
          (l.user_email || "").toLowerCase().includes(q) ||
          (l.entity || "").toLowerCase().includes(q) ||
          (l.entity_id || "").toLowerCase().includes(q) ||
          ((l.old_values ? JSON.stringify(l.old_values) : '')+(l.new_values ? ' → '+JSON.stringify(l.new_values) : '') || "").toLowerCase().includes(q)
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
          <span className="text-sm text-white">{l.user_email || "—"}</span>
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
            {fmtLabel(l.action)}
          </span>
        ),
      },
      {
        key: "entity",
        header: "Entity",
        render: (l) => (
          <div>
            <span className="text-sm text-gray-300">{l.entity}</span>
            {l.entity_name && (
              <span className="text-xs text-gold-500 ml-1">
                — {l.entity_name}
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
      <PageHeader title={t("admin.auditLogs", "Audit Logs")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={
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
        } />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load audit logs"}
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
                label: fmtLabel(a),
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
                  {fmtLabel(selectedLog.action)}
                </span>
              ) : (
                <p className="text-white">—</p>
              )}
            </div>
            {selectedLog?.summary && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Summary</label>
                <p className="text-white text-sm">{selectedLog.summary}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">User</label>
              <p className="text-white">{selectedLog?.user_email || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entity</label>
              <p className="text-white">{selectedLog?.entity_name ? `${selectedLog.entity} — ${selectedLog.entity_name}` : selectedLog?.entity || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">IP Address</label>
              <p className="text-white font-mono">{selectedLog?.ip_address || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Created At</label>
              <p className="text-white">{formatDateTime(selectedLog?.created_at)}</p>
            </div>
            {changeRows.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-400">Changes</label>
                  <span className="text-xs text-gray-500">{summariseChanges(changeRows)}</span>
                </div>
                <div className="bg-navy-900 rounded-lg overflow-hidden border border-navy-700">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-3 py-2 bg-navy-800/60 text-xs uppercase tracking-wide text-gray-400">
                    <span>Field</span>
                    <span>Before</span>
                    <span>After</span>
                  </div>
                  {changeRows.map((row) => (
                    <div
                      key={row.field}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-3 py-2 text-sm border-t border-navy-700/60"
                    >
                      <span className={row.same ? "text-gray-400" : "text-white font-medium"} title={row.field}>
                        {row.label}
                      </span>
                      <span className={`break-words ${row.same ? "text-gray-500" : "text-red-400 line-through"}`}>
                        {row.before}
                      </span>
                      <span className={`break-words ${row.same ? "text-gray-500" : "text-green-400"}`}>
                        {row.after}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Fields shown in white with a struck-through value are the ones that changed.
                </p>
              </div>
            )}
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
