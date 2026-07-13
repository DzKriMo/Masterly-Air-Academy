"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { ErrorCard } from "@/components/error-card";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function EvaluateFlightPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const flightId = params?.id as string;
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    flight_duration: "", exercises_completed: "", competencies_acquired: "",
    difficulties: "", observations: "", recommendations: "", grade: "", result: "", pedagogical_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSoloConfirm, setShowSoloConfirm] = useState(false);
  const [soloAuthorizing, setSoloAuthorizing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const body = {
        ...form,
        flight_duration: parseFloat(form.flight_duration),
        grade: parseFloat(form.grade),
        exercises_completed: form.exercises_completed.split(",").map(s => s.trim()).filter(Boolean),
        competencies_acquired: form.competencies_acquired.split(",").map(s => s.trim()).filter(Boolean),
      };
      await api.post(`/flight-lessons/${flightId}/evaluate/`, body);
      showToast("success", t("instructor.evaluationSubmitted", "Evaluation submitted successfully"));
      setTimeout(() => router.push("/instructor/flights"), 1500);
    } catch (err: any) {
      setError(err.message || t("common.failed", "Failed"));
    } finally { setSaving(false); }
  };

  const handleAuthorizeSolo = async () => {
    setSoloAuthorizing(true);
    try {
      await api.post(`/flight-lessons/${flightId}/authorize_solo/`);
      showToast("success", t("instructor.soloAuthorized", "Solo flight authorized"));
      setShowSoloConfirm(false);
    } catch (err: any) {
      showToast("error", err.message || t("instructor.failedToAuthorizeSolo", "Failed to authorize solo flight"));
    } finally {
      setSoloAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/logo.png" alt="MAA" width={110} height={110} />
          <div><h1 className="text-lg font-bold text-white">{t("instructor.evaluate", "Post-Flight Evaluation")}</h1>
            <button onClick={() => router.push("/instructor/flights")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Flights")}</button></div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} />}

        <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-white">{t("instructor.flightEvaluation", "Flight Evaluation")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.flightDuration", "Flight Duration (hours)")}</label><input type="number" step="0.1" value={form.flight_duration} onChange={e => setForm({...form, flight_duration: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.grade", "Grade (0-10)")}</label><input type="number" step="0.1" min="0" max="10" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.result", "Result")}</label><select value={form.result} onChange={e => setForm({...form, result: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white"><option value="">{t("instructor.select", "Select...")}</option><option value="passed">{t("instructor.passed", "Passed")}</option><option value="failed">{t("instructor.failed", "Failed")}</option><option value="partial">{t("instructor.partial", "Partial")}</option></select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.exercisesCompleted", "Exercises Completed (comma separated)")}</label><input value={form.exercises_completed} onChange={e => setForm({...form, exercises_completed: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" placeholder={t("instructor.exercisesPlaceholder", "e.g. Takeoff, Landing, Steep turns")} /></div>
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.competenciesAcquired", "Competencies Acquired")}</label><input value={form.competencies_acquired} onChange={e => setForm({...form, competencies_acquired: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" placeholder={t("instructor.competenciesPlaceholder", "e.g. Radio communication, Crosswind landing")} /></div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.difficultiesEncountered", "Difficulties Encountered")}</label><textarea value={form.difficulties} onChange={e => setForm({...form, difficulties: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.observations", "Observations")}</label><textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.recommendations", "Recommendations")}</label><textarea value={form.recommendations} onChange={e => setForm({...form, recommendations: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">{t("instructor.pedagogicalNote", "Pedagogical Note")}</label><textarea value={form.pedagogical_note} onChange={e => setForm({...form, pedagogical_note: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
          <button type="submit" disabled={saving} className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg">{saving ? t("common.loading", "Submitting...") : t("instructor.submitEvaluation", "Submit Evaluation")}</button>
        </form>

        {/* Solo Authorization Section */}
        {parseFloat(form.grade) >= 7 && parseFloat(form.flight_duration) > 0 && (
          <div className="mt-6 p-6 bg-navy-800 border border-gold-500/30 rounded-xl">
            <h3 className="text-lg font-bold text-gold-500 mb-2">{t("instructor.soloAuthorization", "Solo Flight Authorization")}</h3>
            <p className="text-sm text-gray-400 mb-4">{t("instructor.soloCriteriaMet", "This student meets the minimum criteria for solo flight authorization.")}</p>
            <button
              onClick={() => setShowSoloConfirm(true)}
              disabled={soloAuthorizing}
              className="px-6 py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg"
            >
              {t("instructor.authorizeSolo", "Authorize Solo Flight")}
            </button>
          </div>
        )}

        <ConfirmDialog
          open={showSoloConfirm}
          onClose={() => setShowSoloConfirm(false)}
          onConfirm={handleAuthorizeSolo}
          title={t("instructor.confirmSolo", "Confirm Solo Authorization")}
          message={t("instructor.confirmSoloMessage", "This authorizes the student to fly solo. Confirm?")}
          confirmLabel={t("instructor.authorize", "Authorize")}
          loading={soloAuthorizing}
        />
      </main>
    </div>
  );
}
