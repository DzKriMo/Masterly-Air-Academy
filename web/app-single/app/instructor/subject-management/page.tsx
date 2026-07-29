"use client";
import { useEffect, useState, useCallback } from "react";
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
import { DetailField } from "@/components/detail-field";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";

interface Subject {
  id: string;
  code: string;
  title_en: string;
  title_fr: string;
  title_ar: string;
  description_en: string;
  program: string;
  total_hours: number;
  status: string;
}

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];
const STATUSES = ["active", "inactive", "draft"];

export default function SubjectManagementPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Subject | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", title_en: "", title_fr: "", title_ar: "", description_en: "", program: "PPL" as string, total_hours: "", status: "active" as string });

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    api.get("/subjects/")
      .then((data: any) => {
        const list: Subject[] = (data.results || data || []).map((s: any) => ({
          id: s.id, code: s.code || "",
          title_en: s.title_en || s.title || "",
          title_fr: s.title_fr || "",
          title_ar: s.title_ar || "",
          description_en: s.description_en || s.description || "",
          program: s.program || "PPL",
          total_hours: s.total_hours || 0,
          status: s.status || "active",
        }));
        setSubjects(list); setError(null);
      })
      .catch(err => { console.error(err); setError("Failed to load subjects."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ code: "", title_en: "", title_fr: "", title_ar: "", description_en: "", program: "PPL", total_hours: "", status: "active" });

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const openEdit = (s: Subject) => { setEditTarget(s); setForm({ code: s.code, title_en: s.title_en, title_fr: s.title_fr, title_ar: s.title_ar, description_en: s.description_en, program: s.program, total_hours: String(s.total_hours), status: s.status }); };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const payload = { ...form, total_hours: parseInt(form.total_hours) || 0 };
      if (editTarget) {
        await api.patch(`/subjects/${editTarget.id}/`, payload);
        showToast("success", "Subject updated");
      } else {
        await api.post("/subjects/", payload);
        showToast("success", "Subject created");
      }
      setCreateOpen(false); setEditTarget(null);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to save subject");
    } finally { setSaving(false); }
  };

  const filterOptions: FilterOption[] = [
    { key: "status", label: "All Statuses", options: STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })) },
    { key: "program", label: "All Programs", options: PROGRAMS.map(p => ({ value: p, label: p })) },
  ];

  const filtered = subjects.filter(s => {
    if (filters.status && s.status !== filters.status) return false;
    if (filters.program && s.program !== filters.program) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.code?.toLowerCase().includes(q) && !s.title_en?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { active: "bg-green-500/10 text-green-400", inactive: "bg-gray-500/10 text-gray-400", draft: "bg-yellow-500/10 text-yellow-400" };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[s] || "bg-gray-500/10 text-gray-400"}`}>{s}</span>;
  };

  const columns: Column<Subject>[] = [
    { key: "code", header: "Code", render: (s) => <span className="text-sm text-gold-500 font-mono font-medium">{s.code}</span> },
    { key: "title_en", header: "Title", render: (s) => <span className="text-white font-medium">{s.title_en}</span> },
    { key: "program", header: "Program" },
    { key: "total_hours", header: "Hours", render: (s) => <span className="text-sm">{s.total_hours}h</span> },
    { key: "status", header: "Status", render: (s) => statusBadge(s.status) },
    { key: "actions", header: "", render: (s) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(s)} className="px-2 py-1 text-xs text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/10 transition-colors">Edit</button>
      </div>
    )},
  ];

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Code *</label>
          <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Program *</label>
          <select value={form.program} onChange={e => setForm({ ...form, program: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm">
            {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Title (EN) *</label>
        <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Title (FR)</label>
          <input value={form.title_fr} onChange={e => setForm({ ...form, title_fr: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Title (AR)</label>
          <input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <textarea rows={3} value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm resize-y" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Total Hours *</label>
          <input type="number" min="0" value={form.total_hours} onChange={e => setForm({ ...form, total_hours: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm">
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.subjectManagement", "Subject Management")} backHref="/instructor/cgi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : subjects.length === 0 ? (
          <>
            <EmptyState message="No subjects found." />
            <div className="text-center">
              <button onClick={openCreate} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">Create Subject</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
                onClear={() => { setFilters({}); setSearch(""); }}
                searchPlaceholder="Search subjects..." searchValue={search} onSearchChange={setSearch} />
              <button onClick={openCreate} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm whitespace-nowrap shrink-0">+ Create</button>
            </div>
            <DataTable columns={columns} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as Subject)} />

            {/* Detail modal */}
            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={selected?.title_en || ""}
              footer={<button onClick={() => setSelected(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
              {selected && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Code" value={selected.code} />
                    <DetailField label="Program" value={selected.program} />
                    <DetailField label="Title (EN)" value={selected.title_en} />
                    <DetailField label="Title (FR)" value={selected.title_fr || "—"} />
                    <DetailField label="Title (AR)" value={selected.title_ar || "—"} />
                    <DetailField label="Hours" value={`${selected.total_hours}h`} />
                    <DetailField label="Status" value={selected.status} />
                  </div>
                  {selected.description_en && (
                    <div>
                      <h3 className="text-sm font-semibold text-gold-500 mb-2 uppercase tracking-wider">Description</h3>
                      <p className="text-gray-300 text-sm">{selected.description_en}</p>
                    </div>
                  )}
                  <button onClick={() => { setSelected(null); openEdit(selected); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">Edit Subject</button>
                </div>
              )}
            </ModalForm>

            {/* Create / Edit modal */}
            <ModalForm open={createOpen || !!editTarget} onClose={() => { setCreateOpen(false); setEditTarget(null); }}
              title={editTarget ? `Edit Subject: ${editTarget.code}` : "Create Subject"}
              footer={
                <div className="flex gap-2">
                  <button onClick={() => { setCreateOpen(false); setEditTarget(null); }} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm disabled:opacity-50">
                    {saving ? "Saving..." : editTarget ? "Update" : "Create"}
                  </button>
                </div>
              }>
              {formFields}
            </ModalForm>
          </>
        )}
      </main>
    </div>
  );
}
