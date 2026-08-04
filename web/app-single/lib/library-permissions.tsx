"use client";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import LibraryPage from "@/components/library-page";

// Mirrors backend DocumentViewSet._can_manage: system_admin / superuser,
// training_admin / admin_responsible / admissions_responsible by role, or
// any explicit documents.manage / documents.create permission.
const LIBRARY_MANAGER_ROLES = [
  "system_admin",
  "training_admin",
  "admin_responsible",
  "admissions_responsible",
];

export function canManageLibrary(
  user: {
    role?: string;
    is_superuser?: boolean;
    permissions?: string[];
  } | null | undefined
): boolean {
  if (!user) return false;
  if (user.is_superuser || user.role === "system_admin") return true;
  if (user.role && LIBRARY_MANAGER_ROLES.includes(user.role)) return true;
  const perms = user.permissions || [];
  return perms.some(
    (p) => p.endsWith(".documents.manage") || p.endsWith(".documents.create")
  );
}

export default function LibraryPortalPage({
  backHref,
  loginHref,
}: {
  backHref?: string;
  loginHref?: string;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <LibraryPage
      canManage={canManageLibrary(user)}
      backHref={backHref}
      backLabel={backHref ? t("common.back", "Back to Dashboard") : undefined}
      loginHref={loginHref}
    />
  );
}
