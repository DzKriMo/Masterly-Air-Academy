"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="text-center max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <Image
            src="/logo.png"
            alt="Masterly Air Academy"
            width={120}
            height={120}
            className="mx-auto rounded-2xl shadow-2xl"
            priority
          />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Masterly Air Academy
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          ATO Management Platform — Training, Administration & Compliance
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
          >
            Staff Login
          </Link>
          <Link
            href="/student/login"
            className="px-8 py-3 border border-gold-500/30 hover:border-gold-500 text-gold-500 font-semibold rounded-lg transition-colors"
          >
            Student Portal
          </Link>
          <a
            href="/admin"
            className="px-8 py-3 border border-navy-600 hover:border-gold-500 text-gray-400 hover:text-gold-500 font-semibold rounded-lg transition-colors"
          >
            Admin Panel
          </a>
        </div>
        <p className="text-xs text-gray-600 mt-8">
          Admin users: use <strong>Admin Panel</strong> to access Django Admin directly.
          <br />
          Staff and students: use <strong>Staff Login</strong> or <strong>Student Portal</strong>.
        </p>
      </div>
    </div>
  );
}
