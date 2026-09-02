# CropLens AI — Frontend UI Enhancement Plan

Wireframe-level plan mapped to the current `frontend/` codebase.  
**Scope:** planning only — implement in phases; do not ship everything at once.

---

## Current architecture (baseline)

```
App.tsx
├── /auth          → AuthPage.tsx
├── /profile       → ProfilePage.tsx
├── /              → AppShell.tsx → HomePage.tsx (+ AlertsPanel)
└── *              → NotFoundPage.tsx
```

**HomePage today** is a single long page with hash anchors: `#home`, `#forecast`, `#risk`, `#mandi`, `#alerts`.

**Goal:** evolve into a **decision-first farmer product** with three clear workspaces while reusing existing components and API client.

---

## Target information architecture

### Option A (recommended): Single route, three scroll workspaces

Keep `Route path="/"` but restructure `HomePage` into tabbed or sticky sub-nav sections:

```
┌─────────────────────────────────────────────────────────────┐
│ AppShell (topbar + service pill + lang/theme + profile)      │
├─────────────────────────────────────────────────────────────┤
│ STICKY: Crop · Mandi · Horizon · [Check Market] CTA         │
├─────────────────────────────────────────────────────────────┤
│ WORKSPACE 1 — MARKET (#market)                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ DECISION HERO: SELL | WAIT | HOLD                    │   │
│   │ ₹P50  ·  range P10–P90  ·  best day  ·  confidence   │   │
│   │ [Listen] [WhatsApp] [Why this advice? ▼]             │   │
│   └─────────────────────────────────────────────────────┘   │
│   ┌──────────────────────┐  ┌──────────────────────────┐   │
│   │ Price corridor       │  │ Forecast chart (7/14 toggle)│   │
│   └──────────────────────┘  └──────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ WORKSPACE 2 — RISK (#risk)                                   │
│   Gated card OR full risk panel + records analyzed           │
├─────────────────────────────────────────────────────────────┤
│ WORKSPACE 3 — MANDI (#mandi)                                 │
│   Gated card OR arbitrage table + PDF export                 │
├─────────────────────────────────────────────────────────────┤
│ ALERTS (#alerts) — AlertsPanel (unchanged position)          │
└─────────────────────────────────────────────────────────────┘
│ Mobile: bottom nav → Market | Risk | Mandi | Alerts | Profile│
└─────────────────────────────────────────────────────────────┘
```

### Option B (later): Dedicated routes

```
/           → Market workspace (default)
/risk       → Risk workspace
/mandi      → Mandi workspace
/alerts     → Alerts (optional)
```

Start with **Option A** — minimal routing change, maximum impact.

---

## Phase 1 — Decision hero + feedback polish (Week 1)

### Wireframe: Decision Hero Card

```
┌────────────────────────────────────────────────────────┐
│ TODAY'S DECISION                          [🔊] [💬]    │
│ ┌──────────┐                                           │
│ │  SELL    │  ← large badge (tone: sell/hold/profit)   │
│ └──────────┘                                           │
│ Expected price     ₹2,450 / quintal                    │
│ Likely range       ₹2,100 – ₹2,800                     │
│ Best day           Thursday (+₹180 vs today)             │
│ Confidence         High · Model v1.2.0                 │
│ ─────────────────────────────────────────────────────  │
│ [Price corridor visual — existing PriceCorridor]       │
│ ▼ Why this advice?                                     │
│   • Arrival trend stable                               │
│   • P50 above 7-day median                             │
│ [Model disclaimer]                                     │
└────────────────────────────────────────────────────────┘
```

### File map — Phase 1

| Action | File | What to do |
|--------|------|------------|
| **Extract** | `features/home/DecisionHeroCard.tsx` | Move decision card block from `HomePage.tsx` (~lines 254–282). Props: `forecast`, `language`, `tone`, prices, `onSpeak`, `onShare`, `onRetry`. |
| **Extract** | `features/home/MarketSelectorForm.tsx` | Hero form: crop select, `MandiCombobox`, horizon, submit CTA. |
| **Extract** | `features/home/LoadingSkeleton.tsx` | Move `LoadingSkeleton` out of `HomePage.tsx`. |
| **New** | `features/home/DecisionBadge.tsx` | Renders SELL / WAIT / HOLD from `decisionTone()` logic. |
| **New** | `features/home/AdviceExplainer.tsx` | Collapsible “Why this advice?” — uses `forecast.decision_*`, `expected_gain`, `confidence`. |
| **New** | `lib/toast.ts` | Thin wrapper: `import { toast } from "sonner"` + i18n messages. |
| **Modify** | `App.tsx` | No route changes. |
| **Modify** | `HomePage.tsx` | Compose extracted components; shrink to orchestration + data fetching. |
| **Modify** | `ProfilePage.tsx` | Call `toast.success(t("saveSuccess"))` on save. |
| **Modify** | `AlertsPanel.tsx` | Toast on save/remove alert. |
| **Modify** | `AuthPage.tsx` | Toast on OTP sent, login success (keep redirect). |
| **Modify** | `styles/home.css` | Add `.decision-badge`, `.decision-badge--sell|hold|profit`, `.advice-explainer`. |
| **Modify** | `styles/tokens.css` | Add semantic tokens: `--decision-sell`, `--decision-hold`, `--decision-profit`. |
| **Wire up** | `components/ui/tooltip.tsx` | Tooltip on P10/P50/P90 labels in chart legend + corridor. |
| **Wire up** | `LanguageContext.tsx` | Add keys: `whyThisAdvice`, `decisionSell`, `decisionWait`, `decisionHold`, `dataUpdated`, `toastSaveSuccess`, etc. |

