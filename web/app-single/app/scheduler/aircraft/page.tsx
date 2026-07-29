"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";

export default function AircraftPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const STATUS_COLORS: Record<string, string> = {
    available: "text-green-400 bg-green-500/10",
    in_use: "text-blue-400 bg-blue-500/10",
    maintenance: "text-red-400 bg-red-500/10",
    retired: "text-gray-400 bg-gray-500/10",
  };

  useAuthGuard(isAuthenticated, authLoading);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<any>("/aircraft/").then(d => {
      setAircraft((d as any)?.results || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-lg font-bold text-white mb-6">{t("scheduler.aircraft")}</h1>

        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : aircraft.length === 0 ? (
          <EmptyState message={t("common.noData", "No aircraft found")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aircraft.map((a: any) => (
              <div key={a.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-lg">{a.registration}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "text-gray-400"}`}>
                    {a.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-400">{a.manufacturer} {a.model}</p>
                  <p className="text-gray-400">SN: {a.serial_number || "N/A"}</p>
                  <p className="text-gray-400">Airframe: <span className="text-white">{a.airframe_hours}h</span></p>
                  <p className="text-gray-400">Engine: <span className="text-white">{a.engine_hours}h</span></p>
                  {a.next_maintenance && (
                    <p className="text-gray-400">Next Mx: <span className="text-yellow-400">{a.next_maintenance?.slice(0, 10)}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
