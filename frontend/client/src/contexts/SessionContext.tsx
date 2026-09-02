import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { clearCsrfToken, getCsrfToken, getCurrentUser, SESSION_EXPIRED_EVENT, SESSION_REFRESHED_EVENT, setCsrfToken } from "@/api/client";
import type { UserProfile } from "@/types/auth";

const LEGACY_ACCESS_TOKEN_KEY = "croplens_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "croplens_refresh_token";

type SessionContextValue = {
  isAuthenticated: boolean;
  isSessionReady: boolean;
  user: UserProfile | null;
  setSession: (csrfToken: string, profile?: UserProfile | null) => void;
  setUser: (user: UserProfile | null) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const setSession = useCallback((nextCsrfToken: string, profile?: UserProfile | null) => {
    if (!nextCsrfToken) return;
    setCsrfToken(nextCsrfToken);
    setIsAuthenticated(true);
    if (profile) setUser(profile);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    clearCsrfToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    void getCurrentUser({ notifyUnauthorized: false })
      .then(async (profile) => {
        const { csrf_token } = await getCsrfToken({ notifyUnauthorized: false });
        if (!active) return;
        setCsrfToken(csrf_token);
        setIsAuthenticated(true);
        setUser(profile);
      })
      .catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => {
        if (active) setIsSessionReady(true);
      });

    const handleSessionExpired = () => {
      clearSession();
      if (window.location.pathname !== "/auth") {
        window.location.assign("/auth?session=expired");
      }
    };
    const handleSessionRefreshed = (event: Event) => {
      const profile = (event as CustomEvent<UserProfile | undefined>).detail;
      if (profile) setUser(profile);
      setIsAuthenticated(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    window.addEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
      window.removeEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
    };
  }, [clearSession]);

  const value = useMemo(
    () => ({ isAuthenticated, isSessionReady, user, setSession, setUser, clearSession }),
    [isAuthenticated, isSessionReady, user, setSession, setUser, clearSession],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
