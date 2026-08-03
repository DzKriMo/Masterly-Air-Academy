"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface Course {
  id: string;
  title: string;
  subject_code: string;
  subject: string;
  instructor_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  room_name: string | null;
  notes: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes: string;
}

interface Evaluation {
  id: string;
  grade: number | null;
  appreciation: string;
  module_validated: boolean;
  recommend_remedial: boolean;
  created_at: string;
}

const attendanceStatusClass = (s: string) =>
  s === "present" ? "bg-green-500/10 text-green-400" :
  s === "late" ? "bg-yellow-500/10 text-yellow-400" :
  s === "absent" ? "bg-red-500/10 text-red-400" :
  "bg-gray-500/10 text-gray-400";

const statusClass = (s: string) =>
  s === "scheduled" ? "bg-blue-500/10 text-blue-400" :
  s === "active" ? "bg-yellow-500/10 text-yellow-400" :
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

export default function StudentCourseDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useParams();
  const courseId = params.id as string;
  const { t } = useTranslation();
  const [course, setCourse] = useState<Course | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, authLoading, "/student/login");

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !courseId) return;
    setLoading(true);
    try {
      const [courseRes, attendanceRes, evaluationRes] = await Promise.all([
        api.get<any>(`/courses/${courseId}/`),
        api.get<any>(`/attendance/?course=${courseId}`),
        api.get<any>(`/ground-evaluations/?course=${courseId}`).catch(() => ({ results: [] })),
      ]);

      if (courseRes) setCourse(courseRes);

      const attendanceList = (attendanceRes as unknown as any).results || [];
      setAttendance(attendanceList);

      const evalResults = (evaluationRes as unknown as any).results || [];
      setEvaluation(evalResults.length > 0 ? evalResults[0] : null);

      setError(null);
    } catch (err: any) {
      console.error("Failed to load course details:", err);
      setError(err.message || "Failed to load course details.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 p-8">
        <LoadingSkeleton type="card" rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-900">
        <PageHeader title="" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <ErrorCard message={error} onRetry={loadData} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={course?.title || t("student.courseDetail", "Course Details")}
        backHref="/student/courses?tab=sessions"
        backLabel={t("student.backToCourses", "Back to Courses")}
        actions={
          <span className={`px-3 py-1 text-xs font-medium rounded ${statusClass(course?.status || "")}`}>
            {course?.status}
          </span>
        }
      />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Session Info */}
        {course && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.subject", "Subject")}</p>
                <p className="text-sm text-gold-500 font-medium mt-1">{course.subject_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.instructor", "Instructor")}</p>
                <p className="text-sm text-white mt-1">{course.instructor_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.schedule", "Schedule")}</p>
                <p className="text-sm text-white mt-1">{course.scheduled_date}</p>
                <p className="text-xs text-gray-400">{course.start_time?.slice(0, 5)} - {course.end_time?.slice(0, 5)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.room", "Room")}</p>
                <p className="text-sm text-white mt-1">{course.room_name || t("student.tbd", "TBD")}</p>
              </div>
            </div>
            {course.notes && (
              <div className="mt-4 pt-4 border-t border-navy-700">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("student.notes", "Notes")}</p>
                <p className="text-sm text-gray-300">{course.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Evaluation */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">{t("student.myEvaluation", "My Evaluation")}</h2>
          {evaluation ? (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t("common.score", "Score")}</p>
                  <p className={`text-2xl font-bold mt-1 ${evaluation.grade !== null && evaluation.grade >= 75 ? "text-green-400" : evaluation.grade !== null ? "text-red-400" : "text-gray-500"}`}>
                    {evaluation.grade !== null ? `${evaluation.grade}%` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.validated", "Validated")}</p>
                  <p className={`text-sm font-medium mt-1 ${evaluation.module_validated ? "text-green-400" : "text-gray-500"}`}>
                    {evaluation.module_validated ? t("common.yes", "Yes") : t("common.no", "No")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.remedial", "Remedial")}</p>
                  <p className={`text-sm font-medium mt-1 ${evaluation.recommend_remedial ? "text-yellow-400" : "text-gray-500"}`}>
                    {evaluation.recommend_remedial ? t("common.yes", "Yes") : t("common.no", "No")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t("student.dateEvaluated", "Date")}</p>
                  <p className="text-sm text-white mt-1">{new Date(evaluation.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {evaluation.appreciation && (
                <div className="mt-4 pt-4 border-t border-navy-700">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("student.feedback", "Feedback")}</p>
                  <p className="text-sm text-gray-300">{evaluation.appreciation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
              <p className="text-gray-500">{t("student.noEvaluation", "No evaluation yet for this course.")}</p>
            </div>
          )}
        </div>

        {/* Attendance */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">{t("student.myAttendance", "My Attendance")}</h2>
          {attendance.length === 0 ? (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
              <p className="text-gray-500">{t("student.noAttendance", "No attendance records yet.")}</p>
            </div>
          ) : (
            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("student.date", "Date")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("student.status", "Status")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("student.notes", "Notes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-b border-navy-700/50 last:border-0">
                      <td className="px-6 py-3 text-sm text-white">{record.date}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${attendanceStatusClass(record.status)}`}>
                          {t(`student.${record.status}`, record.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-400">{record.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}