"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "@/lib/use-translation";

interface CertData {
  id: string;
  certificate_number: string;
  title: string;
  type: string;
  program: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  student_name: string;
  qr_code: string | null;
}

export default function VerifyCertificatePage() {
  const { t } = useTranslation();
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number");
    if (!number) {
      setError(t("verify.noCertificateNumber", "No certificate number provided."));
      setLoading(false);
      return;
    }

    api.get(`/certificates/verify/?number=${encodeURIComponent(number)}`)
      .then((data: any) => {
        if (data.success !== false && data.valid !== false) {
          setCert(data.data?.certificate || data.certificate || data);
        } else {
          setError(data.message || t("verify.notFound", "Certificate not found."));
        }
      })
      .catch(() => setError(t("verify.failed", "Failed to verify certificate.")))
      .finally(() => setLoading(false));
  }, [t]);

  const verifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify-certificate?number=${cert?.certificate_number || ""}`
    : "";

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="MAA" width={80} height={80} className="mx-auto" />
          <h1 className="text-2xl font-bold text-white mt-4">{t("verify.title", "Certificate Verification")}</h1>
          <p className="text-gray-400 text-sm mt-1">Masterly Air Academy</p>
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t("verify.verifying", "Verifying...")}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">{t("verify.notFoundTitle", "Not Found")}</h2>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          ) : cert && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-green-400 text-sm font-medium">{t("verify.verified", "Verified")}</span>
                </div>
                <h2 className="text-xl font-bold text-white">{cert.title}</h2>
                <p className="text-gold-500 text-sm mt-1">{cert.program} {t("verify.program", "Program")}</p>
              </div>

              <div className="bg-navy-900 rounded-xl p-5 space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{t("verify.student", "Student")}</span>
                  <span className="text-white font-semibold">{cert.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{t("verify.certificateNo", "Certificate No")}</span>
                  <span className="text-gold-500 font-mono text-sm">{cert.certificate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{t("verify.issueDate", "Issue Date")}</span>
                  <span className="text-white">{cert.issue_date}</span>
                </div>
                {cert.expiry_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">{t("verify.expiryDate", "Expiry Date")}</span>
                    <span className="text-white">{cert.expiry_date}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">{t("verify.status", "Status")}</span>
                  <span className="text-green-400 font-medium">{cert.status}</span>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={verifyUrl} size={120} />
                </div>
              </div>

              <p className="text-center text-xs text-gray-500">
                {t("verify.authenticMessage", "This certificate was issued by Masterly Air Academy and is verified as authentic.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
