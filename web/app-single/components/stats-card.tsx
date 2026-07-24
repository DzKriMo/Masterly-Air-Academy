interface StatsCardProps {
  label: string;
  value: string | number;
  valueClassName?: string;
}

export function StatsCard({ label, value, valueClassName = "text-white" }: StatsCardProps) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</p>
    </div>
  );
}
