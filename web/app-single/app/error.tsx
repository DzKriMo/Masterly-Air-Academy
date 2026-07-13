"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/use-translation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">
          <span className="text-red-500 font-bold">!</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t("common.error") || "Something went wrong"}
        </h1>
        <p className="text-gray-400 mb-6">
          {error.message || t("common.unexpectedError") || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gold-500 text-navy-900 rounded-lg font-medium hover:bg-gold-400 transition-colors"
        >
          {t("common.tryAgain") || "Try Again"}
        </button>
      </div>
    </div>
  );
}
