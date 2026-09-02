const HOME_GUIDE_KEY = "croplens_home_guide_seen";
const MARKET_CHECKED_KEY = "croplens_market_checked";

export function isHomeGuideSeen() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(HOME_GUIDE_KEY) === "1";
}

export function markHomeGuideSeen() {
  window.localStorage.setItem(HOME_GUIDE_KEY, "1");
}

export function hasMarketCheckedBefore() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MARKET_CHECKED_KEY) === "1";
}

export function markMarketCheckedBefore() {
  window.localStorage.setItem(MARKET_CHECKED_KEY, "1");
}
