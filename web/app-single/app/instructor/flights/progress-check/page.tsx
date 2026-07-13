"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar, FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface ProgressCheck {
  id: string; student: string; student_name: string;
  examiner: string; examiner_name: string;
  scheduled_date: string; completed_date: string | null;
  result: string | null; observations: string | null;
  recommendations: string | null; lessons_to_repeat: string[];
  status: string;
}

interface Student { id: string; full_name: string; student_number: string; }

const statusClass = (s: string) =>
  s === "scheduled" ? "bg-blue-500/10 text-blue-400" :
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

export default function ProgressChecksPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [checks, setChecks] = useState<ProgressCheck[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    student: "", examiner: "", scheduled_date: "",
  });
  const [scheduling, setScheduling] = useState(false);

  // Validate form state
  const [showValidateForm, setShowValidateForm] = useState(false);
  const [validateCheck, setValidateCheck] = useState<ProgressCheck | null>(null);
  const [validateForm, setValidateForm] = useState({
    result: "", observations: "", lessons_to_repeat: "",
  });
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>("/progress-checks/"),
      api.get<any>("/students/"),
    ])
      .then(([checksData, studentsData]) => {
        setChecks((checksData as any).results || []);
        setStudents((studentsData as any).results || []);
        setError(null);
      })
      .catch(err => { console.error("Failed to load:", err); setError(t("instructor.failedToLoadData", "Failed to load data.")); })
      .finally(() => setLoading(false));
    // Get instructors from flight lessons
    api.get<any>("/flight-lessons/")
      .then(data => {
        const lessons = (data as any).results || [];
        const unique: Record<string, any> = {};
        lessons.forEach((l: any) => {
          if (l.instructor && !unique[l.instructor]) {
            unique[l.instructor] = { id: l.instructor, name: l.instructor_name };
          }
        });
        setInstructors(Object.values(unique));
      })
      .catch(() => {});
  };

  useEffect(() => { fetchData(); }, [isAuthenticated]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault(); setScheduling(true); setError(null);
    try {
      await api.post("/progress-checks/schedule/", scheduleForm);
      setShowScheduleForm(false);
      setScheduleForm({ student: "", examiner: "", scheduled_date: "" });
      showToast("success", t("instructor.checkScheduled", "Progress check scheduled"));
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || t("instructor.failedToSchedule", "Failed to schedule"));
    } finally { setScheduling(false); }
  };

  const openValidate = (check: ProgressCheck) => {
    setValidateCheck(check);
    setValidateForm({ result: "", observations: "", lessons_to_repeat: "" });
    setShowValidateForm(true);
  };

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault(); setValidating(true);
    if (!validateCheck) return;
    try {
      const body: any = {};
      if (validateForm.result) body.result = validateForm.result;
      if (validateForm.observations) body.observations = validateForm.observations;
      if (validateForm.lessons_to_repeat) {
        body.lessons_to_repeat = validateForm.lessons_to_repeat.split(",").map(s => s.trim()).filter(Boolean);
      }
      await api.post(`/progress-checks/${validateCheck.id}/validate/`, body);
      setShowValidateForm(false);
      setValidateCheck(null);
      showToast("success", t("instructor.checkCompleted", "Progress check completed"));
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || t("instructor.failedToValidate", "Failed to validate"));
    } finally { setValidating(false); }
  };

  const filtered = useMemo(() => {
    let result = checks;
    if (filterValues.status) result = result.filter(c => c.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(c => c.student_name?.toLowerCase().includes(q));
    }
    return result;
  }, [checks, filterValues, searchValue]);

  const filters: FilterOption[] = [
    { key: "status", label: t("common.allStatuses", "All Statuses"), options: [
      { value: "scheduled", label: t("common.scheduled", "Scheduled") },
      { value: "completed", label: t("common.completed", "Completed") },
    ]},
  ];

  const columns: Column<ProgressCheck>[] = useMemo(() => [
    { key: "student_name", header: t("common.student", "Student") },
    { key: "examiner_name", header: t("common.examiner", "Examiner") },
    { key: "scheduled_date", header: t("common.scheduled", "Scheduled"), render: (c) => (
      <span className="text-sm text-gray-400">{c.scheduled_date?.slice(0, 10)}</span>
    )},
    { key: "status", header: t("common.status", "Status"), render: (c) => (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(c.status)}`}>{c.status}</span>
    )},
    { key: "result", header: t("common.result", "Result"), render: (c) => (
      <span className="text-sm">{c.result || "-"}</span>
    )},
    { key: "completed_date", header: t("common.completed", "Completed"), render: (c) => (
      <span className="text-sm text-gray-400">{c.completed_date?.slice(0, 10) || "-"}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (c) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {c.status === "scheduled" && (
          <button onClick={() => openValidate(c)}
            className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs hover:bg-green-500/20">
            {t("instructor.validate", "Validate")}
          </button>
        )}
      </div>
    )},
  ], [t]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t("instructor.progressChecks", "Progress Checks")}</h1>
              <button onClick={() => router.push("/instructor/flights")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Flights")}</button>
            </div>
          </div>
          <button onClick={() => setShowScheduleForm(true)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
            {t("instructor.scheduleCheck", "+ Schedule Check")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchData} />}

        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={t("instructor.searchStudents", "Search students...")}
        />

        {/* Schedule Form Modal */}
        <ModalForm
          open={showScheduleForm}
          onClose={() => setShowScheduleForm(false)}
          title={t("instructor.scheduleProgressCheck", "Schedule Progress Check")}
          footer={
            <button
              type="submit"
              form="schedule-form"
              disabled={scheduling}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm"
            >
              {scheduling ? t("instructor.scheduling", "Scheduling...") : t("instructor.scheduleCheckBtn", "Schedule Check")}
            </button>
          }
        >
          <form id="schedule-form" onSubmit={handleSchedule}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.student", "Student")}</label>
                <select value={scheduleForm.student} onChange={e => setScheduleForm({...scheduleForm, student: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("instructor.selectStudent", "Select student...")}</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.examiner", "Examiner")}</label>
                <select value={scheduleForm.examiner} onChange={e => setScheduleForm({...scheduleForm, examiner: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("instructor.selectExaminer", "Select examiner...")}</option>
                  {instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.dateTime", "Date & Time")}</label>
                <input type="datetime-local" value={scheduleForm.scheduled_date}
                  onChange={e => setScheduleForm({...scheduleForm, scheduled_date: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
            </div>
          </form>
        </ModalForm>

        {/* Validate Form Modal */}
        <ModalForm
          open={showValidateForm}
          onClose={() => setShowValidateForm(false)}
          title={`${t("instructor.validateCheckTitle", "Validate Check")} - ${validateCheck?.student_name || ""}`}
          footer={
            <button
              type="submit"
              form="validate-form"
              disabled={validating}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm"
            >
              {validating ? t("instructor.validating", "Validating...") : t("instructor.completeValidation", "Complete Validation")}
            </button>
          }
        >
          <form id="validate-form" onSubmit={handleValidate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.result", "Result")}</label>
                <select value={validateForm.result} onChange={e => setValidateForm({...validateForm, result: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("common.selectResult", "Select result...")}</option>
                  <option value="passed">{t("common.passed", "Passed")}</option>
                  <option value="failed">{t("common.failed", "Failed")}</option>
                  <option value="partial">{t("common.partial", "Partial")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.observations", "Observations")}</label>
                <textarea value={validateForm.observations}
                  onChange={e => setValidateForm({...validateForm, observations: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.lessonsToRepeat", "Lessons to Repeat (comma separated)")}</label>
                <input value={validateForm.lessons_to_repeat}
                  onChange={e => setValidateForm({...validateForm, lessons_to_repeat: e.target.value})}
                  placeholder={t("instructor.lessonsPlaceholder", "e.g. Steep turns, Emergency procedures")}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
            </div>
          </form>
        </ModalForm>

        {loading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState
            message={t("instructor.noChecksFound", "No progress checks found.")}
            title={checks.length === 0 ? t("instructor.noChecksYet", "No checks yet") : t("instructor.noMatchingChecks", "No matching checks")}
            action={checks.length === 0 ? { label: t("instructor.scheduleCheckBtn", "Schedule Check"), onClick: () => setShowScheduleForm(true) } : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}
      </main>
    </div>
  );
}
