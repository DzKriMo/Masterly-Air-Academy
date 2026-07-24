import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard(isAuthenticated: boolean, isLoading: boolean, redirectTo = "/login") {
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push(redirectTo);
  }, [isLoading, isAuthenticated, router, redirectTo]);
}
