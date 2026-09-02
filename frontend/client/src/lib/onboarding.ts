export const ONBOARDING_COMPLETE_EVENT = "croplens-onboarding-complete";

const ONBOARDING_KEY_PREFIX = "croplens_onboarding_done";

export type OnboardingCompleteDetail = {
  commodity: string;
  market: string;
  autoCheckMarket: boolean;
};

export function onboardingStorageKey(userId: number) {
  return `${ONBOARDING_KEY_PREFIX}_${userId}`;
}

export function isOnboardingDone(userId: number) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(onboardingStorageKey(userId)) === "1";
}

export function markOnboardingDone(userId: number) {
  window.localStorage.setItem(onboardingStorageKey(userId), "1");
}

export function dispatchOnboardingComplete(detail: OnboardingCompleteDetail) {
  window.dispatchEvent(new CustomEvent<OnboardingCompleteDetail>(ONBOARDING_COMPLETE_EVENT, { detail }));
}
