import Image from "next/image";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export function PageHeader({ title, backHref, backLabel = "Back to Dashboard", actions, maxWidth = "max-w-7xl" }: PageHeaderProps) {
  const router = useRouter();
  return (
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className={`${maxWidth} mx-auto px-6 h-16 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="MAA" width={110} height={110} />
          <div>
            <h1 className="text-lg font-bold text-white">{title}</h1>
            {backHref && (
              <button onClick={() => router.push(backHref)} className="text-xs text-gray-500 hover:text-gold-500">
                {backLabel}
              </button>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </nav>
  );
}
