import { fmtLabel, PROGRAMS, EXAM_TYPES as TYPES, EXAM_STATUSES as STATUSES } from "@/lib/format-utils";

export interface Subject {
  id: string;
  code: string;
  title_en: string;
}

export interface ExamFormData {
  code: string;
  title: string;
  title_ar?: string;
  title_fr?: string;
  subject: string;
  program: string;
  type: string;
  duration: string;
  question_count: string;
  passing_grade: string;
  max_attempts: string;
  status: string;
  open_date: string;
  close_date: string;
}

interface ExamFormFieldsProps {
  form: ExamFormData;
  set: (key: keyof ExamFormData, value: string) => void;
  subjects: Subject[];
  showTranslations?: boolean;
}

export function ExamFormFields({ form, set, subjects, showTranslations }: ExamFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Code *</label>
          <input type="text" value={form.code} onChange={(e) => set("code", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm"
            placeholder="e.g. PPL-THEORY-001" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Program</label>
          <select value={form.program} onChange={(e) => set("program", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
            {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Title</label>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
          className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm"
          placeholder="e.g. PPL Theory Exam 1" />
      </div>
      {showTranslations && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title (Arabic)</label>
            <input type="text" value={form.title_ar || ""} onChange={(e) => set("title_ar", e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title (French)</label>
            <input type="text" value={form.title_fr || ""} onChange={(e) => set("title_fr", e.target.value)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Subject</label>
          <select value={form.subject} onChange={(e) => set("subject", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
            <option value="">None</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.code} - {s.title_en}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{fmtLabel(t)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Duration (min) *</label>
          <input type="number" min="1" value={form.duration} onChange={(e) => set("duration", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Question Count</label>
          <input type="number" min="1" value={form.question_count} onChange={(e) => set("question_count", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Passing Grade (%)</label>
          <input type="number" min="0" max="100" value={form.passing_grade} onChange={(e) => set("passing_grade", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Attempts</label>
          <input type="number" min="1" value={form.max_attempts} onChange={(e) => set("max_attempts", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{fmtLabel(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Open Date</label>
          <input type="datetime-local" value={form.open_date} onChange={(e) => set("open_date", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Close Date</label>
          <input type="datetime-local" value={form.close_date} onChange={(e) => set("close_date", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
        </div>
      </div>
    </div>
  );
}
