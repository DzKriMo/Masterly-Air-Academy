interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex gap-1 bg-navy-800 rounded-lg p-1 w-fit border border-navy-700 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            active === tab.key
              ? "bg-gold-500 text-navy-900"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
}
