"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useTranslation } from "@/lib/use-translation";

interface MedicalCert {
  id: string;
  issue_date: string;
  expiry_date: string;
  issuer: string;
  status: string;
  file_url: string;
}

export default function MedicalPage() {
  const { t } = useTranslation();
  const { data: certs = [], isLoading, error, refetch } = useQuery<MedicalCert[]>({
    queryKey: ['medical-certs'],
    queryFn: async () => {
      const d: any = await api.get("/medical-certificates/");
      return d?.results || d || [];
    },
  });

  const statusColor = (s: string) =>
    s === 'valid' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
    s === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
    'bg-gray-500/10 text-gray-400 border-gray-500/30';

  const daysUntil = (date: string) => {
    const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return d;
  };

  return (
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <h1 className="text-lg font-bold text-white">{t("student.medical", "Medical Certificates")}</h1>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <ErrorCard message={(error as any)?.message || "Failed to load"} onRetry={() => refetch()} />}
        {isLoading ? (
          <LoadingSkeleton type="detail" rows={3} />
        ) : certs.length === 0 ? (
          <EmptyState message={t("student.noMedicalCerts", "No medical certificates found.")} />
        ) : (
          <div className="space-y-4">
            {certs.map((cert: MedicalCert) => {
              const days = daysUntil(cert.expiry_date);
              return (
                <div key={cert.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">
                        {t("student.medicalCert", "Medical Certificate")} — {cert.issuer || t("student.unknown", "Unknown")}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {t("student.issued", "Issued")}: {new Date(cert.issue_date).toLocaleDateString()} — {t("student.expires", "Expires")}: {new Date(cert.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border ${statusColor(cert.status)}`}>
                      {cert.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-navy-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${days < 0 ? 'bg-red-500' : days < 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(0, Math.min(100, ((365 - Math.abs(days)) / 365) * 100))}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${days < 0 ? 'text-red-400' : days < 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {days < 0 ? t("student.expiredDays", `Expired ${Math.abs(days)}d ago`) : days === 0 ? t("student.expiresToday", "Expires today") : t("student.daysRemaining", `${days}d remaining`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
