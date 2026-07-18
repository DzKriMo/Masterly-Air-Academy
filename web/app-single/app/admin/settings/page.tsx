"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

// ── Types ─────────────────────────────────────────────────

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category?: string;
}

// ── Component ─────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Edit modal state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<SystemSetting | null>(null);
  const [editValue, setEditValue] = useState("");

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery<SystemSetting[]>({
    queryKey: ["admin-system-settings"],
    queryFn: async () => {
      const d = await api.get<any>("/system-settings/");
      return (d as any) || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Update mutation ──
  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      api.put(`/system-settings/${id}/`, { value }),
    onSuccess: () => {
      showToast("success", "Setting updated successfully");
      setEditOpen(false);
      setEditItem(null);
      setEditValue("");
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to update setting");
    },
  });

  // ── Backup trigger mutation ──
  const backupMutation = useMutation({
    mutationFn: () => api.post("/system/backup/"),
    onSuccess: (data: any) => {
      showToast(
        "success",
        `Backup completed successfully: ${data?.file || ""}`,
      );
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to trigger backup");
    },
  });

  // ── Group by category ──
  const grouped = useMemo(() => {
    if (!settings) return {};
    const groups: Record<string, SystemSetting[]> = {};
    for (const s of settings) {
      const cat = s.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [settings]);

  const openEdit = (setting: SystemSetting) => {
    setEditItem(setting);
    setEditValue(setting.value);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    updateMutation.mutate({ id: editItem.id, value: editValue });
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.settings", "System Settings")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 hover:text-white transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ── Backup Section ───────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-3">
            {t("admin.backup", "Backup")}
          </h2>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${backupMutation.isPending ? "bg-amber-400 animate-pulse" : "bg-green-400"}`} />
                  <span className="text-sm text-white">
                    {backupMutation.isPending
                      ? t("admin.backupInProgress", "Backup in progress...")
                      : t("admin.backupReady", "Backup service ready")}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t("admin.backupRetention", "Retention period: 30 days")}
                </p>
                <p className="text-xs text-gray-500">
                  {t(
                    "admin.backupDescription",
                    "Manual backup creates a compressed SQL dump of the database.",
                  )}
                </p>
              </div>
              <button
                onClick={() => backupMutation.mutate()}
                disabled={backupMutation.isPending}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 shrink-0"
              >
                {backupMutation.isPending
                  ? t("admin.backingUp", "Backing up...")
                  : t("admin.triggerBackup", "Trigger Manual Backup")}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load settings"}
            onRetry={() => refetch()}
          />
        )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-5 bg-navy-700 rounded w-32 mb-3 animate-pulse" />
                <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="p-4 border-b border-navy-700 animate-pulse"
                    >
                      <div className="h-4 bg-navy-700 rounded w-48 mb-2" />
                      <div className="h-3 bg-navy-700 rounded w-64" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : settings && settings.length === 0 ? (
          <EmptyState
            message="No system settings found."
            title="No settings"
          />
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                {items.map((setting) => (
                  <div
                    key={setting.id}
                    className="flex items-center justify-between p-4 border-b border-navy-700 last:border-b-0 hover:bg-navy-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {setting.key}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-lg mt-0.5">
                        {setting.description || setting.value}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <code className="text-sm text-gray-400 bg-navy-900 px-3 py-1 rounded font-mono max-w-[300px] truncate">
                        {setting.value}
                      </code>
                      <button
                        onClick={() => openEdit(setting)}
                        className="px-3 py-1.5 text-xs bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 hover:text-white transition-colors shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Edit Setting Modal */}
        <ModalForm
          open={editOpen}
          onClose={() => {
            if (!updateMutation.isPending) {
              setEditOpen(false);
              setEditItem(null);
              setEditValue("");
            }
          }}
          title={`Edit Setting: ${editItem?.key || ""}`}
          footer={
            <>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditItem(null);
                  setEditValue("");
                }}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {updateMutation.isPending
                  ? "Saving..."
                  : t("common.save", "Save")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {editItem && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Key</label>
                  <input
                    type="text"
                    value={editItem.key}
                    disabled
                    className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed"
                  />
                </div>
                {editItem.description && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-300 bg-navy-900 rounded-lg px-3 py-2 border border-navy-700">
                      {editItem.description}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Value <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none font-mono text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
