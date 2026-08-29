import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SESSION_EXPIRED_EVENT } from "@/api/client";

const ACCESS_TOKEN_KEY = "croplens_access_token";
const REFRESH_TOKEN_KEY = "croplens_refresh_token";

type SessionContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, refreshToken?: string) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => window.localStorage.getItem(ACCESS_TOKEN_KEY));

  const setSession = useCallback((nextAccessToken: string, refreshToken?: string) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setAccessToken(nextAccessToken);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACCESS_TOKEN_KEY) setAccessToken(event.newValue);
    };
    const handleSessionExpired = () => {
      clearSession();
      if (window.location.pathname !== "/auth") {
        window.location.assign("/auth?session=expired");
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [clearSession]);

  const value = useMemo(() => ({ accessToken, isAuthenticated: Boolean(accessToken), setSession, clearSession }), [accessToken, setSession, clearSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
