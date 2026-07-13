"use client";

import { useRouter } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 sm:px-6">
      {/* iPad-optimized: max-w-lg for tablet, generous padding */}
      <div className="w-full max-w-lg">
        {/* Logo + branding */}
        <div className="text-center mb-10 md:mb-12">
          <Image
            src="/logo.png"
            alt="Masterly Air Academy"
            width={240}
            height={240}
            className="mx-auto w-48 md:w-64 h-auto"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-6">
            {t("studentLoginTitle", "Student Portal")}
          </h1>
          <p className="text-gray-400 mt-2 text-base md:text-lg">
            {t("app_name", "Masterly Air Academy")}
          </p>
        </div>

        {/* Login form | large touch targets for iPad */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-navy-800 rounded-2xl p-8 md:p-10 shadow-2xl border border-navy-700"
        >
          {errors.root?.serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-base">
              {errors.root.serverError.message}
            </div>
          )}

          {/* Email field | min 52px height for comfortable iPad touch */}
          <div className="mb-5">
            <label className="block text-base font-medium text-gray-300 mb-2.5">
              {t("common.email", "Email")}
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-5 py-4 rounded-xl bg-navy-900 border border-navy-600 text-white text-lg placeholder-gray-500 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition-all"
              placeholder={t("loginEmailPlaceholder", "student@masterly-air-academy.dz")}
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1.5">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="mb-8">
            <label className="block text-base font-medium text-gray-300 mb-2.5">
              {t("common.password", "Password")}
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full px-5 py-4 rounded-xl bg-navy-900 border border-navy-600 text-white text-lg placeholder-gray-500 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition-all"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1.5">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button | large tap target */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gold-500 hover:bg-gold-600 active:bg-gold-700 disabled:opacity-50 text-navy-900 font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSubmitting ? t("loginSigning", "Signing in...") : t("common.signIn", "Sign In")}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-8">
          {t("staffMember", "Staff member?")}{" "}
          <a href="/login" className="text-gold-500 hover:underline">
            {t("staffLoginLink", "Go to Staff Login")}
          </a>
        </p>
      </div>
    </div>
  );
}
