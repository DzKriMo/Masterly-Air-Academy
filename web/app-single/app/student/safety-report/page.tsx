"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/use-translation";
import { useToast } from "@/components/toast";
import { PageHeader } from "@/components/page-header";

const EVENT_TYPES = [
  "Airspace Infringement", "Bird Strike", "Engine Failure / Malfunction",
  "Ground Incident", "Loss of Separation", "Near Miss",
  "System Failure", "Turbulence", "Weather Related", "Other",
];

const ACCEPTED = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt";

export default function StudentSafetyReport() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ title: "", type: "", description: "", confidential: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.type || !form.description.trim()) {
      showToast("error", "Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const attachments: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await api.upload<any>("/safety-events/upload/", fd);
        if (r?.file_url) attachments.push(r.file_url);
      }
      await api.post("/safety-events/report/", { ...form, attachments });
      showToast("success", "Safety report submitted successfully");
      router.push("/student/dashboard");
    } catch {
      showToast("error", "Failed to submit safety report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title="Report Safety Issue" backHref="/student/dashboard" maxWidth="max-w-3xl" />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-6">
            Use this form to report any safety issue or incident encountered during flight training or ground operations.
            Your report helps us maintain the highest safety standards.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Brief title of the issue"
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Type *</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500/50"
              >
                <option value="">Select type...</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={6}
                placeholder="Describe the issue in detail — what happened, when, where, and any contributing factors"
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 resize-y"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.confidential}
                onChange={e => setForm(p => ({ ...p, confidential: e.target.checked }))}
                className="w-4 h-4 rounded border-navy-600 bg-navy-700 text-gold-500 focus:ring-gold-500/50"
              />
              <span className="text-sm text-gray-300">
                Submit anonymously (your identity will not be revealed)
              </span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Attachments (optional) — photos, documents
              </label>
              <input
                type="file"
                multiple
                accept={ACCEPTED}
                onChange={e => setFiles(Array.from(e.target.files || []))}
                className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-sm text-gray-300 file:mr-4 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gold-500 file:text-navy-900 file:font-semibold file:text-xs focus:outline-none focus:border-gold-500/50"
              />
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-center gap-2">
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-gray-600 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-300 shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 text-sm"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/student/dashboard")}
                className="px-6 py-2.5 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