### Skeleton wireframe (match final layout)

```
┌─ Decision Hero Skeleton ─────────────────┐
│ ████████████                            │
│ ██████    ████████████████              │
│ ████      ████████                      │
└─────────────────────────────────────────┘
┌─ Chart Skeleton ────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────┘
```

| File | Change |
|------|--------|
| `LoadingSkeleton.tsx` | Add `variant: "decision" \| "chart" \| "table"`. |
| `home.css` | `.skeleton-decision`, `.skeleton-chart` variants. |

---

## Phase 2 — Mandi comparison table + PDF (Week 2)

### Wireframe: Mandi Workspace

```
┌─────────────────────────────────────────────────────────────┐
│ BEST MANDI FOR POTATO · AZADPUR BASE          [↻] [PDF ⬇]   │
├──────┬─────────────────┬────────────┬──────────┬─────────────┤
│ Rank │ Destination     │ Gross diff │ % change │ Action      │
├──────┼─────────────────┼────────────┼──────────┼─────────────┤
│  1   │ Ghaziabad       │ +₹420      │ +8.2%    │ View →      │
│  2   │ Karnal          │ +₹310      │ +6.1%    │ View →      │
│  3   │ Meerut          │ +₹180      │ +3.4%    │ View →      │
└──────┴─────────────────┴────────────┴──────────┴─────────────┘
│ Transport cost (optional): [ ₹____ ]  → Net gain recalculated │
│ Disclaimer: model-supported, transport not included by default │
└─────────────────────────────────────────────────────────────┘
```

### File map — Phase 2

| Action | File | What to do |
|--------|------|------------|
| **New** | `features/home/MandiWorkspace.tsx` | Section wrapper for procurement block; owns table + transport input state. |
| **New** | `features/home/MandiOpportunityTable.tsx` | Sortable table from `procurement.opportunities`. |
| **New** | `features/home/MandiDetailDrawer.tsx` | Slide-over on row click: full recommendation, source/dest prices. |
| **New** | `components/feedback/GatedFeatureCard.tsx` | Reuse login gate pattern from `HomePage` (lines 302–311, 336–345). |
| **Modify** | `api/client.ts` | Add `getProcurementPdf(params)` → opens `/api/v1/procurement/pdf?...` in new tab. |
| **Modify** | `HomePage.tsx` | Replace inline procurement cards with `<MandiWorkspace />`. |
| **Modify** | `types/api.ts` | Use `ProcurementOpportunity` fields: `source_market`, `destination_price`, `price_gradient_percentage`. |
| **Modify** | `styles/home.css` | `.mandi-table`, `.mandi-drawer`, `.transport-input`. |
| **Modify** | `AppShell.tsx` | Hash `#mandi` unchanged; optional scroll-spy highlight. |

### Gated preview wireframe (logged out)

```
┌────────────────────────────────────────┐
│ 🔒 Mandi comparison                    │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← blurred fake rows
│ Sign in to compare nearby mandi prices │
│ [Login or create account]              │
└────────────────────────────────────────┘
```

| File | Change |
|------|--------|
| `GatedFeatureCard.tsx` | `blurredPreview?: boolean` prop + CSS `filter: blur(4px)`. |
| `HomePage.tsx` | Pass `blurredPreview` for risk + mandi gates. |

---

## Phase 3 — Risk workspace + chart upgrades (Week 2–3)

### Wireframe: Risk Workspace

