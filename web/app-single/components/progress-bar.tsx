export function ProgressBar({ value, className, size }: { value: number; className?: string; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={`bg-navy-700 rounded-full ${h} ${className || ""}`}>
      <div className={`${h} rounded-full transition-all duration-500 ${value >= 80 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
