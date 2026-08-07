export const fmtLabel = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function toDatetimeLocal(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const fmtCurrency = (
  amount: string | number | null | undefined,
  currency = "DZD"
): string => {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtDate = (value?: string | null): string => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
};

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function truncate(text: string | null | undefined, n: number): string {
  if (!text) return "—";
  return text.length > n ? text.substring(0, n) + "…" : text;
}

export const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];

export const EXAM_TYPES = ["quiz", "progress_test", "module_exam", "mock_exam", "final_exam"];

export const EXAM_STATUSES = ["draft", "active", "inactive"];

export const CERT_TYPES = ["course_completion", "license", "rating", "endorsement", "medical"];

export const CERT_STATUSES = ["issued", "pending", "revoked", "expired"];

export const SUBJECT_STATUSES = ["active", "inactive", "draft"];

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
  draft: "bg-amber-500/10 text-amber-400",
  issued: "bg-green-500/10 text-green-400",
  pending: "bg-amber-500/10 text-amber-400",
  revoked: "bg-red-500/10 text-red-400",
  expired: "bg-gray-500/10 text-gray-400",
};

export const TYPE_COLORS: Record<string, string> = {
  quiz: "bg-blue-500/10 text-blue-400",
  progress_test: "bg-purple-500/10 text-purple-400",
  module_exam: "bg-cyan-500/10 text-cyan-400",
  mock_exam: "bg-amber-500/10 text-amber-400",
  final_exam: "bg-red-500/10 text-red-400",
  theory: "bg-blue-500/10 text-blue-400",
  practical: "bg-purple-500/10 text-purple-400",
  mock: "bg-cyan-500/10 text-cyan-400",
  final: "bg-red-500/10 text-red-400",
  course_completion: "bg-blue-500/10 text-blue-400",
  license: "bg-gold-500/10 text-gold-400",
  rating: "bg-purple-500/10 text-purple-400",
  endorsement: "bg-cyan-500/10 text-cyan-400",
  medical: "bg-green-500/10 text-green-400",
};
