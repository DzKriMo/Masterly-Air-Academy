"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { usesDjangoAdmin, getDefaultPortal } from "@/lib/portal-access";
import { useTranslation } from "@/lib/use-translation";
import { loginSchema } from "@/lib/validators";

type FormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();

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

      if (usesDjangoAdmin(user.role)) {
        window.location.href = "/admin";
        return;
      }

      router.push(getDefaultPortal(user.role));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError("root.serverError", { message: err.message });
      } else {
        setError("root.serverError", { message: t("login.errorConnection") });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Masterly Air Academy"
            width={200}
            height={200}
            className="mx-auto w-40 md:w-52 h-auto"
            priority
          />
          <h1 className="text-2xl font-bold text-white mt-4">{t("login_title")}</h1>
          <p className="text-gray-400 mt-1">{t("login.academyName")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-navy-800 rounded-xl p-8 shadow-xl border border-navy-700">
          {errors.root?.serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {errors.root.serverError.message}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t("login.emailLabel")}</label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-4 py-3 rounded-lg bg-navy-900 border border-navy-600 text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none transition-colors"
              placeholder="you@masterly-air-academy.dz"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t("login.passwordLabel")}</label>
            <input
              type="password"
              {...register("password")}
              className="w-full px-4 py-3 rounded-lg bg-navy-900 border border-navy-600 text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg transition-colors"
          >
            {isSubmitting ? t("login_signing") : t("login_signin")}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            {t("login_admin_link")}
          </p>
        </form>
      </div>
    </div>
  );
}
