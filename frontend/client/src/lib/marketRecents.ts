export type MarketRecent = { commodity: string; market: string; at: number };

const STORAGE_KEY = "croplens_market_recents";
const MAX_RECENTS = 5;

function loadRecents(): MarketRecent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketRecent[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.commodity && item.market) : [];
  } catch {
    return [];
  }
}

function saveRecents(recents: MarketRecent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export function rememberMarketSelection(commodity: string, market: string) {
  if (!commodity || !market) return;
  const next = [{ commodity, market, at: Date.now() }, ...loadRecents().filter((item) => item.commodity !== commodity || item.market !== market)];
  saveRecents(next);
}

export function getRecentMarketSelections(): MarketRecent[] {
  return loadRecents();
}

export function getRecentCommodityIds(): string[] {
  const seen = new Set<string>();
  return loadRecents().map((item) => item.commodity).filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function getRecentMarketIds(): string[] {
  const seen = new Set<string>();
  return loadRecents().map((item) => item.market).filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
