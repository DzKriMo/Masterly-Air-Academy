"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface Lesson {
  id: string;
  lesson_no: number;
  title: string;
  content: string;
}

interface Doc {
  id: string;
  name: string;
  file_url: string;
  type: string;
}

interface Exercise {
  id: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
}

interface ModuleData {
  module_id: string;
  module_title: string;
  lessons: Lesson[];
  documents: Doc[];
  exercises: Exercise[];
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
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

export default function StudentCourseDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { t } = useTranslation();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string>("");

  useAuthGuard(isAuthenticated, authLoading, "/student/login");

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !courseId) return;
    setLoading(true);
    try {
      const [coursesRes, materialsRes, attendanceRes, evaluationRes] = await Promise.all([
        api.get<any>(`/courses/?id=${courseId}`),
        api.get<any>(`/courses/${courseId}/materials/`),
        api.get<any>(`/attendance/?course=${courseId}`),
        api.get<any>(`/ground-evaluations/?course=${courseId}`).catch(() => ({ results: [] })),
      ]);

      const coursesList = (coursesRes as unknown as any).results || [];
      const found = coursesList.find((c: any) => c.id === courseId);
      if (found) setCourse(found);

      const materialsData = materialsRes as unknown as any;
      setModules(materialsData?.modules || []);

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
        backHref="/student/courses"
        backLabel={t("student.backToCourses", "Back to Courses")}
        actions={
          <span className={`px-3 py-1 text-xs font-medium rounded ${statusClass(course?.status || "")}`}>
            {course?.status}
          </span>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Course Info */}
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

        {/* Modules */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">{t("student.courseModules", "Course Modules")}</h2>
          {modules.length === 0 ? (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
              <p className="text-gray-500">{t("student.noModules", "No modules available for this course yet.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((mod) => (
                <div key={mod.module_id} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedModule(expandedModule === mod.module_id ? "" : mod.module_id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-navy-700/50 transition-colors"
                  >
                    <div>
                      <h3 className="text-white font-semibold">{mod.module_title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {mod.lessons.length} {t("student.lessons", "lessons")} | {mod.documents.length} {t("student.documents", "documents")}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedModule === mod.module_id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedModule === mod.module_id && (
                    <div className="border-t border-navy-700 p-5 space-y-4">
                      {/* Lessons */}
                      {mod.lessons.length > 0 && (
                        <div className="space-y-2">
                          {mod.lessons.map((lesson) => (
                            <div key={lesson.id} className="bg-navy-900 rounded-lg p-4 border border-navy-700">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white font-medium">
                                  {t("student.lesson", "Lesson")} {lesson.lesson_no}: {lesson.title || t("student.untitled", "Untitled")}
                                </span>
                                <a href={`/student/courses/${courseId}/lesson/${lesson.id}`}
                                  className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0">
                                  {t("student.openLesson", "Open Lesson")} →
                                </a>
                              </div>
                              {lesson.content && (
                                <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-3">{lesson.content}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Documents */}
                      {mod.documents.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t("student.resources", "Resources")}
                          </h4>
                          <div className="space-y-1">
                            {mod.documents.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between bg-navy-900 rounded-lg px-4 py-2 border border-navy-700">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm text-white">{doc.name || t("student.document", "Document")}</span>
                                  {doc.type && <span className="text-xs text-gray-500">{doc.type}</span>}
                                </div>
                                {doc.file_url && (
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-gold-500 hover:underline">
                                    {t("student.download", "Download")}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exercises */}
                      {mod.exercises.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t("student.exercises", "Exercises")}
                          </h4>
                          <div className="space-y-1">
                            {mod.exercises.map((ex) => (
                              <div key={ex.id} className="flex items-center justify-between bg-navy-900 rounded-lg px-4 py-2 border border-navy-700">
                                <div className="flex items-center gap-2 min-w-0">
                                  <svg className="w-4 h-4 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  <span className="text-sm text-white truncate">{ex.title}</span>
                                  {ex.due_date && <span className="text-xs text-gray-500 shrink-0">due {ex.due_date}</span>}
                                </div>
                                <a href={`/student/courses/${courseId}/exercise/${ex.id}`}
                                  className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 ml-2">
                                  {t("student.openExercise", "Open Exercise")} →
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
