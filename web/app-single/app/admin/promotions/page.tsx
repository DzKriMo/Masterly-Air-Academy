"use client";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HubCrud } from "@/components/hub-crud";
import { fmtLabel, formatDate, todayLocal } from "@/lib/format-utils";

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];
const PROMO_STATUSES = ["in_progress", "graduated", "archived"];

const PROGRAM_COLORS: Record<string, string> = {
  PPL: "bg-blue-500/10 text-blue-400",
  CPL: "bg-green-500/10 text-green-400",
  IR: "bg-purple-500/10 text-purple-400",
  MEP: "bg-amber-500/10 text-amber-400",
  MCC: "bg-cyan-500/10 text-cyan-400",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-green-500/10 text-green-400",
  graduated: "bg-blue-500/10 text-blue-400",
  archived: "bg-gray-500/10 text-gray-400",
};

interface Promotion {
  id: string;
  code: string;
  program: string;
  program_name?: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  main_instructor: string | null;
  student_count?: number;
}

export default function AdminPromotionsPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Promotions"
        backHref="/admin/dashboard"
        backLabel="Back to Dashboard"
      />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <HubCrud<Promotion>
          queryKey={["admin-promotions"]}
          endpoint="/promotions/"
          titleFallback="Promotions"
          emptyTitle="No promotions yet"
          emptyMessage="Promotions group students into cohorts (e.g. PPL-2026-A)."
          emptyActionLabel="+ New Promotion"
          createTitle="New Promotion"
          editTitle="Edit Promotion"
          createLabel="+ New Promotion"
          searchPlaceholder="Search code or name..."
          searchFields={["code", "name"]}
          filterFields={[
            { key: "program", label: "All Programs", options: PROGRAMS.map((p) => ({ value: p, label: p })) },
            { key: "status", label: "All Statuses", options: PROMO_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
          ]}
          lookups={[
            { key: "instructors", queryKey: ["admin-promotions-instructors"], endpoint: "/flight-instructors/" },
          ]}
          initialCreate={{ code: "", program: "PPL", name: "", start_date: todayLocal(), end_date: "", status: "in_progress", main_instructor: "" }}
          buildForm={(p) => ({ code: p.code, program: p.program, name: p.name, start_date: p.start_date, end_date: p.end_date || "", status: p.status, main_instructor: p.main_instructor || "" })}
          buildPayload={(f) => ({
            code: f.code.trim(),
            program: f.program,
            name: f.name.trim(),
            start_date: f.start_date,
            end_date: f.end_date || null,
            status: f.status,
            main_instructor: f.main_instructor || null,
          })}
          fields={(mode) => [
            { name: "code", label: "Code", type: "text", required: true, mono: true, placeholder: "e.g. PPL-2026-A", span: "half" },
            { name: "program", label: "Program", type: "select", required: true, options: PROGRAMS.map((p) => ({ value: p, label: p })), span: "half" },
            { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. PPL 2026 A" },
            { name: "start_date", label: "Start Date", type: "date", required: true, span: "half" },
            { name: "end_date", label: "End Date", type: "date", span: "half" },
            { name: "status", label: "Status", type: "select", options: PROMO_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
            { name: "main_instructor", label: "Main Instructor", type: "select", placeholder: "None", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: i.name || `${i.first_name} ${i.last_name}`.trim() })) },
          ]}
          columns={[
            { key: "code", header: "Code", render: (p) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">{p.code}</span> },
            { key: "name", header: "Name", render: (p) => <span className="text-sm font-semibold text-white">{p.name}</span> },
            { key: "program", header: "Program", render: (p) => <span className={`text-xs px-2 py-0.5 rounded ${PROGRAM_COLORS[p.program] || "bg-gray-500/10 text-gray-400"}`}>{p.program}</span> },
            { key: "status", header: "Status", render: (p) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(p.status)}</span> },
            { key: "start_date", header: "Start", render: (p) => <span className="text-sm text-gray-400">{formatDate(p.start_date)}</span> },
            { key: "student_count", header: "Students", render: (p) => <span className="text-sm text-gray-300">{p.student_count ?? 0}</span> },
          ]}
          detailTitle="Promotion Details"
          detailFields={(p) => [
            { label: "Code", value: p.code },
            { label: "Name", value: p.name },
            { label: "Program", value: p.program_name || p.program },
            { label: "Status", value: fmtLabel(p.status) },
            { label: "Start Date", value: formatDate(p.start_date) },
            { label: "End Date", value: formatDate(p.end_date) },
            { label: "Students", value: p.student_count != null ? String(p.student_count) : "—" },
          ]}
        />
      </main>
    </div>
  );
}