```
┌─────────────────────────────────────────────────────────────┐
│ MARKET RISK · POTATO · AZADPUR                    [↻ Retry] │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                         │
│ │ 3       │ │ 142     │ │ +₹45/d  │                         │
│ │Warnings │ │Records  │ │Movement │                         │
│ └─────────┘ └─────────┘ └─────────┘                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠ Unusual arrival spike detected · score 0.82         │ │
│ │ ⚠ Price velocity elevated · +12% over 7d              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### File map — Phase 3

| Action | File | What to do |
|--------|------|------------|
| **New** | `features/home/RiskWorkspace.tsx` | Extract risk block from `HomePage`; metric chips + warning list. |
| **New** | `features/home/RiskMetricStrip.tsx` | 3-up stats: anomalies, records analyzed, latest movement. |
| **New** | `features/home/RiskWarningList.tsx` | Maps `riskRecords` with severity styling. |
| **Modify** | `ForecastChart.tsx` | Add: today marker, 7/14 toggle prop, improved peak label, `aria` descriptions. |
| **Modify** | `HomePage.tsx` | Pass `horizon` toggle to chart; lift risk into `RiskWorkspace`. |
| **Modify** | `styles/home.css` | `.risk-metric-strip`, `.risk-warning-row--high|medium`. |

### Chart wireframe

```
Price ₹
  │     ╭──★ Peak (Thu)
  │    ╱╲
  │   ╱  ╲___
  │  ╱░░░░░░░╲    ← shaded P10–P90 band
  └──●───────────→ Days
     Today
[7 days] [14 days]   ← toggles horizon without full page reload
```

---

## Phase 4 — Post-login onboarding (Week 3)

### Wireframe: Onboarding modal (first visit after OTP)

```
Step 1/3                    [Skip]
┌────────────────────────────────────┐
│ Where do you usually sell?         │
│ [MandiCombobox]                    │
│              [Next →]              │
└────────────────────────────────────┘

Step 2/3
│ What crop do you grow most?        │
│ [Crop select]                      │

Step 3/3
│ Get daily alerts?                  │
│ [ ] WhatsApp at [09:00]            │
│ [Save & go to market]              │
```

### File map — Phase 4

| Action | File | What to do |
|--------|------|------------|
| **New** | `features/onboarding/OnboardingModal.tsx` | 3-step wizard; calls `updatePreferences` + optional `createAlert`. |
| **New** | `hooks/useOnboarding.ts` | `localStorage` flag `croplens_onboarding_done` or check empty `home_mandi` on profile. |
| **Modify** | `SessionContext.tsx` | After `setSession`, expose signal for onboarding check. |
| **Modify** | `App.tsx` | Render `<OnboardingModal />` inside `SessionProvider` when authenticated + incomplete profile. |
| **Modify** | `AuthPage.tsx` | Remove duplicate preference setup; defer to onboarding modal. |
| **Modify** | `styles/auth.css` | `.onboarding-modal`, step indicator dots. |
| **Modify** | `LanguageContext.tsx` | Wire unused keys: `chooseCropTitle`, `seePricesTitle`, `getAdviceTitle` for onboarding copy. |

---

## Phase 5 — App shell & mobile polish (Week 3–4)

### Wireframe: Mobile shell

```
┌──────────────────────────────┐
│ CropLens AI    [🌐] [🌙] [●] │
├──────────────────────────────┤
│         (page content)       │
├──────────────────────────────┤
│ 🏠 Market │ ⚠ Risk │ 📍 Mandi │
│ 🔔 Alerts │ 👤 Profile        │
└──────────────────────────────┘

