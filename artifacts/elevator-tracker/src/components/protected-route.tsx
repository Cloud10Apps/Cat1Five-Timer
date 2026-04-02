import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Layout } from "@/components/layout";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && requireAdmin && user?.role !== "ADMIN") {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, requireAdmin, user, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || (requireAdmin && user?.role !== "ADMIN")) {
    return null;
  }

  return <Layout>{children}</Layout>;
}
