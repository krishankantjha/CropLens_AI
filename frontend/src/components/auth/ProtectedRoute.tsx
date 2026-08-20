// Field Notes Intelligence reminder: frontend-only route guard for UI flow, not a security boundary.
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (status === "unauthenticated") setLocation("/login");
  }, [status, setLocation]);

  if (status === "unauthenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 text-center">
        <div>
          <h2 className="mt-4 text-xl font-extrabold text-[#0E4D35]">Sign in to view your advisory</h2>
          <p className="mt-1 text-xs text-[#66716A]">Redirecting to secure login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
