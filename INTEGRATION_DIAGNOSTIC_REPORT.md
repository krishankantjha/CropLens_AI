# CropLens AI — Integration Diagnostic Report

## 1. Executive Summary
This diagnostic report identifies the root causes for the reported issues of "NaN" values, hardcoded placeholders, and static commodity/mandi lists. The primary findings indicate a significant "plumbing" failure where the frontend service layer often falls back to demo data due to path mismatches, hardcoded local seeds, and missing dynamic data bindings in key components.

---

## 2. Identified Root Causes

### A. Static Resource Discovery (Only 3 Commodities/Mandis)
| File | Issue | Impact |
| :--- | :--- | :--- |
| **`AppLayout.tsx`** | Seeds state with only 3 crops and 10 mandis. Uses a silent `.catch(() => {})` on `getResources()`. | If the API call fails or returns a different shape, the UI stays stuck on the hardcoded 3-item seed. |
| **`Onboarding.tsx`** | Fully hardcodes 3 crops and 6 mandis at the file level (lines 11-16). | New users cannot select from the full catalog of 10+ commodities defined in the backend. |
| **`MandiMap.tsx`** | Imports and renders `demoMandis` directly; accepts no props for live data. | The visual map will only ever show the 3 demo mandis, regardless of backend data. |

### B. "NaN" and Placeholder Values
| Component | Cause | Evidence |
| :--- | :--- | :--- |
| **`cropLensService.ts`** | Path Mismatch: Calls `/predict/analytics-trends` instead of `/analytics/trends`. | Triggers a `catch` block that returns `demoSignals`, leading to static/mock data on the dashboard. |
| **`cropLensService.ts`** | Fabricated Fields: `getMandis` hardcodes `distance: 'N/A'` and `transport: 0`. | Causes `NaN` in `MandiWorkspace.tsx` when it attempts to calculate `transport / 50`. |
| **`MandiWorkspace.tsx`** | Local Calculation: Uses a hardcoded `* 50` multiplier for net profit. | Ignores the user's actual quantity preference from their profile. |
| **`Home.tsx`** | Static Content: "Price outlook" card is fully hardcoded with fixed values. | Users see ₹1,360 / ₹1,480 / ₹1,620 regardless of the actual market forecast. |

### C. Broken Logic & Runtime Errors
| File | Bug | Severity |
| :--- | :--- | :--- |
| **`KisanHub.tsx`** | `handleRecalculate` calls `loadForecast()`, which is **undefined**. | **CRITICAL**: The app will crash when a user clicks the "Recalculate" button. |
| **`KisanHub.tsx`** | `bestMandi` is derived from `demoMandis` instead of live arbitrage results. | The "Best Mandi" recommendation is always one of the 3 demo items. |
| **`AuthContext.tsx`** | `defaultUser` hardcodes the mobile number and name. | Prevents actual user identity from surfacing correctly after login. |

---

## 3. Diagnostic Verdict

The system is currently in a **"Hybrid-Mock"** state. While the backend is production-ready and exposes dynamic endpoints, the frontend is still "clinging" to its initial research prototype roots through:
1.  **Silent Fallbacks:** Swallowing API errors and reverting to static arrays.
2.  **Hardcoded Components:** Components like `MandiMap` and `Onboarding` that aren't wired to fetch dynamic data.
3.  **Service-Level Fabrication:** The API adapter (`cropLensService.ts`) is synthesizing fake fields (`N/A`, `0`) instead of passing through raw backend data.

---

## 4. Recommended Fix Strategy (Do Not Implement Yet)
1.  **Standardize API Paths:** Align `cropLensService.ts` with the actual backend routes.
2.  **Unify Resource Fetching:** Ensure `Onboarding` and `AppLayout` use the same `getResources()` call and handle errors gracefully.
3.  **Remove Synthetic Fields:** Update `getMandis` to pass through actual data and let the UI handle missing fields (e.g., displaying "Calculating..." instead of "N/A").
4.  **Fix Runtime Bugs:** Define `loadForecast()` in `KisanHub.tsx` and bind the `MandiMap` to live props.

**Diagnostic performed by Manus AI for Krishan Kant Jha.**
