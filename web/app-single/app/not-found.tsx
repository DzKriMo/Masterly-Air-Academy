"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/use-translation";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-gold-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t("common.pageNotFound") || "Page Not Found"}
        </h1>
        <p className="text-gray-400 mb-6">
          {t("common.pageNotFoundDesc") || "The page you are looking for does not exist or has been moved."}
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 transition-colors"
        >
          {t("common.backToDashboard") || "Back to Dashboard"}
        </Link>
      </div>
    </div>
  );
}
