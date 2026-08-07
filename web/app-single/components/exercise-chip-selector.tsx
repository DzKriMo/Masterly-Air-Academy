"use client";

import { useState, useEffect, useMemo } from "react";
import { api, withFullLimit } from "@/lib/api";
import { useTranslation } from "@/lib/use-translation";

interface Exercise {
  id: string;
  code: string;
  title: string;
  title_ar: string | null;
  title_fr: string | null;
  category: string;
  program: string | null;
  is_active: boolean;
  order: number;
}

interface Props {
  selected: string[];
  onChange: (exercises: string[]) => void;
  placeholder?: string;
}

const CAT_KEYS: Record<string, string> = {
  maneuver: "exercise.maneuver",
  procedure: "exercise.procedure",
  emergency: "exercise.emergency",
  navigation: "exercise.navigation",
  other: "exercise.other",
};

const CAT_COLORS: Record<string, string> = {
  maneuver: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  procedure: "bg-green-500/10 text-green-400 border-green-500/30",
  emergency: "bg-red-500/10 text-red-400 border-red-500/30",
  navigation: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  other: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export function ExerciseChipSelector({ selected, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [custom, setCustom] = useState("");
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    api.get<any>(withFullLimit("/flight-exercises/?is_active=true"))
      .then(data => setExercises((data as any).results || []))
      .catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Exercise[]> = {};
    for (const e of exercises) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    }
    return map;
  }, [exercises]);

  const isSelected = (ex: Exercise) => selected.includes(ex.title);

  const toggle = (ex: Exercise) => {
    if (isSelected(ex)) {
      onChange(selected.filter(s => s !== ex.title));
    } else {
      onChange([...selected, ex.title]);
    }
  };

  const addCustom = () => {
    const val = custom.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
      setCustom("");
    }
  };

  const removeSelected = (item: string) => {
    onChange(selected.filter(s => s !== item));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
        {selected.map((s, i) => {
          const ex = exercises.find(e => e.title === s);
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-lg border ${ex ? CAT_COLORS[ex.category] || "bg-gray-500/10 text-gray-400 border-gray-500/30" : "bg-navy-700 text-gray-300 border-navy-600"}`}
            >
              {s}
              <button type="button" onClick={() => removeSelected(s)} className="ml-0.5 hover:text-white opacity-60 hover:opacity-100">&times;</button>
            </span>
          );
        })}
        {selected.length === 0 && (
          <span className="text-sm text-gray-500 py-1">{placeholder || t("exercise.selectPlaceholder", "Select exercises...")}</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowBank(!showBank)}
          className="px-3 py-1.5 text-xs bg-navy-700 border border-navy-600 rounded-lg text-gray-300 hover:text-white hover:border-gold-500/30"
        >
          {showBank ? t("exercise.hideBank", "Hide exercise bank") : t("exercise.browseBank", "Browse exercise bank")}
        </button>
        <div className="flex-1 flex gap-1">
          <input
            type="text"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder={t("exercise.customPlaceholder", "Type custom exercise...")}
            className="flex-1 px-3 py-1.5 text-sm bg-navy-900 border border-navy-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="px-3 py-1.5 text-xs bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg"
          >
            {t("common.add")}
          </button>
        </div>
      </div>

      {showBank && (
        <div className="bg-navy-900 border border-navy-700 rounded-lg p-3 max-h-64 overflow-y-auto space-y-3">
          {Object.entries(grouped).map(([cat, exs]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{t(CAT_KEYS[cat] ?? cat)}</p>
              <div className="flex flex-wrap gap-1.5">
                {exs.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggle(ex)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${isSelected(ex) ? `${CAT_COLORS[ex.category] || ""} border-current` : "bg-navy-800 border-navy-600 text-gray-400 hover:text-white hover:border-navy-500"}`}
                  >
                    {ex.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">{t("exercise.emptyBank", "No exercises in the bank yet.")}</p>
          )}
        </div>
      )}
    </div>
  );
}
