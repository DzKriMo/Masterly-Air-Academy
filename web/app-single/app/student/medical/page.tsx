"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useTranslation } from "@/lib/use-translation";
import { ErrorCard } from "@/components/error-card";

export default function MedicalPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { data: certs=[], isLoading, refetch } = useQuery({
    queryKey: ['medical-certs'],
    queryFn: () => api.get("/students/").catch(() => ({results:[]})),
  });

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-5xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t("student.medical", "Medical Certificates")}</h1></div></nav>
    <main className="px-6 py-8">{error && <ErrorCard message={error} onRetry={() => refetch()} />}{isLoading?<LoadingSkeleton type="detail" rows={3} />:<div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><p className="text-gray-400 text-sm">{t("student.medicalDesc", "Medical certificate status is managed through your student profile. Contact the administration for details on your medical certificate validity and renewal.")}</p><p className="text-gray-500 text-xs mt-4">{t("student.medicalPlaceholder", "This page will display your medical certificate expiry date and renewal reminders when integrated with the student medical records system.")}</p></div>}</main></div>);
}
