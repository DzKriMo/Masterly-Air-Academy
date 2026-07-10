"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { usesFilamentAdmin, getDefaultPortal } from "@/lib/portal-access";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { user } = await login(email, password);

      if (usesFilamentAdmin(user.role)) {
        window.location.href = "/admin";
        return;
      }

      router.push(getDefaultPortal(user.role));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Connection error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/mast.svg"
            alt="Masterly Air Academy"
            width={72}
            height={72}
            className="mx-auto rounded-xl shadow-lg"
            priority
          />
          <h1 className="text-2xl font-bold text-white mt-4">Staff Login</h1>
          <p className="text-gray-400 mt-1">Masterly Air Academy</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy-800 rounded-xl p-8 shadow-xl border border-navy-700">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-navy-900 border border-navy-600 text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none transition-colors"
              placeholder="you@masterly-air-academy.dz"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-navy-900 border border-navy-600 text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Admin? <a href="/admin" className="text-gold-500 hover:underline">Go to Admin Panel</a>
          </p>
        </form>
      </div>
    </div>
  );
}
