import { useCallback, useMemo, useState } from "react";
import { isOnboardingDone, markOnboardingDone } from "@/lib/onboarding";
import { useSession } from "@/contexts/SessionContext";

export function useOnboarding() {
  const { isAuthenticated, isSessionReady, user } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const shouldShow = useMemo(() => {
    if (!isSessionReady || !isAuthenticated || !user || dismissed) return false;
    return !isOnboardingDone(user.id);
  }, [dismissed, isAuthenticated, isSessionReady, user]);

  const complete = useCallback(() => {
    if (user) markOnboardingDone(user.id);
    setDismissed(true);
  }, [user]);

  const skip = useCallback(() => {
    if (user) markOnboardingDone(user.id);
    setDismissed(true);
  }, [user]);

  return { shouldShow, complete, skip, user };
}
