# CropLens — Frontend hierarchy & compliance spec

Farmer-first information architecture. Every feature must map to a level and stay in scroll order.  
**Rule:** If it does not serve L2 (the decision), it sits below L2 or unlocks after intent (auth).

---

## Legend (L0–L7)

| Level | Name | Farmer question | Content | Auth |
|-------|------|-----------------|---------|------|
| **L0** | Shell | Where am I? What language? | Logo, lang, theme, login/profile, minimal nav | Login always available for guests |
| **L1** | Context | Which crop, which mandi? | Crop, mandi, horizon, **Check market** CTA | Open to all |
| **L2** | Decision ★ | Sell or wait? What price? | Badge, price, range, gain, best day, voice, WhatsApp | Open to all |
| **L3** | Proof | Why believe this? | Chart, best-day caption | Open to all |
| **L4** | Alternatives | Better mandi after travel? | Ranked mandis, transport ₹, net gain | Signed in |
| **L5** | Risk | Anything dangerous? | One plain line (OK / watch out) | Signed in |
| **L6** | Account | Save my mandi / sign out | `/profile` — prefs, mobile, sign out | Signed in |
| **L7** | Retention | Remind me tomorrow? | Alert channel, time, save | Signed in |

**Attention weight:** L2 ≫ L1 ≫ L3 > L4 ≈ L5 > L7 > L0 chrome

---

## Auth in the hierarchy

Auth is **not** a homepage module. It unlocks levels and feeds L1.

| State | Can access | Auth entry |
|-------|------------|------------|
| Guest | L0–L3 | L0 **Login**; inline gates on L4, L5, L7 |
| Signed in | L0–L7 | L0 **Profile**; L6 on `/profile` |
| After login/signup | Land on `/` (L1–L2), not profile-first | Short setup (Phase 4) → back to L1 |

**Auth entry priority**

1. L0 shell — small Login / Profile (never blocking)
2. Inline gate — when user scrolls to L4, L5, or L7
3. Post-signup — 2–3 steps: home mandi, crop, optional alert → market view

---

## Single-page scroll order (target)

```
┌─────────────────────────────────────────────────────────────┐
│ L0  Shell — logo · lang · theme · Login|Profile · slim nav  │
├─────────────────────────────────────────────────────────────┤
│ L1  Context — crop · mandi · [Check market]  (sticky mobile)│
├─────────────────────────────────────────────────────────────┤
│ L2  Decision ★ — full width, dominant                       │
├─────────────────────────────────────────────────────────────┤
│ L3  Proof — chart, best day                                 │
├─────────────────────────────────────────────────────────────┤
│ L4  Alternatives — mandi list + net gain    [gate if guest] │
├─────────────────────────────────────────────────────────────┤
│ L5  Risk — one line                         [gate if guest] │
├─────────────────────────────────────────────────────────────┤
│ L7  Retention — alerts                      [gate if guest] │
└─────────────────────────────────────────────────────────────┘

L6 = /profile only (linked from L0)
```

**Do not:** equal-weight top nav for Forecast | Risk | Mandi as separate products.

---

## User flows

### Guest (first visit)

```
L0 → L1 (pick crop + mandi) → Check market → L2 → L3
  → scroll → L4/L5/L7 gated → Login if wanted → L1 prefs → L2 again
```

### Returning signed-in user

```
L0 → L1 (pre-filled / recents) → one tap Check market → L2 → L3 → L4 → L5 → L7
```

### Post-signup (Phase 4)

```
/auth success → / → optional 3-step modal (mandi, crop, alert) → L1 filled → L2
```

---

## Compliance checklist

Use when reviewing PRs or planning phases. Mark: ✅ done · ⚠️ partial · ❌ not done · — N/A

### Structure (fix before new features)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| S1 | Results stack **single column**: L2 then L3 (never side-by-side on desktop) | ✅ | `result-grid` is 1 column |
| S2 | Scroll order: **L4 mandi before L5 risk** | ✅ | Mandi block precedes risk in `HomePage` |
| S3 | Nav is **not** peer modules (Forecast / Risk / Mandi as equals) | ✅ | `AppShell`: Market + Alerts only |
| S4 | L0 shows **Login** for guests, **Profile** when signed in | ✅ | Shell + mobile nav |
| S5 | L1 **collapses** after first check; sticky CTA on mobile | ✅ | Compact context bar, sticky CTA, recents, offline banner |
| S6 | Brand tagline i18n in shell + auth (no hardcoded English in HI mode) | ✅ | `brandTagline` key |

### Content & auth (largely done)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| C1 | Guest gets L2 + L3 without account | ✅ | Forecast + decision hero |
| C2 | L4, L5, L7 gated with inline login CTA | ✅ | Gated cards + AlertsPanel |
| C3 | Post-login redirect to `/` market view | ✅ | `AuthPage` |
| C4 | L2 plain farmer copy; no P10/P50, no EN/HI mix | ✅ | Farmer copy pass |
| C5 | L5 one plain message, no analyst dashboard | ✅ | riskAllClear / riskWatchOut |
| C6 | L7 below L4/L5 on same page | ✅ | `AlertsPanel` after results |

### Phases (farmer-first roadmap)

| Phase | Levels | Status | Delivers |
|-------|--------|--------|----------|
| 1 | L1–L3, partial L7 | ✅ Done | Hero, chart, toasts, farmer copy |
| 2 | L4 | ✅ | Mandi table, transport ₹, net gain |
| 3 | L3, L5 | ✅ | Chart 7/14 toggle, today + best-day markers, RiskWorkspace |
| 4 | L6 → L1, L7 | ❌ | Post-signup 2–3 step setup |
| 5 | L0, L1 | ❌ | Sticky L1, recents, offline banner, PWA optional |

**Out of scope (removed from plan):** PDF export, blur gates, risk metric strip, scroll-spy workspaces, model version footer.

---

## Design contract (non‑negotiable)

1. **One hero** — only L2 uses large badge and primary emphasis.
2. **One CTA per zone** — L1 = Check market; gates = Login to unlock.
3. **Value before signup** — L2 + L3 without account.
4. **Auth on intent** — signup when user wants mandi, risk, or alerts.
5. **One language on screen** — full EN or full HI.
6. **No new top-level tabs** unless they map to L0 or L6 only.

---

## PR review questions

Before merging UI work, ask:

1. Which level (L0–L7) does this change serve?
2. Does it sit **below** L2 in the scroll order?
3. Does it add a nav item that competes with L2?
4. Does it expose trader jargon or bilingual mixing?
5. Does it block L2 for guests?

If any answer violates the contract, rework before ship.

---

## Implementation priority

1. **S1** — Single-column L2 → L3 layout  
2. **S2** — Swap mandi before risk  
3. **S3** — Simplify shell nav  
4. **S4** — Login vs Profile in L0  
5. **S6** — i18n tagline  
6. **S5 + Phases 2, 4, 5** — build inside the stack, not beside it  

---

*Aligned with farmer-first phases (2–5). Update status column as work ships.*
