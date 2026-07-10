'use client';

// ============================================================
// MASTERLY AIR ACADEMY — Auth Guard Component
// Redirects unauthenticated users to /login
// ============================================================

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  loginPath?: string;
}

export function AuthGuard({
  children,
  allowedRoles,
  loginPath = '/login',
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(`${loginPath}?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && user) {
      const hasAccess = allowedRoles.includes(user.role) ||
        user.roles?.some((r) => allowedRoles.includes(r));
      if (!hasAccess) {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, loginPath, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-gold-500 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
