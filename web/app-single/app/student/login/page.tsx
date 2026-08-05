"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";

type FormData = { email: string; password: string; };

export default function StudentLoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuth();

  const loginSchema = z.object({
    email: z.string().email(t("loginEmailRequired", "Valid email is required")),
    password: z.string().min(1, t("loginPasswordRequired", "Password is required")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { user } = await login(data.email, data.password);

      if (!["student", "candidate", "graduate"].includes(user.role)) {
        setError("root.serverError", {
          message: t("student.wrongPortal", "This portal is for students only. Please use Staff Login."),
        });
        return;
      }

      router.push("/student/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError("root.serverError", { message: err.message });
      } else {
        setError("root.serverError", {
          message: t("common.errorConnection", "Connection error. Please try again."),
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 sm:px-6 2xl:px-4">
      {/* iPad-optimized: max-w-lg for tablet, generous padding. Desktop (2xl+) matches staff form. */}
      <div className="w-full max-w-lg 2xl:max-w-md">
        {/* Logo + branding */}
        <div className="text-center mb-10 md:mb-12 2xl:mb-8">
          <Image
            src="/logo.png"
            alt="Masterly Air Academy"
            width={240}
            height={240}
            className="mx-auto w-48 md:w-64 h-auto 2xl:w-52"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-6 2xl:text-2xl 2xl:mt-4">
            {t("studentLoginTitle", "Student Portal")}
          </h1>
          <p className="text-gray-400 mt-2 text-base md:text-lg 2xl:mt-1 2xl:text-base">
            {t("app_name", "Masterly Air Academy")}
          </p>
        </div>

        {/* Login form | large touch targets for iPad */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-navy-800 rounded-2xl p-8 md:p-10 shadow-2xl border border-navy-700 2xl:rounded-xl 2xl:p-8 2xl:shadow-xl"
        >
          {errors.root?.serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-base 2xl:mb-4 2xl:p-3 2xl:rounded-lg 2xl:text-sm">
              {errors.root.serverError.message}
            </div>
          )}

          {/* Email field | min 52px height for comfortable iPad touch */}
          <div className="mb-5 2xl:mb-4">
            <label className="block text-base font-medium text-gray-300 mb-2.5 2xl:text-sm 2xl:mb-2">
              {t("common.email", "Email")}
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-5 py-4 rounded-xl bg-navy-900 border border-navy-600 text-white text-lg placeholder-gray-500 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition-all 2xl:px-4 2xl:py-3 2xl:rounded-lg 2xl:text-base 2xl:focus:ring-0 2xl:transition-colors"
              placeholder={t("loginEmailPlaceholder", "student@masterly-air-academy.dz")}
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1.5 2xl:text-xs 2xl:mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="mb-8 2xl:mb-6">
            <label className="block text-base font-medium text-gray-300 mb-2.5 2xl:text-sm 2xl:mb-2">
              {t("common.password", "Password")}
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full px-5 py-4 rounded-xl bg-navy-900 border border-navy-600 text-white text-lg placeholder-gray-500 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition-all 2xl:px-4 2xl:py-3 2xl:rounded-lg 2xl:text-base 2xl:focus:ring-0 2xl:transition-colors"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1.5 2xl:text-xs 2xl:mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button | large tap target */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gold-500 hover:bg-gold-600 active:bg-gold-700 disabled:opacity-50 text-navy-900 font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 2xl:py-3 2xl:font-semibold 2xl:text-base 2xl:rounded-lg 2xl:shadow-none 2xl:hover:shadow-none 2xl:transform-none 2xl:hover:transform-none 2xl:active:transform-none 2xl:transition-colors"
          >
            {isSubmitting ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t("loginSigning", "Signing in...")}</span> : t("common.signIn", "Sign In")}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-8">
          {t("staffMember", "Staff member?")}{" "}
          <Link href="/login" className="text-gold-500 hover:underline">
            {t("staffLoginLink", "Go to Staff Login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
