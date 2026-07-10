"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function StudentLoginPage() {
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

      if (!["student", "candidate", "graduate"].includes(user.role)) {
        setError("This portal is for students only. Please use Staff Login.");
        return;
      }

      router.push("/student/dashboard");
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
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 sm:px-6">
      {/* iPad-optimized: max-w-lg for tablet, generous padding */}
      <div className="w-full max-w-lg">
        {/* Logo + branding */}
        <div className="text-center mb-10 md:mb-12">
          <Image
            src="/logo.png"
            alt="Masterly Air Academy"
            width={96}
            height={96}
            className="mx-auto rounded-2xl shadow-2xl md:w-28 md:h-28"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-6">
            Student Portal
          </h1>
          <p className="text-gray-400 mt-2 text-base md:text-lg">
            Masterly Air Academy
          </p>
        </div>

        {/* Login form — large touch targets for iPad */}
        <form
          onSubmit={handleSubmit}
          className="bg-navy-800 rounded-2xl p-8 md:p-10 shadow-2xl border border-navy-700"
        >
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-base">
              {error}
            </div>
          )}

          {/* Email field — min 52px height for comfortable iPad touch */}
          <div className="mb-5">
            <label className="block text-base font-medium text-gray-300 mb-2.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-xl bg-navy-900 border border-navy-600 text-white text-lg placeholder-gray-500 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition-all"
              placeholder="student@masterly-air-academy.dz"
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          {/* Password field */}
          <div className="mb-8">
            <label className="block text-base font-medium text-gray-300 mb-2.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-xl bg-navy-900 border border-navy-600 text-white text-lg placeholder-gray-500 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Submit button — large tap target */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gold-500 hover:bg-gold-600 active:bg-gold-700 disabled:opacity-50 text-navy-900 font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-8">
          Staff member?{" "}
          <a href="/login" className="text-gold-500 hover:underline">
            Go to Staff Login
          </a>
        </p>
      </div>
    </div>
  );
}
