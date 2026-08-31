import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { clearCsrfToken, getCsrfToken, getCurrentUser, SESSION_EXPIRED_EVENT, setCsrfToken } from "@/api/client";

const LEGACY_ACCESS_TOKEN_KEY = "croplens_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "croplens_refresh_token";

type SessionContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  setSession: (csrfToken: string) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  const setSession = useCallback((nextCsrfToken: string) => {
    if (nextCsrfToken) {
      setCsrfToken(nextCsrfToken);
      setAccessToken("cookie-session");
    }
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    clearCsrfToken();
    setAccessToken(null);
  }, []);

  useEffect(() => {
    let active = true;
    void getCurrentUser({ notifyUnauthorized: false })
      .then(async () => {
        const { csrf_token } = await getCsrfToken({ notifyUnauthorized: false });
        if (active) {
          setCsrfToken(csrf_token);
          setAccessToken("cookie-session");
        }
      })
      .catch(() => {
        if (active) setAccessToken(null);
      })
      .finally(() => {
        if (active) setIsSessionReady(true);
      });

    const handleSessionExpired = () => {
      clearSession();
      if (window.location.pathname !== "/auth") window.location.assign("/auth?session=expired");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [clearSession]);

  const value = useMemo(() => ({ accessToken, isAuthenticated: Boolean(accessToken), isSessionReady, setSession, clearSession }), [accessToken, isSessionReady, setSession, clearSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
