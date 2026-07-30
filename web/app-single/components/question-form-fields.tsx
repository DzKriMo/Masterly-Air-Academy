"use client";
import { useMemo } from "react";
import { fmtLabel } from "@/lib/format-utils";

export interface QuestionFormData {
  subject: string;
  module: string;
  question_text: string;
  question_type: string;
  options_text: string;
  correct_answer: string;
  explanation: string;
  reference: string;
  difficulty: string;
  program: string;
}

export const QUESTION_TYPES = [
  "mcq", "true_false", "short_answer", "essay", "matching", "ordering", "case_study",
];

export const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];

export const DIFFICULTIES = ["easy", "medium", "hard"];

interface QuestionFormFieldsProps {
  form: QuestionFormData;
  onChange: (form: QuestionFormData) => void;
  subjects: { id: string; title_en?: string; code?: string }[];
  modules: { id: string; subject: string; title?: string }[];
  error?: string;
}

export function QuestionFormFields({ form, onChange, subjects, modules, error }: QuestionFormFieldsProps) {
  const filteredModules = useMemo(() => {
    if (!form.subject) return modules;
    return modules.filter((m) => m.subject === form.subject);
  }, [modules, form.subject]);

  const set = (key: keyof QuestionFormData, value: string) => onChange({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
      )}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Question Text <span className="text-red-400">*</span>
        </label>
        <textarea value={form.question_text} onChange={(e) => set("question_text", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
          placeholder="Enter the question text..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Type <span className="text-red-400">*</span></label>
          <select value={form.question_type} onChange={(e) => {
            const qt = e.target.value;
            set("question_type", qt);
            if (qt === "true_false") set("options_text", "True\nFalse");
          }}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
            {QUESTION_TYPES.map((qt) => (
              <option key={qt} value={qt}>{fmtLabel(qt)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Program</label>
          <select value={form.program} onChange={(e) => set("program", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
            <option value="">All Programs</option>
            {PROGRAMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Subject</label>
          <select value={form.subject} onChange={(e) => { set("subject", e.target.value); set("module", ""); }}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
            <option value="">No subject</option>
            {subjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.title_en || s.code}</option>
            ))}
          </select>
        </div>
      </div>
      {form.subject && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Module</label>
          <select value={form.module} onChange={(e) => set("module", e.target.value)}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
            <option value="">No module</option>
            {filteredModules.map((m: any) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
      )}
      {(form.question_type === "mcq" || form.question_type === "true_false") && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Options (one per line)</label>
          <textarea value={form.options_text} onChange={(e) => set("options_text", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none font-mono text-sm"
            placeholder="A. First option&#10;B. Second option&#10;C. Third option&#10;D. Fourth option" />
        </div>
      )}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Correct Answer <span className="text-red-400">*</span>
        </label>
        <input type="text" value={form.correct_answer} onChange={(e) => set("correct_answer", e.target.value)}
          className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          placeholder={form.question_type === "true_false" ? "True or False" : "The correct answer..."} />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Explanation</label>
        <textarea value={form.explanation} onChange={(e) => set("explanation", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
          placeholder="Explain why this answer is correct..." />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Reference</label>
        <input type="text" value={form.reference} onChange={(e) => set("reference", e.target.value)}
          className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          placeholder="e.g. PPL Navigation Manual Ch. 3" />
      </div>
    </div>
  );
}
