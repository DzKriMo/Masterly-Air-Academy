"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilityPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useAuthGuard(isAuthenticated, authLoading);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>("/instructor-availability/?page=1").catch(() => ({ results: [] })),
      api.get<any>("/flight-instructors/").catch(() => ({ results: [] })),
    ]).then(([availRes, instructorRes]) => {
      const avail = (availRes as any)?.results || [];
      const instructors = (instructorRes as any)?.results || [];
      const instructorMap = new Map(instructors.map((i: any) => [i.id, `${i.first_name} ${i.last_name}`]));
      setAvailabilities(avail.map((a: any) => ({ ...a, instructor_name: instructorMap.get(a.instructor) || a.instructor })));
      setHasMore(!!(availRes as any)?.next);
      setPage(1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAuthenticated]);

  const loadMore = () => {
    Promise.all([
      api.get<any>(`/instructor-availability/?page=${page + 1}`).catch(() => ({ results: [] })),
      api.get<any>("/flight-instructors/").catch(() => ({ results: [] })),
    ]).then(([availRes, instructorRes]) => {
      const avail = (availRes as any)?.results || [];
      const instructors = (instructorRes as any)?.results || [];
      const instructorMap = new Map(instructors.map((i: any) => [i.id, `${i.first_name} ${i.last_name}`]));
      setAvailabilities(prev => [...prev, ...avail.map((a: any) => ({ ...a, instructor_name: instructorMap.get(a.instructor) || a.instructor }))]);
      setHasMore(!!(availRes as any)?.next);
      setPage(p => p + 1);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-lg font-bold text-white mb-6">{t("scheduler.availability")}</h1>

        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : availabilities.length === 0 ? (
          <EmptyState message={t("common.noData", "No availability records found")} />
        ) : (
          <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Instructor</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Day</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Start</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">End</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {availabilities.map((a: any) => (
                  <tr key={a.id} className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors">
                    <td className="px-4 py-3 text-white">{a.instructor_name}</td>
                    <td className="px-4 py-3 text-gray-400">{DAYS[a.day_of_week] || a.day_of_week}</td>
                    <td className="px-4 py-3 text-gray-400">{a.start_time?.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-gray-400">{a.end_time?.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${a.is_available ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {a.is_available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && (
          <div className="mt-4 text-center">
            <button onClick={loadMore} className="px-4 py-2 text-sm text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-colors">
              {t('common.loadMore', 'Load more')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
