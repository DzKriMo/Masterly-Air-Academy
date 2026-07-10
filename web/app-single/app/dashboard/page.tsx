"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { getPortalLabel } from "@/lib/portal-access";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">
        <div className="text-gold-500 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  const roleLabel = getPortalLabel(user.role);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="bg-navy-800 border-b border-navy-700">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MAA"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-white">
                Masterly Air Academy
              </h1>
              <p className="text-xs text-gray-400">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.name || user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card title="Users" value="—" icon="👥" />
          <Card title="Students" value="—" icon="🎓" />
          <Card title="Aircraft" value="—" icon="✈️" />
          <Card title="Academic Year" value="—" icon="📅" />
        </div>

        <div className="mt-8 bg-navy-800 rounded-xl p-6 border border-navy-700">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickLink href="/admin" label="Admin Panel (Django)" />
            <QuickLink href="/admin/accounts/user/" label="Manage Users" />
            <QuickLink href="/admin/core/academicyear/" label="Academic Years" />
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block px-4 py-3 bg-navy-900 rounded-lg border border-navy-600 hover:border-gold-500 text-gray-300 hover:text-gold-500 transition-colors"
    >
      {label}
    </a>
  );
}
