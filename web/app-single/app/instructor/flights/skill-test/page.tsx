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

interface SkillTest {
  id: string; student: string; student_name: string;
  examiner: string; examiner_name: string;
  authorized_by: string | null;
  scheduled_date: string; completed_date: string | null;
  result: string | null; report_url: string | null;
  observations: string | null; recommendations: string | null;
  status: string;
}

interface Student { id: string; full_name: string; student_number: string; }

const statusClass = (s: string) =>
  s === "authorized" ? "bg-blue-500/10 text-blue-400" :
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

export default function SkillTestsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // Authorize form state
  const [showAuthorizeForm, setShowAuthorizeForm] = useState(false);
  const [authorizeTest, setAuthorizeTest] = useState<SkillTest | null>(null);
  const [authorizeForm, setAuthorizeForm] = useState({ authorized_by: "" });
  const [authorizing, setAuthorizing] = useState(false);

  // Complete form state
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeTest, setCompleteTest] = useState<SkillTest | null>(null);
  const [completeForm, setCompleteForm] = useState({
    result: "", observations: "", recommendations: "",
  });
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [authLoading, isAuthenticated, router]);

  const fetchData = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/skill-tests/")
      .then(data => { setTests((data as any).results || []); setError(null); })
      .catch(err => { console.error("Failed to load:", err); setError(t("instructor.failedToLoadTests", "Failed to load skill tests.")); })
      .finally(() => setLoading(false));
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

  const openAuthorize = (test: SkillTest) => {
    setAuthorizeTest(test);
    setAuthorizeForm({ authorized_by: "" });
    setShowAuthorizeForm(true);
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthorizing(true);
    if (!authorizeTest) return;
    try {
      await api.post(`/skill-tests/${authorizeTest.id}/authorize/`, authorizeForm);
      setShowAuthorizeForm(false);
      setAuthorizeTest(null);
      showToast("success", t("instructor.testAuthorized", "Skill test authorized"));
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || t("instructor.failedToAuthorize", "Failed to authorize"));
    } finally { setAuthorizing(false); }
  };

  const openComplete = (test: SkillTest) => {
    setCompleteTest(test);
    setCompleteForm({ result: "", observations: "", recommendations: "" });
    setShowCompleteForm(true);
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault(); setCompleting(true);
    if (!completeTest) return;
    try {
      const body: any = {};
      if (completeForm.result) body.result = completeForm.result;
      if (completeForm.observations) body.observations = completeForm.observations;
      if (completeForm.recommendations) body.recommendations = completeForm.recommendations;
      await api.post(`/skill-tests/${completeTest.id}/complete/`, body);
      setShowCompleteForm(false);
      setCompleteTest(null);
      if (completeForm.result === "passed") {
        showToast("success", t("instructor.testCompletedWithCert", "Skill test completed - Certificate will be generated"));
      } else {
        showToast("success", t("instructor.testCompleted", "Skill test completed"));
      }
      fetchData();
    } catch (err: any) {
      showToast("error", err.message || t("instructor.failedToComplete", "Failed to complete"));
    } finally { setCompleting(false); }
  };

  const filtered = useMemo(() => {
    let result = tests;
    if (filterValues.status) result = result.filter(t => t.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(t => t.student_name?.toLowerCase().includes(q));
    }
    return result;
  }, [tests, filterValues, searchValue]);

  const filters: FilterOption[] = [
    { key: "status", label: t("common.allStatuses", "All Statuses"), options: [
      { value: "authorized", label: t("common.authorized", "Authorized") },
      { value: "completed", label: t("common.completed", "Completed") },
    ]},
  ];

  const columns: Column<SkillTest>[] = useMemo(() => [
    { key: "student_name", header: t("common.student", "Student") },
    { key: "examiner_name", header: t("common.examiner", "Examiner") },
    { key: "scheduled_date", header: t("common.scheduled", "Scheduled"), render: (t) => (
      <span className="text-sm text-gray-400">{t.scheduled_date?.slice(0, 10)}</span>
    )},
    { key: "status", header: t("common.status", "Status"), render: (t) => (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(t.status)}`}>{t.status}</span>
    )},
    { key: "result", header: t("common.result", "Result"), render: (t) => (
      <span className={`text-sm ${t.result === "passed" ? "text-green-400" : t.result === "failed" ? "text-red-400" : "text-gray-400"}`}>
        {t.result || "-"}
      </span>
    )},
    { key: "completed_date", header: t("common.completed", "Completed"), render: (t) => (
      <span className="text-sm text-gray-400">{t.completed_date?.slice(0, 10) || "-"}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (test) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {test.status === "authorized" && !test.result && (
          <>
            <button onClick={() => openAuthorize(test)}
              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20">
              {t("instructor.authorize", "Authorize")}
            </button>
            <button onClick={() => openComplete(test)}
              className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">
              {t("instructor.complete", "Complete")}
            </button>
          </>
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
              <h1 className="text-lg font-bold text-white">{t("instructor.skillTests", "Skill Tests")}</h1>
              <button onClick={() => router.push("/instructor/flights")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Flights")}</button>
            </div>
          </div>
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

        {/* Authorize Form Modal */}
        <ModalForm
          open={showAuthorizeForm}
          onClose={() => setShowAuthorizeForm(false)}
          title={`${t("instructor.authorizeTestTitle", "Authorize Test")} - ${authorizeTest?.student_name || ""}`}
          footer={
            <button
              type="submit"
              form="authorize-form"
              disabled={authorizing}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm"
            >
              {authorizing ? t("instructor.authorizing", "Authorizing...") : t("instructor.confirmAuthorization", "Confirm Authorization")}
            </button>
          }
        >
          <form id="authorize-form" onSubmit={handleAuthorize}>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">{t("instructor.authorizeDescription", "You are about to authorize this skill test. Select the authorizing instructor:")}</p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.authorizedBy", "Authorized By")}</label>
                <select value={authorizeForm.authorized_by}
                  onChange={e => setAuthorizeForm({...authorizeForm, authorized_by: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("instructor.selectInstructor", "Select instructor...")}</option>
                  {instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            </div>
          </form>
        </ModalForm>

        {/* Complete Form Modal */}
        <ModalForm
          open={showCompleteForm}
          onClose={() => setShowCompleteForm(false)}
          title={`${t("instructor.completeTestTitle", "Complete Test")} - ${completeTest?.student_name || ""}`}
          footer={
            <button
              type="submit"
              form="complete-form"
              disabled={completing}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm"
            >
              {completing ? t("instructor.submitting", "Submitting...") : t("instructor.completeTest", "Complete Test")}
            </button>
          }
        >
          <form id="complete-form" onSubmit={handleComplete}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.result", "Result")}</label>
                <select value={completeForm.result} onChange={e => setCompleteForm({...completeForm, result: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("common.selectResult", "Select result...")}</option>
                  <option value="passed">{t("common.passed", "Passed")}</option>
                  <option value="failed">{t("common.failed", "Failed")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.observations", "Observations")}</label>
                <textarea value={completeForm.observations}
                  onChange={e => setCompleteForm({...completeForm, observations: e.target.value})}
                  rows={3} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("common.recommendations", "Recommendations")}</label>
                <textarea value={completeForm.recommendations}
                  onChange={e => setCompleteForm({...completeForm, recommendations: e.target.value})}
                  rows={3} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              {completeForm.result === "passed" && (
                <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                  {t("instructor.certificateNote", "A certificate will be automatically generated for this student.")}
                </p>
              )}
            </div>
          </form>
        </ModalForm>

        {loading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={t("instructor.noTestsFound", "No skill tests found.")} title={tests.length === 0 ? t("instructor.noTestsYet", "No skill tests yet") : t("instructor.noMatchingTests", "No matching tests")} />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}
      </main>
    </div>
  );
}
