"use client";
import { BookOpen, FileText, ClipboardList, ListTree, FolderOpen } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { PROGRAMS, SUBJECT_STATUSES, STATUS_COLORS, TYPE_COLORS } from "@/lib/format-utils";
import { fmtLabel } from "@/lib/format-utils";
import { formatDate } from "@/lib/format-utils";

const badge = (color?: string) =>
  ({ className: color || "bg-gray-500/10 text-gray-400", capitalize: true });

const TABS: HubTab[] = [
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "modules", label: "Modules", icon: ListTree },
  { id: "lessons", label: "Lessons", icon: ClipboardList },
  { id: "docs", label: "Module Docs", icon: FileText },
  { id: "exercises", label: "Exercises", icon: FolderOpen },
];

export default function CurriculumHubPage() {
  return (
    <HubLayout title="Curriculum Hub" tabs={TABS} defaultTab="subjects">
      {(active) => (
        <>
          {active === "subjects" && <SubjectsTab />}
          {active === "modules" && <ModulesTab />}
          {active === "lessons" && <LessonsTab />}
          {active === "docs" && <DocsTab />}
          {active === "exercises" && <ExercisesTab />}
        </>
      )}
    </HubLayout>
  );
}

// ── Subjects (master-detail: nested modules) ──────────────
function SubjectsTab() {
  return (
    <HubCrud<Subject>
      queryKey={["admin-subjects"]}
      endpoint="/subjects/"
      titleFallback="Subjects"
      emptyTitle="No subjects yet"
      emptyMessage="Create your first subject to start building the curriculum."
      emptyActionLabel="+ New Subject"
      createTitle="Create Subject"
      editTitle="Edit Subject"
      createLabel="+ New Subject"
      searchPlaceholder="Search code or title..."
      searchFields={["code", "title_en"]}
      filterFields={[
        { key: "program", label: "All Programs", options: PROGRAMS.map((p) => ({ value: p, label: p })) },
        { key: "status", label: "All Statuses", options: SUBJECT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      initialCreate={{ code: "", title_en: "", title_fr: "", title_ar: "", description_en: "", program: "PPL", total_hours: "", status: "active" }}
      buildForm={(s) => ({
        code: s.code,
        title_en: s.title_en,
        title_fr: s.title_fr || "",
        title_ar: s.title_ar || "",
        description_en: s.description_en || "",
        program: s.program,
        total_hours: String(s.total_hours ?? ""),
        status: s.status,
      })}
      buildPayload={(f) => ({
        code: f.code,
        title_en: f.title_en,
        title_fr: f.title_fr || null,
        title_ar: f.title_ar || null,
        description_en: f.description_en || null,
        program: f.program,
        total_hours: f.total_hours ? parseInt(f.total_hours, 10) : 0,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "code", label: "Code", type: "text", required: true, mono: true, placeholder: "e.g. AV101", span: "half" },
        { name: "program", label: "Program", type: "select", options: PROGRAMS.map((p) => ({ value: p, label: p })), span: "half" },
        { name: "title_en", label: "Title (EN)", type: "text", required: true, placeholder: "English title" },
        { name: "title_fr", label: "Title (FR)", type: "text", placeholder: "Titre en français", span: "half" },
        { name: "title_ar", label: "Title (AR)", type: "text", placeholder: "العنوان بالعربية", span: "half" },
        { name: "description_en", label: "Description (EN)", type: "textarea", rows: 3 },
        { name: "total_hours", label: "Total Hours", type: "text", placeholder: "e.g. 60", span: "half" },
        { name: "status", label: "Status", type: "select", options: SUBJECT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })), span: "half" },
      ]}
      columns={[
        { key: "code", header: "Code", render: (s) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">{s.code}</span> },
        { key: "title_en", header: "Title", render: (s) => (<div><p className="text-sm text-white">{s.title_en}</p>{s.title_fr && <p className="text-xs text-gray-500">{s.title_fr}</p>}</div>) },
        { key: "program", header: "Program", render: (s) => <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">{s.program}</span> },
        { key: "total_hours", header: "Hours", render: (s) => <span className="text-sm text-white font-mono">{s.total_hours}</span> },
        { key: "modules_count", header: "Modules", render: (s) => <span className="text-sm text-white font-mono">{s.modules_count ?? s.modules?.length ?? 0}</span> },
        { key: "status", header: "Status", render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(s.status)}</span> },
      ]}
      detailTitle="Subject Details"
      detailFields={(s) => [
        { label: "Code", value: s.code },
        { label: "Title (EN)", value: s.title_en },
        ...(s.title_fr ? [{ label: "Title (FR)", value: s.title_fr }] : []),
        { label: "Program", value: s.program },
        { label: "Total Hours", value: String(s.total_hours ?? "—") },
        { label: "Status", value: fmtLabel(s.status) },
      ]}
      detailExtra={(s) =>
        s.modules && s.modules.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gold-500 mt-4 mb-2 uppercase tracking-wider">Modules</h3>
            <div className="overflow-hidden rounded-lg border border-navy-700">
              <table className="w-full text-sm">
                <thead><tr className="bg-navy-800"><th className="text-left px-4 py-2 text-gray-400 font-medium">Code</th><th className="text-left px-4 py-2 text-gray-400 font-medium">Title</th><th className="text-left px-4 py-2 text-gray-400 font-medium">Hours</th></tr></thead>
                <tbody>
                  {s.modules.map((m) => (
                    <tr key={m.id} className="border-t border-navy-700 hover:bg-navy-800/50">
                      <td className="px-4 py-2 text-gold-500 font-mono text-xs">{m.code}</td>
                      <td className="px-4 py-2 text-white">{m.title}</td>
                      <td className="px-4 py-2 text-white font-mono">{m.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      }
    />
  );
}
interface Subject {
  id: string;
  code: string;
  title_en: string;
  title_fr?: string;
  title_ar?: string;
  description_en?: string;
  program: string;
  total_hours: number;
  status: string;
  modules_count?: number;
  modules?: { id: string; code: string; title: string; hours: number }[];
}

// ── Modules ───────────────────────────────────────────────
function ModulesTab() {
  return (
    <HubCrud<Module>
      queryKey={["admin-modules"]}
      endpoint="/modules/"
      titleFallback="Modules"
      emptyTitle="No modules yet"
      emptyMessage="Modules belong to a subject. Create one to organise lessons."
      emptyActionLabel="+ New Module"
      createTitle="Create Module"
      editTitle="Edit Module"
      createLabel="+ New Module"
      searchPlaceholder="Search title..."
      searchFields={["title", "title_ar", "title_fr"]}
      filterFields={[
        { key: "subject", label: "All Subjects", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.code })) },
        { key: "status", label: "All Statuses", options: ["active", "inactive"].map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      lookup={{ key: "subjects", queryKey: ["admin-modules-subjects"], endpoint: "/subjects/" }}
      initialCreate={{ subject: "", title: "", title_ar: "", title_fr: "", description: "", duration: "", order: "", status: "active" }}
      buildForm={(m) => ({ subject: m.subject || "", title: m.title, title_ar: m.title_ar || "", title_fr: m.title_fr || "", description: m.description || "", duration: m.duration != null ? String(m.duration) : "", order: m.order != null ? String(m.order) : "", status: m.status })}
      buildPayload={(f) => ({
        subject: f.subject || null,
        title: f.title,
        title_ar: f.title_ar || null,
        title_fr: f.title_fr || null,
        description: f.description || null,
        duration: f.duration ? parseInt(f.duration, 10) : null,
        order: f.order ? parseInt(f.order, 10) : null,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "subject", label: "Subject", type: "select", required: true, options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.code })) },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "title_fr", label: "Title (FR)", type: "text", span: "half" },
        { name: "title_ar", label: "Title (AR)", type: "text", span: "half" },
        { name: "description", label: "Description", type: "textarea", rows: 3 },
        { name: "duration", label: "Duration (h)", type: "text", span: "half" },
        { name: "order", label: "Order", type: "text", span: "half" },
        { name: "status", label: "Status", type: "select", options: ["active", "inactive"].map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      columns={[
        { key: "title", header: "Title", render: (m) => <span className="text-sm font-semibold text-white">{m.title}</span> },
        { key: "subject_name", header: "Subject", render: (m) => <span className="text-sm text-gray-300">{m.subject_name || "—"}</span> },
        { key: "duration", header: "Duration", render: (m) => <span className="text-sm text-gray-400 font-mono">{m.duration ?? "—"}</span> },
        { key: "order", header: "Order", render: (m) => <span className="text-sm text-gray-400 font-mono">{m.order ?? "—"}</span> },
        { key: "status", header: "Status", render: (m) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[m.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(m.status)}</span> },
      ]}
      detailTitle="Module Details"
      detailFields={(m) => [
        { label: "Title", value: m.title },
        { label: "Subject", value: m.subject_name || "—" },
        { label: "Duration", value: m.duration != null ? String(m.duration) : "—" },
        { label: "Order", value: m.order != null ? String(m.order) : "—" },
        { label: "Status", value: fmtLabel(m.status) },
        ...(m.description ? [{ label: "Description", value: m.description }] : []),
      ]}
    />
  );
}
interface Module {
  id: string;
  subject: string | null;
  subject_name?: string;
  title: string;
  title_ar: string | null;
  title_fr: string | null;
  description: string | null;
  duration: number | null;
  order: number | null;
  status: string;
}

// ── Module Lessons ────────────────────────────────────────
function LessonsTab() {
  return (
    <HubCrud<Lesson>
      queryKey={["admin-module-lessons"]}
      endpoint="/module-lessons/"
      titleFallback="Module Lessons"
      emptyTitle="No lessons yet"
      emptyMessage="Lessons belong to a module."
      emptyActionLabel="+ New Lesson"
      createTitle="Create Lesson"
      editTitle="Edit Lesson"
      createLabel="+ New Lesson"
      searchPlaceholder="Search lesson or module..."
      searchFields={["title", "module_title"]}
      filterFields={[{ key: "module", label: "All Modules", options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) }]}
      lookup={{ key: "modules", queryKey: ["admin-lessons-modules"], endpoint: "/modules/" }}
      initialCreate={{ module: "", lesson_no: "", title: "", content: "", video_url: "" }}
      buildForm={(l) => ({ module: l.module || "", lesson_no: l.lesson_no != null ? String(l.lesson_no) : "", title: l.title || "", content: l.content || "", video_url: l.video_url || "" })}
      buildPayload={(f) => ({ module: f.module, lesson_no: f.lesson_no ? Number(f.lesson_no) : 0, title: f.title || null, content: f.content || null, video_url: f.video_url || null })}
      fields={(mode) => [
        { name: "module", label: "Module", type: "select", required: true, options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
        { name: "lesson_no", label: "Lesson No.", type: "text", span: "half" },
        { name: "title", label: "Title", type: "text", span: "half" },
        { name: "content", label: "Content", type: "textarea", rows: 3 },
        { name: "video_url", label: "Video URL", type: "text", placeholder: "https://..." },
      ]}
      columns={[
        { key: "lesson_no", header: "#", render: (l) => <span className="text-sm text-white font-mono">{l.lesson_no}</span> },
        { key: "title", header: "Title", render: (l) => <span className="text-sm font-semibold text-white">{l.title || "—"}</span> },
        { key: "module_title", header: "Module", render: (l) => <span className="text-sm text-gray-300">{l.module_title}</span> },
      ]}
      detailTitle="Lesson Details"
      detailFields={(l) => [
        { label: "Lesson No.", value: String(l.lesson_no) },
        { label: "Title", value: l.title || "—" },
        { label: "Module", value: l.module_title },
        ...(l.content ? [{ label: "Content", value: l.content }] : []),
        ...(l.video_url ? [{ label: "Video URL", value: l.video_url }] : []),
      ]}
    />
  );
}
interface Lesson {
  id: string;
  module: string;
  module_title: string;
  lesson_no: number;
  title: string | null;
  content: string | null;
  video_url: string | null;
}

// ── Module Docs ───────────────────────────────────────────
function DocsTab() {
  return (
    <HubCrud<Doc>
      queryKey={["admin-module-docs"]}
      endpoint="/module-documents/"
      titleFallback="Module Documents"
      emptyTitle="No documents yet"
      emptyMessage="Attach documents to a module."
      emptyActionLabel="+ New Document"
      createTitle="Create Document"
      editTitle="Edit Document"
      createLabel="+ New Document"
      searchPlaceholder="Search name..."
      searchFields={["name"]}
      filterFields={[{ key: "module", label: "All Modules", options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) }]}
      lookup={{ key: "modules", queryKey: ["admin-docs-modules"], endpoint: "/modules/" }}
      initialCreate={{ module: "", name: "", type: "", file_url: "" }}
      buildForm={(d) => ({ module: d.module || "", name: d.name || "", type: d.type || "", file_url: d.file_url || "" })}
      buildPayload={(f) => ({ module: f.module, name: f.name || null, type: f.type || null, file_url: f.file_url || null })}
      fields={(mode) => [
        { name: "module", label: "Module", type: "select", required: true, options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
        { name: "name", label: "Name", type: "text", span: "half" },
        { name: "type", label: "Type", type: "text", placeholder: "pdf, doc, etc.", span: "half" },
        { name: "file_url", label: "File URL", type: "text", placeholder: "https://..." },
      ]}
      columns={[
        { key: "name", header: "Name", render: (d) => <span className="text-sm font-semibold text-white">{d.name || "—"}</span> },
        { key: "type", header: "Type", render: (d) => <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">{d.type || "—"}</span> },
        { key: "file_url", header: "File", render: (d) => (d.file_url ? <a href={d.file_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-gold-500 hover:underline">Open</a> : <span className="text-sm text-gray-500">—</span>) },
      ]}
      detailTitle="Document Details"
      detailFields={(d) => [
        { label: "Name", value: d.name || "—" },
        { label: "Type", value: d.type || "—" },
        ...(d.file_url ? [{ label: "File URL", value: d.file_url }] : []),
      ]}
    />
  );
}
interface Doc {
  id: string;
  module: string;
  name: string | null;
  file_url: string | null;
  type: string | null;
}

// ── Module Exercises ──────────────────────────────────────
function ExercisesTab() {
  return (
    <HubCrud<Exercise>
      queryKey={["admin-module-exercises"]}
      endpoint="/module-exercises/"
      titleFallback="Module Exercises"
      emptyTitle="No exercises yet"
      emptyMessage="Assign exercises to a module."
      emptyActionLabel="+ New Exercise"
      createTitle="Create Exercise"
      editTitle="Edit Exercise"
      createLabel="+ New Exercise"
      searchPlaceholder="Search title..."
      searchFields={["title"]}
      filterFields={[{ key: "module", label: "All Modules", options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) }]}
      lookup={{ key: "modules", queryKey: ["admin-exercises-modules"], endpoint: "/modules/" }}
      initialCreate={{ module: "", title: "", instructions: "", due_date: "" }}
      buildForm={(e) => ({ module: e.module || "", title: e.title || "", instructions: e.instructions || "", due_date: e.due_date || "" })}
      buildPayload={(f) => ({ module: f.module, title: f.title, instructions: f.instructions || null, due_date: f.due_date || null })}
      fields={(mode) => [
        { name: "module", label: "Module", type: "select", required: true, options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "instructions", label: "Instructions", type: "textarea", rows: 3 },
        { name: "due_date", label: "Due Date", type: "date" },
      ]}
      columns={[
        { key: "title", header: "Title", render: (e) => <span className="text-sm font-semibold text-white">{e.title}</span> },
        { key: "due_date", header: "Due", render: (e) => <span className="text-sm text-gray-400">{formatDate(e.due_date)}</span> },
      ]}
      detailTitle="Exercise Details"
      detailFields={(e) => [
        { label: "Title", value: e.title },
        { label: "Due Date", value: formatDate(e.due_date) },
        ...(e.instructions ? [{ label: "Instructions", value: e.instructions }] : []),
      ]}
    />
  );
}
interface Exercise {
  id: string;
  module: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
}
