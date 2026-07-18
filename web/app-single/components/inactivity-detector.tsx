"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";

const TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 60 * 1000; // Show warning 1 minute before timeout

export function InactivityDetector() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const resetTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (showWarning) setShowWarning(false);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
    }, TIMEOUT - WARNING_BEFORE);

    timerRef.current = setTimeout(() => {
      handleLogout();
    }, TIMEOUT);
  };

  const handleLogout = async () => {
    setShowWarning(false);
    await logout();
    router.push("/login");
  };

  // Countdown ticker
  useEffect(() => {
    if (!showWarning) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showWarning]);

  // Activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimers));

    resetTimers(); // Start timer on mount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimers));
    };
  }, [isAuthenticated]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          {t("inactivity.title", "Still there?")}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {t("inactivity.message", "You will be logged out due to inactivity in")}{" "}
          <span className="text-gold-500 font-bold">{countdown}s</span>
        </p>
        <button
          onClick={() => {
            setShowWarning(false);
            resetTimers();
          }}
          className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors"
        >
          {t("inactivity.keepWorking", "I'm still here")}
        </button>
      </div>
    </div>
  );
}
