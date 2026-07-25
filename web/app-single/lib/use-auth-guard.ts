import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard(
  isAuthenticated: boolean,
  isLoading: boolean,
  redirectTo = "/login",
  userRole?: string,
  allowedRoles?: string[],
) {
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router, redirectTo, userRole, allowedRoles]);
}
