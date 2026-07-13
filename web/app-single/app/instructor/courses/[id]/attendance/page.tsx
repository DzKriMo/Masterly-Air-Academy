"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";

interface Student {
  id: string;
  student: string;
  student_name: string;
  status: string;
}

interface AttendanceRow {
  student_id: string;
  student_name: string;
  status: string;
  notes: string;
}

export default function AttendancePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [authLoading, isAuthenticated, router]);

  const fetchStudents = () => {
    if (!isAuthenticated || !courseId) return;
    setLoading(true);
    api.get<any>(`/courses/${courseId}/students/`)
      .then(data => {
        const d = data as unknown as any;
        const list = Array.isArray(d) ? d : d.results || [];
        setStudents(list);
        setError(null);
        setAttendance(list.map((s: Student) => ({
          student_id: s.student || s.id,
          student_name: s.student_name,
          status: "present",
          notes: "",
        })));
      })
      .catch(err => {
        console.error("Failed to load students:", err);
        setError(t("instructor.failedToLoadStudents", "Failed to load students. Please try again."));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [isAuthenticated, courseId]);

  const toggleStatus = (idx: number) => {
    const updated = [...attendance];
    const order = ["present", "late", "absent", "excused_absence"];
    const currentIdx = order.indexOf(updated[idx].status);
    updated[idx].status = order[(currentIdx + 1) % order.length];
    setAttendance(updated);
  };

  const markAll = (status: string) => {
    setAttendance(attendance.map(a => ({ ...a, status })));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/courses/${courseId}/attendance/`, { course_id: courseId, date, records: attendance });
      showToast("success", t("instructor.attendanceSaved", "Attendance saved successfully"));
    } catch (err: any) {
      console.error("Failed to save attendance:", err);
      setError(t("instructor.failedToSaveAttendance", "Failed to save attendance. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) =>
    s === "present" ? "bg-green-500/20 text-green-400" :
    s === "late" ? "bg-yellow-500/20 text-yellow-400" :
    s === "absent" ? "bg-red-500/20 text-red-400" :
    "bg-gray-500/20 text-gray-400";

  if (loading) return (
    <div className="min-h-screen bg-navy-900 p-8">
      <LoadingSkeleton type="detail" rows={6} />
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t("instructor.attendance", "Take Attendance")}</h1>
              <button onClick={() => router.push("/instructor/courses")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Courses")}</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchStudents} />}

        {students.length === 0 && !loading ? (
          <EmptyState message={t("instructor.noStudentsEnrolled", "No students enrolled in this course.")} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{students.length} {t("instructor.studentsEnrolled", "students enrolled")}</h2>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="mt-2 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => markAll("present")} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded text-xs hover:bg-green-500/20">{t("instructor.allPresent", "All Present")}</button>
                <button onClick={() => markAll("absent")} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded text-xs hover:bg-red-500/20">{t("instructor.allAbsent", "All Absent")}</button>
                <button onClick={handleSubmit} disabled={saving}
                  className="px-6 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg text-sm transition-colors">
                  {saving ? t("common.loading", "Saving...") : t("instructor.saveAttendance", "Save Attendance")}
                </button>
                <a href={`/api/attendance/${courseId}/pdf/`} className="px-4 py-2 border border-navy-600 text-gray-400 rounded-lg text-sm hover:border-gold-500 hover:text-gold-500">{t("instructor.downloadPdf", "Download PDF")}</a>
              </div>
            </div>

            <div className="space-y-2">
              {attendance.map((row, idx) => (
                <div key={row.student_id}
                  className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-navy-600 transition-colors">
                  <span className="text-white font-medium">{row.student_name}</span>
                  <button onClick={() => toggleStatus(idx)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium min-w-[100px] text-center transition-colors ${statusColor(row.status)}`}>
                    {t(`instructor.status.${row.status}`, row.status.replace("_", " "))}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
