"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";

interface TvEvent {
  id: string;
  type: "flight" | "course" | "simulator";
  title: string;
  student: string | null;
  instructor: string;
  location: string | null;
  date: string;
  start: string | null;
  end: string | null;
  status: string;
}

type ViewMode = "daily" | "weekly" | "monthly";

const TYPE_META: Record<string, { dot: string; bar: string; text: string; label: string }> = {
  flight: { dot: "bg-blue-400", bar: "bg-blue-500", text: "text-blue-300", label: "bg-blue-500/15 text-blue-300 border border-blue-500/30" },
  course: { dot: "bg-gold-500", bar: "bg-gold-500", text: "text-gold-400", label: "bg-gold-500/15 text-gold-400 border border-gold-500/30" },
  simulator: { dot: "bg-emerald-400", bar: "bg-emerald-500", text: "text-emerald-300", label: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" },
};

const STATUS_BADGE: Record<string, { badge: string; label: string }> = {
  scheduled: { badge: "bg-white/10 text-gray-300 border border-white/15", label: "tv.scheduled" },
  in_progress: { badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30", label: "tv.inProgress" },
  completed: { badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30", label: "tv.completed" },
  cancelled: { badge: "bg-red-500/15 text-red-400 border border-red-500/30", label: "tv.cancelled" },
  postponed: { badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30", label: "tv.postponed" },
};

const STATUS_MUTED: Record<string, string> = {
  cancelled: "opacity-50 line-through",
  postponed: "opacity-60",
};

function fmtTime(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TVSchedulePage() {
  const { t, locale } = useTranslation();
  const [view, setView] = useState<ViewMode>("daily");
  const [events, setEvents] = useState<TvEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    document.body.classList.add("tv-kiosk");
    return () => document.body.classList.remove("tv-kiosk");
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setRefreshTick((n) => n + 1), 2 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const buildRange = useCallback((v: ViewMode): { from: string; to: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (v === "daily") {
      return { from: toISODate(today), to: toISODate(today) };
    }
    if (v === "weekly") {
      const end = new Date(today);
      end.setDate(today.getDate() + 6);
      return { from: toISODate(today), to: toISODate(end) };
    }
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toISODate(start), to: toISODate(end) };
  }, []);

  useEffect(() => {
    const r = buildRange(view);
    setRange(r);
    setLoading(true);
    fetch(`${api.getBaseUrl()}/api/schedule/tv/?from=${r.from}&to=${r.to}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((payload: any) => {
        const data = payload?.data ?? payload;
        setEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [view, buildRange, refreshTick]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("view");
    if (forced === "daily" || forced === "weekly" || forced === "monthly") {
      setView(forced);
      return;
    }
    const order: ViewMode[] = ["daily", "weekly", "monthly"];
    const iv = setInterval(() => {
      setView((prev) => order[(order.indexOf(prev) + 1) % order.length]);
    }, 45 * 1000);
    return () => clearInterval(iv);
  }, []);

  const daily = useMemo(() => events.filter((e) => e.date === range.from), [events, range.from]);
  const weekly = useMemo(() => events.slice().sort((a, b) => (a.date > b.date ? 1 : -1)), [events]);
  const monthly = useMemo(() => events.slice().sort((a, b) => (a.date > b.date ? 1 : -1)), [events]);

  const totalCount = events.length;
  const todayCount = daily.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-navy-900 text-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-navy-700 px-6 py-3 md:px-10 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/logo.png" alt="MAA" width={48} height={48} className="rounded-lg border border-navy-700" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{t("app_name")}</h1>
            <p className="truncate text-xs text-gold-500 md:text-sm">{t("tv.footer")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 md:gap-6">
          <div className="hidden items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 md:flex">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            <span className="text-xs font-semibold tracking-widest text-green-400 md:text-sm">{t("tv.live")}</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold tabular-nums md:text-4xl">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </div>
            <div className="text-xs capitalize text-gray-400 md:text-sm">
              {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      {/* View tabs */}
      <div className="flex shrink-0 items-center justify-center gap-2 py-2 md:gap-3">
        {(["daily", "weekly", "monthly"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium md:px-6 md:py-2 md:text-base ${
              view === v
                ? "bg-gold-500 text-navy-900"
                : "border border-navy-700 bg-navy-800 text-gray-300 hover:border-gold-500/50"
            }`}
          >
            {t(`tv.${v}`)}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-6 pb-2 text-sm text-gray-400 md:gap-6 md:text-base">
        <span>
          {t("tv.today")}: <b className="text-white">{todayCount}</b>
        </span>
        <span>
          {t("tv.weekly")}: <b className="text-white">{weekly.length}</b>
        </span>
        <span>
          {t("tv.monthly")}: <b className="text-white">{totalCount}</b>
        </span>
        {loading && <span className="text-gold-500">{t("tv.updating")}</span>}
      </div>

      {/* Content — fills remaining screen, never scrolls */}
      <main className="min-h-0 flex-1 px-4 pb-3 md:px-8 md:pb-4">
        <div className="h-full">
          {view === "daily" && <DailyView events={daily} t={t} locale={locale} now={now} range={range} />}
          {view === "weekly" && <WeeklyView events={weekly} t={t} locale={locale} range={range} />}
          {view === "monthly" && <MonthlyView events={monthly} t={t} locale={locale} range={range} />}
        </div>
      </main>
    </div>
  );
}

function TypeBadge({ type, t }: { type: string; t: (k: string, f?: string) => string }) {
  const c = TYPE_META[type] || TYPE_META.flight;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium md:text-sm ${c.label}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {t(`tv.${type}`)}
    </span>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string, f?: string) => string }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.scheduled;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase md:text-xs ${s.badge}`}>{t(s.label)}</span>;
}

// Fixed school-day window so the timeline scale is stable on the TV.
const DAY_START_MIN = 8 * 60; // 08:00
const DAY_END_MIN = 20 * 60; // 20:00
const DAY_TOTAL_MIN = DAY_END_MIN - DAY_START_MIN; // 720 min

function toMin(iso: string | null): number {
  if (!iso) return DAY_START_MIN;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DAY_START_MIN;
  return d.getHours() * 60 + d.getMinutes();
}

interface LayoutEvent {
  event: TvEvent;
  lane: number;
  topPct: number;
  heightPct: number;
}

function DailyView({
  events,
  t,
  locale,
  now,
  range,
}: {
  events: TvEvent[];
  t: (k: string, f?: string) => string;
  locale: string;
  now: Date;
  range: { from: string };
}) {
  const timed = events
    .filter((e) => e.start)
    .sort((a, b) => {
      const at = new Date(a.start!).getTime();
      const bt = new Date(b.start!).getTime();
      return at - bt;
    });

  const unscheduled = events.filter((e) => !e.start);

  const clampPct = (m: number) => ((m - DAY_START_MIN) / DAY_TOTAL_MIN) * 100;

  const layout = useMemo<{ rows: LayoutEvent[]; laneCount: number }>(() => {
    const rows: LayoutEvent[] = [];
    const laneEnds: number[] = [];
    for (const e of timed) {
      const sMin = toMin(e.start);
      const durMin = e.end ? Math.max(30, (new Date(e.end).getTime() - new Date(e.start!).getTime()) / 60000) : 90;
      const eMin = sMin + durMin;
      let lane = laneEnds.findIndex((end) => sMin >= end);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(eMin);
      } else {
        laneEnds[lane] = eMin;
      }
      rows.push({
        event: e,
        lane,
        topPct: Math.max(0, Math.min(100 - 2, clampPct(sMin))),
        heightPct: Math.max(3, Math.min(100 - clampPct(sMin), (durMin / DAY_TOTAL_MIN) * 100)),
      });
    }
    return { rows, laneCount: Math.max(1, laneEnds.length) };
  }, [timed]);

  const nowPosPct = clampPct(now.getHours() * 60 + now.getMinutes());
  const hourLabels: number[] = [];
  for (let h = DAY_START_MIN / 60; h <= DAY_END_MIN / 60; h++) hourLabels.push(h);

  return (
    <div className="flex h-full flex-col">
      {/* Daily header */}
      <div className="flex shrink-0 items-center justify-between pb-2">
        <h2 className="text-2xl font-bold md:text-3xl">{t("tv.daily")}</h2>
        <p className="text-sm capitalize text-gray-400 md:text-base">{fmtDate(range.from, locale)}</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState t={t} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Timeline */}
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-navy-700 bg-navy-800">
            {/* Time axis */}
            <div className="relative w-14 shrink-0 select-none border-r border-navy-700 bg-navy-900/60 md:w-20">
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 font-mono text-xs tabular-nums text-gray-500 md:right-3"
                  style={{ top: `${clampPct(h * 60)}%` }}
                >
                  {`${pad(h)}:00`}
                </div>
              ))}
            </div>

            {/* Event lanes */}
            <div className="relative min-w-0 flex-1">
              {hourLabels.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-navy-700/60" style={{ top: `${clampPct(h * 60)}%` }} />
              ))}

              {/* Now line */}
              {nowPosPct >= 0 && nowPosPct <= 100 && (
                <div className="absolute left-0 right-0 z-20" style={{ top: `${nowPosPct}%` }}>
                  <div className="border-t-2 border-red-500">
                    <span className="absolute -top-3 left-2 rounded-full bg-red-500 px-2 py-0.5 font-mono text-xs text-white">
                      {pad(now.getHours())}:{pad(now.getMinutes())}
                    </span>
                  </div>
                </div>
              )}

              {/* Events */}
              {layout.rows.map(({ event: e, lane, topPct, heightPct }) => {
                const c = TYPE_META[e.type] || TYPE_META.flight;
                const muted = STATUS_MUTED[e.status] || "";
                const laneWidth = 100 / layout.laneCount;
                return (
                  <div
                    key={e.id}
                    className={`absolute overflow-hidden rounded-lg border border-navy-700 bg-navy-900 ${muted}`}
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                      left: `calc(${lane * laneWidth}% + 6px)`,
                      width: `calc(${laneWidth}% - 12px)`,
                    }}
                  >
                    <div className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${c.bar}`} />
                    <div className="flex h-full flex-col justify-center gap-0.5 overflow-hidden py-1 pl-4 pr-2 md:pl-5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={`font-mono text-xs font-bold tabular-nums md:text-sm ${c.text}`}>{fmtTime(e.start)}</span>
                        {e.end && <span className="hidden font-mono text-xs text-gray-500 lg:inline">→ {fmtTime(e.end)}</span>}
                        <TypeBadge type={e.type} t={t} />
                        {e.status !== "scheduled" && <StatusBadge status={e.status} t={t} />}
                      </div>
                      <div className="truncate text-base font-semibold md:text-lg">{e.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 truncate text-sm text-gray-400">
                        {e.student && <span className="truncate">{e.student}</span>}
                        {e.instructor && <span className="hidden truncate xl:inline">{e.instructor}</span>}
                        {e.location && <span className="truncate text-gray-300">{e.location}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unscheduled events (no start time) */}
          {unscheduled.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-navy-700 bg-navy-800 px-3 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">No time</span>
              {unscheduled.map((e) => {
                const c = TYPE_META[e.type] || TYPE_META.flight;
                const muted = STATUS_MUTED[e.status] || "";
                return (
                  <span key={e.id} className={`flex items-center gap-1.5 rounded-full border border-navy-700 bg-navy-900 px-2 py-0.5 text-xs ${muted}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                    <span className="max-w-[140px] truncate">{e.student || e.instructor || e.title}</span>
                    {e.location && <span className="hidden text-gray-500 lg:inline">{e.location}</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeeklyView({
  events,
  t,
  locale,
  range,
}: {
  events: TvEvent[];
  t: (k: string, f?: string) => string;
  locale: string;
  range: { from: string; to: string };
}) {
  const days = useMemo(() => {
    const from = new Date(`${range.from}T00:00:00`);
    const to = new Date(`${range.to}T00:00:00`);
    const list: { date: string; evts: TvEvent[] }[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const iso = toISODate(d);
      list.push({ date: iso, evts: events.filter((e) => e.date === iso) });
    }
    return list;
  }, [events, range]);

  const todayISO = toISODate(new Date());
  const MAX_PER_DAY = 7;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between pb-2">
        <h2 className="text-2xl font-bold md:text-3xl">{t("tv.weekly")}</h2>
        <p className="text-sm capitalize text-gray-400 md:text-base">
          {fmtDate(range.from, locale)} — {fmtDate(range.to, locale)}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {days.map((d) => {
          const isToday = d.date === todayISO;
          const sorted = d.evts.slice().sort((a, b) => (a.start && b.start ? new Date(a.start).getTime() - new Date(b.start).getTime() : 0));
          return (
            <div
              key={d.date}
              className={`flex min-h-0 flex-col overflow-hidden rounded-xl border p-2 md:p-3 ${
                isToday ? "border-gold-500/60 bg-gold-500/5" : "border-navy-700 bg-navy-800"
              }`}
            >
              <div className={`shrink-0 border-b pb-1.5 text-center ${isToday ? "border-gold-500/40" : "border-navy-700"}`}>
                {isToday && <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-500">{t("tv.today")}</div>}
                <div className={`truncate font-bold capitalize md:text-lg ${isToday ? "text-gold-500" : "text-white"}`}>
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, { weekday: "long" })}
                </div>
                <div className="text-xs text-gray-400 md:text-sm">
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                </div>
              </div>
              {sorted.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-2 text-center text-xs text-gray-600 md:text-sm">
                  {t("tv.noEvents")}
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden py-1.5">
                  {sorted.slice(0, MAX_PER_DAY).map((e) => {
                    const c = TYPE_META[e.type] || TYPE_META.flight;
                    const muted = STATUS_MUTED[e.status] || "";
                    return (
                      <div key={e.id} className={`rounded-lg border border-navy-700 bg-navy-900 px-2 py-1 ${muted}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${c.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                            {fmtTime(e.start)}
                          </span>
                          {e.location && <span className="hidden truncate text-xs text-gray-500 xl:inline">{e.location}</span>}
                        </div>
                        <div className="truncate text-sm font-semibold md:text-base">{e.title}</div>
                        <div className="truncate text-xs text-gray-400">{e.student || e.instructor}</div>
                      </div>
                    );
                  })}
                  {sorted.length > MAX_PER_DAY && (
                    <div className="text-center text-xs text-gray-500">+{sorted.length - MAX_PER_DAY}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyView({
  events,
  t,
  locale,
  range,
}: {
  events: TvEvent[];
  t: (k: string, f?: string) => string;
  locale: string;
  range: { from: string; to: string };
}) {
  const grid = useMemo(() => {
    const from = new Date(`${range.from}T00:00:00`);
    const weeks: { date: string | null; count: number; evts: TvEvent[] }[][] = [];
    const first = new Date(from.getFullYear(), from.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const start = new Date(first);
    start.setDate(first.getDate() - lead);

    let week: { date: string | null; count: number; evts: TvEvent[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISODate(d);
      const inMonth = d.getMonth() === from.getMonth();
      const evts = inMonth ? events.filter((e) => e.date === iso) : [];
      week.push({ date: inMonth ? iso : null, count: evts.length, evts });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    return weeks;
  }, [events, range.from]);

  const todayISO = toISODate(new Date());
  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base.getTime() + i * 86400000).toLocaleDateString(locale, { weekday: "short" })
    );
  }, [locale]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between pb-2">
        <h2 className="text-2xl font-bold md:text-3xl">{t("tv.monthly")}</h2>
        <p className="text-sm capitalize text-gray-400 md:text-base">
          {new Date(`${range.from}T00:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-navy-700 bg-navy-800 p-2 md:p-4">
        {/* Weekday labels */}
        <div className="grid shrink-0 grid-cols-7 gap-1.5 pb-1.5 md:gap-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="py-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 md:text-sm">
              {w}
            </div>
          ))}
        </div>
        {/* Calendar rows */}
        <div className="grid min-h-0 flex-1 grid-rows-6 gap-1.5 md:gap-2">
          {grid.map((week, wi) => (
            <div key={wi} className="grid min-h-0 grid-cols-7 gap-1.5 md:gap-2">
              {week.map((cell, ci) => {
                const isToday = cell.date === todayISO;
                return (
                  <div
                    key={ci}
                    className={`flex min-h-0 flex-col overflow-hidden rounded-lg border p-1 md:p-2 ${
                      isToday
                        ? "border-gold-500/60 bg-gold-500/5"
                        : cell.date
                        ? "border-navy-700 bg-navy-900"
                        : "border-transparent bg-transparent"
                    }`}
                  >
                    {cell.date && (
                      <>
                        <div className={`flex shrink-0 items-center justify-between text-sm font-bold md:text-base ${isToday ? "text-gold-500" : "text-gray-300"}`}>
                          <span>{Number(cell.date.slice(8))}</span>
                          {cell.count > 0 && <span className="text-xs text-gray-500">{cell.count}</span>}
                        </div>
                        <div className="mt-1 flex min-h-0 flex-wrap content-start gap-1 overflow-hidden">
                          {cell.evts.slice(0, 3).map((e) => {
                            const c = TYPE_META[e.type] || TYPE_META.flight;
                            return (
                              <div
                                key={e.id}
                                className={`flex h-5 min-w-[18px] items-center gap-1 rounded border border-navy-700 bg-navy-800 px-1 ${c.text}`}
                                title={`${e.title} · ${e.student || e.instructor || ""}`}
                              >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                                <span className="hidden truncate text-[10px] font-medium xl:inline">
                                  {e.student || e.instructor || e.title}
                                </span>
                              </div>
                            );
                          })}
                          {cell.count > 3 && (
                            <div className="flex h-5 items-center rounded border border-navy-700 bg-navy-800 px-1 text-[10px] font-bold text-gray-500">
                              +{cell.count - 3}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: (k: string, f?: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-navy-700 bg-navy-800">
        <svg className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-300">{t("tv.noEvents")}</h3>
      <p className="mt-1 text-gray-500">{t("tv.daily")}</p>
    </div>
  );
}