Sticky (home only):
┌──────────────────────────────┐
│ [Check Today's Market]         │
└──────────────────────────────┘
```

### File map — Phase 5

| Action | File | What to do |
|--------|------|------------|
| **Modify** | `AppShell.tsx` | Scroll-spy: highlight nav item when `#market|#risk|#mandi|#alerts` in view. Service pill tooltip via `Tooltip`. Collapse lang+theme into overflow menu on `<768px`. |
| **New** | `components/layout/StickyMarketCta.tsx` | Fixed bottom CTA on home; hides when decision visible. |
| **New** | `components/layout/OfflineBanner.tsx` | Shows when `serviceState === "unavailable"`. |
| **Modify** | `MandiCombobox.tsx` | “Recent” group: profile `home_mandi` + last 3 selections from `localStorage`. |
| **Modify** | `styles/shell.css` | `.sticky-market-cta`, `.offline-banner`, scroll-spy active states. |
| **Modify** | `index.html` | Add `manifest.json` link (PWA phase). |

---

## Phase 6 — Trust layer & metadata (Week 4)

### Wireframe: Trust footer on decision card

```
────────────────────────────────────────
Model v1.2.0 · Data as of 2 Sep 2025, 6:00 AM
How we calculate this →
Not financial advice. Transport costs may apply.
```

| File | Change |
|------|--------|
| `DecisionHeroCard.tsx` | Footer row: `forecast.model_version`, formatted timestamp. |
| `AdviceExplainer.tsx` | Link to static `/methodology` or modal (future). |
| `api/client.ts` | Optionally extend `getHealth()` typing with `HealthResponse`. |
| `types/api.ts` | Use `HealthResponse` for health polling display. |

---

## Shared utilities to introduce

| New file | Purpose |
|----------|---------|
| `lib/format.ts` | `money()`, `formatVelocity()` — dedupe from `HomePage.tsx`. |
| `lib/mandi.ts` | `normalizeMandis(ResourceEntry[]): ResourceOption[]` — dedupe Home + Profile. |
| `hooks/useMarketSelection.ts` | Shared state: `commodity`, `market`, `horizon`, `validSelection`. |
| `hooks/useServiceQuery.ts` | Generic fetch + loading + error + retry pattern for forecast/risk/procurement. |

---

## Component dependency graph (after refactor)

```
HomePage.tsx
├── MarketSelectorForm.tsx
│   └── MandiCombobox.tsx
├── DecisionHeroCard.tsx
│   ├── DecisionBadge.tsx
│   ├── PriceCorridor (inline or extracted)
│   └── AdviceExplainer.tsx
├── ForecastChart.tsx
├── RiskWorkspace.tsx
│   ├── GatedFeatureCard.tsx
│   ├── RiskMetricStrip.tsx
│   └── RiskWarningList.tsx
├── MandiWorkspace.tsx
│   ├── GatedFeatureCard.tsx
│   ├── MandiOpportunityTable.tsx
│   └── MandiDetailDrawer.tsx
├── AlertsPanel.tsx
└── LoadingSkeleton.tsx
```

---

## CSS / design system additions

Add to `tokens.css`:

```css
--decision-sell: var(--amber);
--decision-hold: var(--ink-muted);
--decision-profit: var(--green);
--surface-elevated: var(--card);
--tap-min: 44px;
```

Add to `index.css` or new `styles/components.css`:

- Button variants: `.btn-primary`, `.btn-secondary`, `.btn-ghost` (consolidate scattered `.primary-button`, `.quiet-button`, `.text-button` gradually).
- Page transition: `.page-enter` 150ms fade on route change (`App.tsx` wrapper).

---

## i18n keys to wire (reuse existing unused keys)

| Key (already in `LanguageContext`) | Use in |
|-----------------------------------|--------|
| `chooseCropTitle`, `chooseCropDescription` | Onboarding step 1 |
| `seePricesTitle`, `seePricesDescription` | Onboarding step 2 |
| `getAdviceTitle`, `getAdviceDescription` | Onboarding step 3 |
| `recentPriceChange` | Risk metric strip |
| `themeGroup` | Mobile overflow menu |
| `signedInAs` | Profile dropdown / shell |

---

## API additions (frontend only)

| Endpoint | File | UI surface |
|----------|------|------------|
| `GET /api/v1/procurement/pdf` | `api/client.ts` | Mandi workspace PDF button |
| Existing `GET /health` | `AppShell.tsx` | Offline banner + tooltip |
| Existing forecast fields | `DecisionHeroCard` | `model_version`, `confidence`, `peak_day` |

No backend changes required for Phases 1–5.

---

## Implementation order (checklist)

### Phase 1 ✅ ship first
- [ ] Extract `DecisionHeroCard`, `MarketSelectorForm`, `LoadingSkeleton`
- [ ] Add `DecisionBadge` + `AdviceExplainer`
- [ ] Wire Sonner toasts (profile, alerts, auth)
- [ ] Add P10/P50/P90 tooltips
- [ ] Semantic decision color tokens

### Phase 2
- [ ] `MandiWorkspace` + sortable table
- [ ] PDF export button
- [ ] `GatedFeatureCard` with blur preview
- [ ] `MandiDetailDrawer`

### Phase 3
- [ ] `RiskWorkspace` + metric strip
- [ ] Chart: today marker, horizon toggle, peak label

### Phase 4
- [ ] `OnboardingModal` 3-step flow
- [ ] `useOnboarding` hook

### Phase 5
- [ ] Scroll-spy nav in `AppShell`
- [ ] `StickyMarketCta` mobile
- [ ] `OfflineBanner`
- [ ] Mandi combobox recent group

### Phase 6
- [ ] Model version + timestamp footer
- [ ] `lib/format.ts` + `lib/mandi.ts` dedupe
- [ ] PWA manifest (optional)

---

## What not to change

- Routes (`/`, `/auth`, `/profile`) until Phase 5+ stable
- Color palette / fonts (Fraunces + Source Sans 3)
- Hindi/English bilingual support
- Cookie-based auth + CSRF flow
- `serviceState.ts` error mapping logic

---

## Success metrics (how you know it’s “pro”)

1. User sees **SELL/WAIT/HOLD** within 2 seconds of submitting crop+mandi.
2. Logged-out users understand value via **blurred gated previews**, not empty cards.
3. Mandi section feels like a **trader tool** (table + PDF), not a bullet list.
4. Every save/login/alert action gives **toast feedback**.
5. Mobile users can check market without scrolling back to top (sticky CTA).

---

*Generated from codebase scan — maps to `frontend/client/src` as of CropLens AI current structure.*
