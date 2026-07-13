"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";

const ICOLORS = ["#c4943c", "#3b82f6", "#22c55e", "#ef4444"];

export default function InstructorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { data: courses=[], isLoading, error: queryError } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => api.get<any>("/courses/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const today = new Date().toISOString().split("T")[0];
  const todayCourses = courses.filter((c:any) => c.scheduled_date === today);

  const statusData = Object.entries(
    courses.reduce((acc:any, c:any) => { acc[c.status] = (acc[c.status]||0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const subjectData = Object.entries(
    courses.reduce((acc:any, c:any) => { acc[c.subject_code||"N/A"] = (acc[c.subject_code||"N/A"]||0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">{t('instructor.dashboard')}</h1>
          <ExportButton exports={[
            { label: `${t('instructor.totalCourses')} PDF`, url: "/courses/export/pdf/", filename: "courses.pdf", type: "pdf" },
            { label: `${t('instructor.totalCourses')} Excel`, url: "/courses/export/excel/", filename: "courses.xlsx", type: "excel" },
          ]} />
        </div>
      </nav>
      <main className="px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t("dashboard_welcome")}, {user?.name?.split(" ")[0]||"Instructor"}</h2>
        <p className="text-gray-400 mb-8">{t('instructor.dashboardSubtitle')}</p>

        {queryError && <ErrorCard message={queryError.message} />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Stat title={t('instructor.totalCourses')} value={courses.length}/>
          <Stat title={t('instructor.todaysCourses')} value={todayCourses.length}/>
          <Stat title={t('instructor.activeStudents')} value="—"/>
        </div>

        {courses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('instructor.coursesByStatus')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/>
                  <YAxis stroke="#94a3b8" fontSize={12}/>
                  <Tooltip/>
                  <Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('instructor.coursesBySubject')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}:any)=>`${name}: ${value}`}>
                    {subjectData.map((_:any,i:number)=><Cell key={i} fill={ICOLORS[i%ICOLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{t('instructor.todaySchedule')}</h3>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
          {isLoading ? (
            <LoadingSkeleton type="table" rows={3} />
          ) : todayCourses.length === 0 ? (
            <EmptyState message={t('instructor.noCoursesToday')} />
          ) : (
            <div className="space-y-3">
              {todayCourses.map((c:any) => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700">
                  <div>
                    <p className="text-white font-medium">{c.title}</p>
                    <p className="text-sm text-gray-400">{c.subject_code} | {c.room_name||t("instructor.noRoom")} | {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${c.status==="scheduled"?"bg-blue-500/10 text-blue-400":c.status==="completed"?"bg-green-500/10 text-green-400":"bg-gray-500/10 text-gray-400"}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({title,value}:{title:string;value:number|string}) {
  return <div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{title}</p></div>;
}
