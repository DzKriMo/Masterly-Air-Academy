"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/use-translation";
import { useToast } from "@/components/toast";

interface Prefs {
  email_enabled: boolean;
  in_app_enabled: boolean;
  muted_types: string[];
  updated_at?: string;
}

export function NotificationPreferencesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>({ email_enabled: true, in_app_enabled: true, muted_types: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/notifications/preferences/")
      .then((d: any) => setPrefs({ email_enabled: d.email_enabled ?? true, in_app_enabled: d.in_app_enabled ?? true, muted_types: d.muted_types || [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const toggleMuted = (type: string) => {
    setPrefs(prev => ({
      ...prev,
      muted_types: prev.muted_types.includes(type)
        ? prev.muted_types.filter(x => x !== type)
        : [...prev.muted_types, type],
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/notifications/preferences/", prefs);
      showToast("success", t("notification.prefsSaved", "Notification preferences saved."));
      onClose();
    } catch {
      showToast("error", t("notification.prefsError", "Failed to save preferences."));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const commonTypes = [
    "flight_scheduled", "flight_evaluated", "exam_published", "exam_result",
    "course_scheduled", "enrollment", "invoice_created", "payment_received",
    "ncr_opened", "capa_assigned", "safety_event", "document_expiring",
    "deadline", "broadcast",
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">{t("notification.preferences", "Notification Preferences")}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">{t("common.loading", "Loading...")}</p>
          ) : (
            <>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm text-white font-medium">{t("notification.emailEnabled", "Email notifications")}</p>
                  <p className="text-xs text-gray-500">{t("notification.emailEnabledHint", "Receive an email for each new notification.")}</p>
                </div>
                <input type="checkbox" checked={prefs.email_enabled} onChange={e => setPrefs(p => ({ ...p, email_enabled: e.target.checked }))} className="w-5 h-5 accent-gold-500" />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm text-white font-medium">{t("notification.inAppEnabled", "In-app notifications")}</p>
                  <p className="text-xs text-gray-500">{t("notification.inAppEnabledHint", "Show notifications inside the platform.")}</p>
                </div>
                <input type="checkbox" checked={prefs.in_app_enabled} onChange={e => setPrefs(p => ({ ...p, in_app_enabled: e.target.checked }))} className="w-5 h-5 accent-gold-500" />
              </label>
              <div>
                <p className="text-sm text-white font-medium mb-2">{t("notification.mutedTypes", "Muted categories")}</p>
                <div className="flex flex-wrap gap-2">
                  {commonTypes.map(type => {
                    const active = prefs.muted_types.includes(type);
                    return (
                      <button key={type} onClick={() => toggleMuted(type)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${active ? "bg-navy-900 text-gray-500 border-navy-600 line-through" : "bg-navy-700 text-gray-300 border-navy-600 hover:bg-navy-600"}`}>
                        {type.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors">
            {t("common.cancel", "Cancel")}
          </button>
          <button onClick={save} disabled={saving || loading} className="px-5 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50">
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
