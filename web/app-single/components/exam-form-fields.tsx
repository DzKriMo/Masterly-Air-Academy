"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { fmtLabel, PROGRAMS, EXAM_TYPES as TYPES, EXAM_STATUSES as STATUSES } from "@/lib/format-utils";

export interface Subject {
  id: string;
  code: string;
  title_en: string;
}

export interface QuestionItem {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
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
  question_ids: string[];
}

interface ExamFormFieldsProps {
  form: ExamFormData;
  set: (key: keyof ExamFormData, value: any) => void;
  subjects: Subject[];
  showTranslations?: boolean;
}

const TYPE_BADGES: Record<string, string> = {
  mcq: "bg-blue-500/10 text-blue-400",
  true_false: "bg-purple-500/10 text-purple-400",
  short_answer: "bg-amber-500/10 text-amber-400",
  essay: "bg-red-500/10 text-red-400",
  matching: "bg-cyan-500/10 text-cyan-400",
  ordering: "bg-green-500/10 text-green-400",
  case_study: "bg-pink-500/10 text-pink-400",
};

export function ExamFormFields({ form, set, subjects, showTranslations }: ExamFormFieldsProps) {
  const [availableQuestions, setAvailableQuestions] = useState<QuestionItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  useEffect(() => {
    if (!form.subject) {
      setAvailableQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    api.get<any>(`/question-bank/?subject=${form.subject}&limit=500`)
      .then((d: any) => {
        setAvailableQuestions((d?.results || d || []));
      })
      .catch(() => setAvailableQuestions([]))
      .finally(() => setQuestionsLoading(false));
  }, [form.subject]);

  const toggleQuestion = (qid: string) => {
    const current = form.question_ids || [];
    const next = current.includes(qid)
      ? current.filter((id: string) => id !== qid)
      : [...current, qid];
    set("question_ids", next);
  };

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
          <select value={form.subject} onChange={(e) => { set("subject", e.target.value); set("question_ids", []); }}
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

      {form.subject && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Select Questions ({(form.question_ids || []).length} selected)
            <span className="text-xs text-gray-500 ml-2">— leave empty for random from subject</span>
          </label>
          {questionsLoading ? (
            <div className="text-sm text-gray-500 py-2">Loading questions...</div>
          ) : availableQuestions.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">No questions in this subject's bank.</div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-navy-700 rounded-lg divide-y divide-navy-700">
              {availableQuestions.map((q) => (
                <label key={q.id} className="flex items-center gap-3 px-3 py-2 hover:bg-navy-800 cursor-pointer">
                  <input type="checkbox" checked={(form.question_ids || []).includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="accent-gold-500" />
                  <span className="flex-1 text-sm text-white truncate">{q.question_text}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_BADGES[q.question_type] || "bg-gray-500/10 text-gray-400"}`}>
                    {fmtLabel(q.question_type)}
                  </span>
                  <span className="text-xs text-gray-500">{q.difficulty}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
