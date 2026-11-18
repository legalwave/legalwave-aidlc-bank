# Code Generation Plan — Responsive Login/Register Design (LegalWave)

**Unit**: `responsive-auth`
**Date**: 2026-10-31
**Deliverable**: `context-docs/mockups/08-responsive-login-register.html` (one new file)
**Requirements**: `aidlc-docs/inception/requirements/responsive-auth/requirements.md`
**Execution plan**: `aidlc-docs/inception/plans/responsive-auth-execution-plan.md`

---

## Unit Context

### Stories implemented by this unit

No user stories were generated for this unit (User Stories was skipped — one persona, one screen, and acceptance criteria already live at rule level in FR-4, FR-5, FR-7, and NFR-1). This plan therefore traces to **requirements**, not stories. The traceability table at the end of this document maps every step to the requirements it satisfies.

### Dependencies on other units / services

**None.** The artifact is a standalone document:
- No import from `frontend/` (React 19 + Vite) or `backend/` (FastAPI).
- No API contract, no shared module, no data store.
- No build step, no package.json entry, no bundler configuration.
- Exactly one permitted external resource: the Google Fonts stylesheet (FR-8.5).

### Expected interfaces and contracts

| Interface | Direction | Contract |
|---|---|---|
| Google Fonts stylesheet | outbound HTTPS GET | The only network request the page may make (FR-8.5). SRI-protected — see Step 4. |
| User input (email/username, password, name) | inbound, in-page | Validated in-page; never transmitted, never persisted, never logged (NFR-4.5). |
| DOM mutation | internal | All dynamic content written with `textContent`, never `innerHTML` (NFR-4.2, NFR-4.9). |

### Database entities owned by this unit

**None.** No persistence of any kind.

### Service boundaries and responsibilities

**None.** One HTML document containing one inline `<style>` and one inline `<script>`. The script's internal responsibilities are enumerated in Step 8.

---

## Critical Decisions Made During Planning

### D1 — Google Fonts SRI hash: an empirical finding that changes the implementation

**The requirement (NFR-4.6 / SECURITY-13) says** the external stylesheet must carry a correct `integrity` hash and `crossorigin="anonymous"`, *or* the artifact ships without the external stylesheet and relies on the local fallback stack.

**I tested this empirically rather than assuming.** Google Fonts does content negotiation on the `User-Agent` header and returns **different CSS bytes** for different browsers — different font subset variants (latin vs. latin-ext) and different signed `fonts.gstatic.com` URLs. Measured on 2026-10-31:

| Request variant | Chrome | Firefox | Safari | Stable per UA? |
|---|---|---|---|---|
| `css2` (default) | 11,196 B | 11,196 B | 11,355 B | Yes |
| `css2` + `text=` subset pin | 3,546 B | 3,546 B | 3,579 B | Yes |
| legacy `css?family=` | 11,355 B | 11,355 B | 11,508 B | Yes |

Six distinct `sha256` hashes across the variants tested. **No single hardcoded `integrity` value can satisfy all browsers** — a hash computed from the Chrome response would block the stylesheet from loading in Safari (SRI mismatch = resource refused), and vice versa.

**Decision**: implement **both** halves of NFR-4.6's disjunction:
1. Ship the `<link>` **with** `integrity` + `crossorigin="anonymous"` using the hash for the dominant desktop-Chromium/Firefox response, **and**
2. Ship a robust local fallback stack (`Georgia, 'Times New Roman', serif` / `system-ui, -apple-system, 'Segoe UI', sans-serif`) so that if SRI refuses the resource in some browser, the design still renders correctly and accessibly.

This satisfies SECURITY-13 for the environments where the hash is authoritative, and guarantees the artifact never renders unstyled or unreadable anywhere else. The deviation (a browser that rejects the stylesheet falls back to the local stack rather than loading the webfont) is recorded in the Build and Test stage as a **documented, accepted deviation** — and is strictly better than the alternative of omitting SRI entirely, which SECURITY-13 forbids.

**The hash to use**: `sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=` — computed from the `css2` response for Chrome and Firefox (the two engines that agree), and independently cross-verified with `openssl dgst -sha256 -binary | openssl base64 -A`.

**Re-verification**: Step 12 re-fetches the stylesheet and re-computes the hash to confirm the pinned value still matches, so a silent upstream change is caught rather than silently breaking fonts.

### D2 — Tab implementation

The full WAI-ARIA APG tablist pattern (FR-3.2, FR-3.3): `role="tablist"`, `role="tab"` with `aria-selected` + `aria-controls`, `role="tabpanel"` with `aria-labelledby`, roving `tabindex`, and Left/Right arrow-key navigation with Home/End support.

### D3 — Annotation connector lines

Inline SVG overlay positioned above the contract document, with the cards as HTML positioned above that (FR-2.7). The connector paths are drawn in the SVG; the analysis prose stays real, selectable, translatable HTML text.

### D4 — No test runner

The project has no test runner and the property-based-testing extension is disabled. Verification is therefore **static analysis + a manual E2E checklist**, both authored in the Build and Test stage. This plan includes a static-analysis script in Step 12 so at least the mechanical checks are automated.

### D5 — `data-testid` attributes

Per the automation-friendly code rules, every interactive element receives a stable `data-testid` following the `{component}-{element-role}` convention. These are additive and do not affect the visual design.

### D6 — The light-theme accent is split into three roles (added during Part 2)

The brief specifies the light-theme accent as `#B8741A`, but that value measures **3.60:1** as text on the cream panel and **3.78:1** behind white button ink — both below the 4.5:1 that NFR-1.3 requires in both themes. The mandated colour is preserved as the *fill*; the roles that carry text get their own tokens:

| Token | Dark | Light | Role |
|---|---|---|---|
| `--accent` | `#E3A53A` | `#B8741A` | fills, borders, focus rings (non-text → 3:1) |
| `--accent-text` | `#E3A53A` | `#96600F` | accent-coloured text on the form panel (→ 4.5:1) |
| `--accent-ink` | `#1A1208` | `#1A1208` | ink on an amber fill (→ 4.5:1, since `#1A1208` on `#B8741A` is 4.90:1) |
| `--art-accent` | `#E3A53A` | *(inherited)* | amber on the always-dark artwork panel |

`--art-accent` also fixes a second defect: the artwork panel was reading the theme-swapped `--accent`, which put `#B8741A` on the `#1E1D1C` annotation card at 4.45:1. The artwork panel stays dark in both themes (FR-2.10), so its amber must not follow the form panel's swap.

Both decisions are **documented refinements**, not deviations from the brief — the mandated `#B8741A` is still the light theme's amber fill. Recorded in the generation notes and asserted by 39 contrast checks in the static verifier.

### D7 — The success-card reset restores in place (added during Part 2)

The first implementation called `window.location.reload()`. A reload discards state, flashes the page, and makes "use a different account" feel like leaving the page. The shipped implementation hides the form's children, shows a dedicated `#success-region` container, and on reset unhides the form, clears the container, clears every input value and the "Keep me signed in" checkbox, resets the validation state, and focuses the first field — with no reload and no `innerHTML`.

---

## Step-by-Step Generation Plan

> **This plan is the single source of truth for Code Generation.** Each step is executed in order. Checkboxes are marked `[x]` immediately upon completion. Do not deviate from the sequence — later steps depend on the DOM ids established in Step 4.

### Step 1 — Create the file skeleton and document head

- [x] Create `context-docs/mockups/08-responsive-login-register.html` (confirm it does not already exist — brownfield check)
- [x] `<!doctype html>`, `<html lang="en">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [x] `<title>Sign in — LegalWave</title>`
- [x] `<link rel="preconnect" href="https://fonts.googleapis.com">` and `href="https://fonts.gstatic.com" crossorigin
- [x] The Google Fonts `<link>` with `integrity="sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s="` and `crossorigin="anonymous"` (D1)
- [x] Open `<style>` and `<script>` blocks with section banner comments
- **Traces to**: FR-8.1, FR-8.2, FR-8.4, FR-8.5, NFR-2.1, NFR-4.6

### Step 2 — Token block (`<style>` section 1)

- [x] `:root` custom properties for the dark theme, exactly as specified in FR-6.1: `--bg-canvas:#1E1D1C`, `--bg-panel:#262524`, `--bg-input:#2B2A29`, `--border:#3A3836`, `--text:#ECE8E1`, `--text-muted:#A09B93`, `--accent:#E3A53A`, `--accent-ink:#1A1208`, `--verdict-green:#6FBF73`, `--verdict-yellow:#E8C24A`, `--artwork-bg:#171615`, `--contract-paper:#EFEBE2`
- [x] Radius token `--radius:10px` (FR-6.5)
- [x] Font tokens: `--font-serif:'Newsreader',Georgia,'Times New Roman',serif` and `--font-sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif` (FR-6.4, with the D1 fallback stack)
- [x] Supporting tokens for the artwork only (glow colour, ruled-line colour, highlight tints, connector stroke) — all values derived from the specified palette
- [x] `@media (prefers-color-scheme: light)` block overriding only the **form-panel** tokens: `--bg-canvas:#F5F2EC`, `--accent:#B8741A`, plus any form text/border tokens needed for 4.5:1 contrast in the light theme (FR-6.2, FR-6.3, NFR-1.3)
- [x] **The artwork tokens are deliberately NOT overridden** — the artwork panel stays dark in both themes (FR-2.10, FR-6.3)
- **Traces to**: FR-2.1, FR-2.10, FR-6.1, FR-6.2, FR-6.3, FR-6.4, FR-6.5, NFR-5.2, NFR-5.3

### Step 3 — Base layout and the 900px breakpoint (`<style>` section 2)

- [x] `.page` grid: `grid-template-columns: 55fr 45fr` on desktop (FR-1.1)
- [x] Both panels `min-height:100vh`; the form panel centres its content vertically (FR-1.4)
- [x] `@media (max-width:900px)`: the grid collapses to a single column; the artwork panel becomes a ~200px banner (FR-1.2)
- [x] In the banner, only the brand lockup is visible — the contract page, scan line, and annotation cards are `display:none` below 900px (FR-1.3)
- [x] Overflow guards: `body{overflow-x:hidden}` is **not** used as a substitute for real reflow; the 320px→2560px range must fit without horizontal scroll (NFR-2.1, NFR-2.2, NFR-2.3)
- [x] Annotation cards reposition within the artwork panel at intermediate widths rather than overflowing (NFR-2.4)
- **Traces to**: FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5, NFR-2.1, NFR-2.2, NFR-2.3, NFR-2.4

### Step 4 — Artwork panel markup and styles (`<style>` sections 3–4)

- [x] Brand lockup: inline SVG scales-of-justice icon in amber + serif "LegalWave" wordmark, top-left (FR-2.8); the SVG is `aria-hidden="true"`
- [x] Artwork background: `#171615` + a soft amber radial glow + faint horizontal ruled lines (FR-2.1); the glow and ruled lines are `aria-hidden="true"` (FR-7.9)
- [x] Contract page: `#EFEBE2`, `transform: rotate(-1.6deg)` (FR-2.2)
- [x] Contract text in the serif face: title "Service Agreement"; **written** Article 12 (Termination) prose; **written** Article 13 (Governing Law) prose; a third section of grey skeleton bars (FR-2.2, Q2-A)
- [x] Yellow and green highlighted phrases within the contract text (FR-2.3) using `mark`/`span` with the verdict colours at a readable tint
- [x] Bottom-left serif headline "Every clause, checked against the statute." + one-line subtext (FR-2.9)
- [x] Annotation cards (FR-2.5): each with a small statute reference label including an **e-Gov** marker, a GREEN/YELLOW verdict chip, and one sentence of analysis
- [x] Every card cites a **real Civil Code article** (FR-2.6). Use the brief's own example — "Civil Code, Art. 541 · e-Gov: termination after a failed cure is consistent with statute" — for the termination card, plus Art. 132 (public policy) and Art. 1 (good faith) for the other two
- [x] The verdict chip carries the **text** "GREEN" / "YELLOW" so the verdict is never conveyed by colour alone (FR-7.10)
- [x] Cards overlap the document's right edge and are positioned in the artwork panel
- **Traces to**: FR-2.1, FR-2.2, FR-2.3, FR-2.5, FR-2.6, FR-2.8, FR-2.9, FR-2.10, FR-7.9, FR-7.10, NFR-6.1, NFR-6.3

### Step 5 — SVG connector overlay (`<style>` section 5 + inline `<svg>`)

- [x] An inline `<svg>` layer positioned absolutely above the contract document, `aria-hidden="true"`, `pointer-events:none` (FR-7.9)
- [x] One thin amber path per card, drawn from the card's reference point to the corresponding location on the document (FR-2.5, FR-2.7)
- [x] The SVG uses `viewBox` + percentage coordinates so the connectors track the cards when the layout reflows (NFR-2.4)
- [x] The connector stroke colour comes from a token, not a literal hex (NFR-5.2)
- **Traces to**: FR-2.5, FR-2.7, FR-7.9, NFR-2.4, NFR-5.2

### Step 6 — Form panel markup (`<style>` section 6 + `<body>` markup)

- [x] Tablist: `<div role="tablist" aria-label="Authentication mode">` containing two `<button role="tab">` elements — "Sign in" and "Create account" (FR-3.1, FR-3.2)
- [x] Each tab: `id`, `aria-selected`, `aria-controls` pointing at its panel; the inactive tab has `tabindex="-1"` (roving tabindex, FR-3.3)
- [x] Two `<div role="tabpanel">` elements, each with `aria-labelledby` back to its tab (FR-3.2)
- [x] A single sliding underline element that moves between the tabs via `transform` (FR-3.1)
- [x] **Sign in panel**: heading "Welcome back" (serif) + one-line subtitle; "Email or username" field; "Password" field with a Show/Hide toggle; "Keep me signed in" checkbox; "Forgot password?" amber link (FR-3.4, FR-3.5)
- [x] **Create account panel**: heading "Create your account" (serif) + one-line subtitle; "Full name" field; "Email" field; "Password" field with a Show/Hide toggle (FR-3.4, FR-3.6)
- [x] Every input has an associated `<label for>` (FR-7.6); every field has a placeholder and an `autocomplete` attribute
- [x] The password Show/Hide toggle is a `<button type="button">` with an `aria-label` naming the action (FR-3.7, FR-7.8) and `aria-pressed` reflecting state
- [x] Full-width amber primary button with dark text (FR-3.8); an "or" divider (FR-3.9); a "Continue with Google" outline button (FR-3.9)
- [x] Footer: "Not legal advice · Verdicts are informational" in small, letter-spaced, uppercase, muted text (FR-3.13)
- [x] **No additional prototype notice** is rendered in the page (FR-3.14)
- [x] `data-testid` on every interactive element (D5)
- **Traces to**: FR-3.1 … FR-3.14, FR-7.6, FR-7.7, FR-7.8, NFR-1.5, NFR-6.1, NFR-6.3

### Step 7 — Form styles (`<style>` section 7)

- [x] Inputs and buttons use `border-radius:10px` (FR-6.5)
- [x] Input surface `#2B2A29`, border `#3A3836` in the dark theme (FR-6.1)
- [x] Clear amber focus ring on every interactive element — `:focus-visible` with an amber outline plus offset, meeting ≥3:1 (FR-6.6, NFR-1.2)
- [x] Error state: a border treatment **and** an error icon/marker, so the invalid state is not conveyed by colour alone (FR-4.4, NFR-1.6)
- [x] Error message text styled in a readable colour meeting 4.5:1 in both themes (NFR-1.3)
- [x] Primary button: amber fill, dark text, **no gradient** (FR-3.8, FR-6.7)
- [x] The verdict chip colours are used only on the chips; no neon values anywhere (FR-6.7)
- [x] Copy tone is quiet, professional, and trustworthy — no exclamation marks, no marketing superlatives, no urgency language (FR-6.8)
- [x] Touch targets ≥44×44px on touch viewports (NFR-2.5)
- **Traces to**: FR-3.8, FR-4.4, FR-6.1, FR-6.5, FR-6.6, FR-6.7, FR-6.8, NFR-1.2, NFR-1.3, NFR-1.6, NFR-2.5

### Step 8 — JavaScript (`<script>` section 8)

Named functions, no framework (NFR-5.4):

- [x] `selectTab(tab)` — sets `aria-selected`, roving `tabindex`, shows the target panel, hides the other, moves the underline, and **resets the other mode's validation state** (FR-3.1, FR-5.2)
- [x] `onTabKeydown(event)` — Left/Right arrows move between tabs and activate the focused tab (APG "automatic activation"); Home/End jump to the first/last tab (FR-3.3)
- [x] `togglePassword(button)` — swaps the sibling input's `type` between `password` and `text`; updates the button's `aria-label` and `aria-pressed` (FR-3.7)
- [x] `validateField(field, mode)` — returns an error message or `null`; implements exactly the FR-4 rule set:
  - sign-in identifier: non-empty, and either a valid email **or** a valid username (FR-4.5)
  - register identifier: non-empty and a valid email (FR-4.5)
  - register name: non-empty (FR-4.7)
  - register password: ≥8 characters, trimmed of whitespace-only input (FR-4.6, FR-4.8)
  - sign-in password: non-empty, **no length rule** (FR-4.6)
  - every message states what is wrong **and** how to fix it (FR-4.2)
- [x] `validateForm(mode)` — validates every field in the active mode, wires each error message via `aria-describedby`, sets the error class, and returns a boolean (FR-4.1, FR-4.3)
- [x] `onFieldBlur(event)` — re-validates that one field if the form has already been submitted (FR-4.1)
- [x] `showFieldError(field, message)` / `clearFieldError(field)` — write the message with **`textContent`**, never `innerHTML` (NFR-4.2, NFR-4.9); set/clear `aria-invalid`; toggle the error class and the error marker
- [x] An `aria-live="polite"` region announces validation outcomes (FR-4.3, NFR-1.4)
- [x] `onSubmit(event)` — calls `preventDefault()` (FR-5.1), runs `validateForm`, and on success replaces the form panel's contents with the success card (FR-5.3)
- [x] `showSuccess(mode, values)` — builds the success card using `createElement` + `textContent` for every dynamic value; states that this is a demo and that **no account was created or signed in**; reflects the "Keep me signed in" checkbox state (FR-5.2, FR-5.3, FR-5.4, FR-3.12, NFR-4.2)
- [x] `resetToForm()` — the "Use a different account" link restores the form (FR-5.3)
- [x] `showDemoNotice(message)` — the inline notice used by "Continue with Google" and "Forgot password?"; each explains that the feature is not connected in the prototype (FR-3.10, FR-3.11)
- [x] **Fail-safe wrappers** — each handler is guarded so an unexpected condition produces a generic message rather than an exception, and never leaves the form in a partially-submitted state (NFR-4.7, SECURITY-15)
- [x] **No `innerHTML` with user values**, no `eval`, no `Function`, no `document.write` (NFR-4.2, NFR-4.8, NFR-4.9)
- [x] **No password is stored, logged, or transmitted** — no `localStorage`, no `sessionStorage`, no cookie, no `console` output of any field value (NFR-4.5, SECURITY-12)
- [x] **No network request** is made by the form's own logic (FR-5.5)
- **Traces to**: FR-3.7, FR-3.10 … FR-3.12, FR-4.1 … FR-4.8, FR-5.1 … FR-5.5, FR-7.6, FR-7.8, NFR-1.4, NFR-4.1 … NFR-4.9, NFR-5.4

### Step 9 — Motion (`<style>` section 9)

- [x] Scan line: an amber line sweeping down the contract page on a **6-second** looping animation, implemented with `transform` only (FR-2.4, FR-7.2, NFR-3.2, NFR-3.3)
- [x] The scan line is `aria-hidden="true"` (FR-7.9)
- [x] Annotation cards: a **one-shot** staggered fade-in at approximately 0.4s / 0.8s / 1.2s, animated with `opacity` (FR-7.3, Q13-A)
- [x] These are the **only two automatic motions** in the artifact (FR-7.1) — no other transition, pulse, or loop exists
- [x] `@media (prefers-reduced-motion: reduce)`:
  - the scan line does not animate — it is hidden or held static (FR-7.4)
  - the annotation cards appear immediately with no fade (FR-7.4)
  - the tab underline transition is disabled — it jumps instantly (FR-7.5)
  - no other motion occurs (FR-7.5)
- **Traces to**: FR-2.4, FR-7.1, FR-7.2, FR-7.3, FR-7.4, FR-7.5, FR-7.9, NFR-3.2, NFR-3.3

### Step 10 — Accessibility polish pass (`<style>` section 10 + markup sweep)

- [x] Every decorative element carries `aria-hidden="true"` — the glow, ruled lines, scan line, connector SVG, and scales icon (FR-7.9)
- [x] Every interactive element is keyboard reachable and shows a visible focus indicator (NFR-1.1, NFR-1.2)
- [x] The full tab sequence is logical: tablist (one stop) → active panel's fields → buttons
- [x] No interactive element relies on colour alone to convey state (NFR-1.6)
- [x] The annotation cards, being non-interactive, are **not** in the tab order (FR-7.11)
- **Traces to**: FR-7.6 … FR-7.11, NFR-1.1, NFR-1.2, NFR-1.6

### Step 11 — Commented section structure (NFR-5.1)

- [x] The `<style>` block is divided into clearly-labelled sections: tokens, layout, artwork, form, motion, behaviour
- [x] The `<script>` is divided into clearly-labelled sections: state, tab handling, validation, notices, success
- [x] Every section opens with a banner comment naming the requirement group it implements (e.g. `/* ---- FR-2: Artwork panel ---- */`)
- **Traces to**: NFR-5.1, NFR-5.4

### Step 12 — Static verification of the generated file

- [x] Write `aidlc-docs/scripts/verify-responsive-auth.py` — a static checker that asserts:
  - no unclosed or unbalanced HTML tags
  - no duplicate `id` attributes
  - every `aria-controls` resolves to an existing `id`
  - every `aria-labelledby` resolves to an existing `id`
  - every `aria-describedby` resolves to an existing `id`
  - every `<input>` has an associated `<label for>`
  - the `role="tab"` / `role="tabpanel"` / `role="tablist"` wiring is complete and consistent
  - no `innerHTML`, `eval(`, `new Function`, or `document.write` appears
  - no `localStorage`, `sessionStorage`, `document.cookie`, or `console.log` appears
  - no `<form>` has an action/method pointing at a real endpoint
  - **the only outbound URL in the file is the Google Fonts stylesheet and its preconnect origins** — no `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket`, `EventSource`, or `<img src="http…">` appears, so the page makes no network round trip beyond the optional font request (NFR-3.1, FR-5.5)
  - every specified hex value from FR-6.1 appears in the token block, and no colour literal appears **outside** the token block (NFR-5.2)
  - the required copy strings appear verbatim (NFR-6.3)
  - a `prefers-reduced-motion: reduce` block exists and disables the scan-line animation and the card fade
  - the `integrity` attribute is present on the font link with `crossorigin="anonymous"`
- [x] Write `aidlc-docs/scripts/verify-font-sri.py` — re-fetches the Google Fonts stylesheet for the Chrome UA, recomputes the `sha256` base64 digest, and asserts it still equals the pinned `integrity` value (D1 re-verification)
- [x] Run both scripts and record the output
- [x] Confirm `frontend/` and `backend/` are unchanged — `git status` is unavailable (not a git repo), so verify by timestamp comparison and by confirming the checker's file list contains no path under `frontend/` or `backend/`
- **Traces to**: NFR-3.1, NFR-4.2, NFR-4.5, NFR-4.6, NFR-4.8, NFR-4.9, NFR-5.2, NFR-6.2, NFR-6.3, FR-3.2, FR-4.3, FR-5.5, FR-7.4

### Step 13 — Documentation generation

- [x] Create `aidlc-docs/construction/responsive-auth/code/generation-notes.md` recording:
  - the D1 SRI finding in full, with the measured hashes, and the rationale for the accepted deviation
  - the DOM id scheme
  - the `data-testid` inventory
  - the validation rule table as implemented
  - the requirement-to-implementation traceability map
- [x] **No README update** — `frontend/README.md` describes the React app, which this unit does not touch (FR-8.3)
- [x] **No deployment artifacts** — a static file needs none
- **Traces to**: FR-8.3, NFR-5.1

### Step 14 — Final review against the requirements

- [x] Walk the NFR-6.1 element checklist: three annotation cards, scan line, ruled lines, glow, contract page with two written articles and skeleton bars, brand lockup, headline and subtext, both tabs, all named fields, both buttons, the divider, the disclaimer footer
- [x] Walk the NFR-6.3 verbatim copy list
- [x] Confirm FR-1.5 — the create-account form fits within 1440×900 without scrolling
- [x] Confirm no changes under `frontend/` or `backend/`
- **Traces to**: FR-1.5, FR-8.3, NFR-6.1, NFR-6.2, NFR-6.3

---

## Traceability — Step to Requirement

| Step | Requirements satisfied |
|---|---|
| 1 — File skeleton and head | FR-8.1, FR-8.2, FR-8.4, FR-8.5, NFR-2.1, NFR-4.6 |
| 2 — Token block | FR-2.1, FR-2.10, FR-6.1, FR-6.2, FR-6.3, FR-6.4, FR-6.5, NFR-5.2, NFR-5.3 |
| 3 — Base layout and breakpoint | FR-1.1 … FR-1.5, NFR-2.1 … NFR-2.4 |
| 4 — Artwork panel | FR-2.1, FR-2.2, FR-2.3, FR-2.5, FR-2.6, FR-2.8, FR-2.9, FR-2.10, FR-7.9, FR-7.10, NFR-6.1, NFR-6.3 |
| 5 — SVG connectors | FR-2.5, FR-2.7, FR-7.9, NFR-2.4, NFR-5.2 |
| 6 — Form panel markup | FR-3.1 … FR-3.14, FR-7.6, FR-7.7, FR-7.8, NFR-1.5, NFR-6.1, NFR-6.3 |
| 7 — Form styles | FR-3.8, FR-4.4, FR-6.1, FR-6.5, FR-6.6, FR-6.7, NFR-1.2, NFR-1.3, NFR-1.6, NFR-2.5 |
| 8 — JavaScript | FR-3.7, FR-3.10 … FR-3.12, FR-4.1 … FR-4.8, FR-5.1 … FR-5.5, NFR-1.4, NFR-4.1 … NFR-4.9, NFR-5.4 |
| 9 — Motion | FR-2.4, FR-7.1 … FR-7.5, FR-7.9, NFR-3.2, NFR-3.3 |
| 10 — Accessibility polish | FR-7.6 … FR-7.11, NFR-1.1, NFR-1.2, NFR-1.6 |
| 11 — Commented structure | NFR-5.1, NFR-5.4 |
| 12 — Static verification | NFR-4.2, NFR-4.5, NFR-4.6, NFR-4.8, NFR-4.9, NFR-5.2, NFR-6.2, NFR-6.3, FR-3.2, FR-4.3, FR-7.4 |
| 13 — Documentation | FR-8.3, NFR-5.1 |
| 14 — Final review | FR-1.5, FR-8.3, NFR-6.1, NFR-6.2, NFR-6.3 |

**Coverage check**: every requirement ID in `requirements.md` appears in at least one row. Requirements with no implementation step would be a blocking gap.

---

## Files

### Created
- `context-docs/mockups/08-responsive-login-register.html` — **the deliverable**
- `aidlc-docs/scripts/verify-responsive-auth.py` — static verifier
- `aidlc-docs/scripts/verify-font-sri.py` — SRI hash re-verifier
- `aidlc-docs/construction/responsive-auth/code/generation-notes.md` — documentation

### Modified
**None.** No existing file is touched. In particular, `frontend/` and `backend/` are not modified (FR-8.3), and the seven existing mockups are left alone.

---

## Estimated Scope

- **Total steps**: 14
- **Steps producing the artifact**: 11 (Steps 1–11)
- **Steps verifying it**: 2 (Steps 12, 14)
- **Steps documenting it**: 1 (Step 13)
- **Files created**: 4 (1 deliverable + 2 verifier scripts + 1 notes file)
- **Files modified**: 0
- **Dependencies added**: 0
- **Backend calls**: 0

---

## Approval Gate

This plan is presented for review. On approval, Part 2 — Generation begins and executes Steps 1 through 14 in order.

---

## Execution Record — Part 2 complete (2026-10-31)

All 14 steps executed; all 93 checkboxes marked `[x]`.

| # | Step | Outcome |
|---|---|---|
| 1 | File skeleton and document head | Created; SRI link added with the D1 hash |
| 2 | Design tokens | Dark `:root`, light override, artwork tokens scoped out of the light theme |
| 3 | Layout and responsive | `55fr 45fr` grid, 900px breakpoint, 200px mobile banner |
| 4 | Artwork panel | Brand lockup, contract page, 3 articles, 5 skeleton bars, 3 annotation cards, scan line, connectors |
| 5 | Form panel | Tablist, both panels, every field, buttons, divider, disclaimer |
| 6 | Styling refinements | Radii, focus rings, error states, no gradients |
| 7 | JavaScript — tabs | APG tab pattern with roving tabindex and Home/End |
| 8 | JavaScript — validation | Full FR-4 rule set, `textContent` only |
| 9 | JavaScript — notices, success, reset | Inline notices, success card, in-place reset (D7) |
| 10 | Motion | Scan sweep 6s, staggered card fade, reduced-motion block |
| 11 | Accessibility pass | `aria-hidden` on decoratives, live region, keyboard order |
| 12 | Verification scripts | 142 static checks + SRI re-verification + 45 CDP behaviour checks |
| 13 | Documentation | `generation-notes.md` — SRI finding, id scheme, testid inventory, validation table, traceability |
| 14 | Final review | Element checklist ✓, verbatim copy ✓, FR-1.5 fits 1440×900 with 0px overflow ✓, `frontend/`+`backend/` untouched ✓ |

### Verification results

| Verifier | Result |
|---|---|
| `verify-responsive-auth.py` | **142/142 PASS** (103 original + 39 contrast) |
| `verify-font-sri.py` | **HASH MATCHES** — `sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=` |
| `verify-responsive-auth-behaviour.js` | **45/45 PASS** — all interaction checks |

### Defects found and fixed during Part 2

| # | Defect | Fix |
|---|---|---|
| 1 | `#3B3733` and `#F2C877` used as raw hex outside the token blocks (NFR-5.2) | Promoted to `--art-ink-body` and `--scan-core` |
| 2 | Annotation cards overlapped the contract text; connectors ran through the document | Narrowed the contract to `min(340px,58%)`, left-aligned the stage, repositioned the cards, retargeted the SVG paths |
| 3 | The brand wordmark and headline used the form panel's `--text`, so they washed out in light mode | Added the artwork-scoped `--art-text` / `--art-text-muted` tokens |
| 4 | The contract meta line wrapped | Tightened `.contract-meta` |
| 5 | `resetToForm()` called `window.location.reload()` | Rebuilt as an in-place restore (D7) |
| 6 | The reset did not clear the entered field values | Reset now clears every `.input` value and the remember checkbox |
| 7 | `#B8741A` failed WCAG AA as light-theme text (3.60:1) and behind white ink (3.78:1) | Split the accent into `--accent` / `--accent-text` / `--accent-ink` (D6) |
| 8 | The artwork panel inherited the theme-swapped accent, putting `#B8741A` at 4.45:1 on the card | Added the theme-invariant `--art-accent` (D6) |

### Post-approval defect pass — D9 and D10 (2026-10-31)

Two further defects surfaced once the previously-manual verification items were
automated in `verify-responsive-auth-manual.js`. Both are recorded in full in
`aidlc-docs/construction/responsive-auth/code/generation-notes.md` §9 and §10.

| # | Defect | Fix |
|---|---|---|
| 9 | The annotation cards escaped the artwork panel at 901–1000px viewports. Each card is anchored at `left:54%`/`58%`/`55%` of a panel that is only ~423px wide at 901px, but was given a fixed `width:228px` — the right edge was clipped by the panel boundary and fragments bled into the light form panel. The split layout only worked at ≥1000px. | Capped the width against the space that remains: `width:min(228px, calc(100% - var(--card-left, 54%) - 12px))`, with each card declaring its own `--card-left` so the anchor and the cap cannot drift. Resolves to the full 228px at wide viewports. |
| 10 | `.card` set a hardcoded dark background but no `color`, so it inherited the theme-swappable `--text` token (`rgb(36,31,26)` in light theme). The visible text was unaffected — `.card-text` uses `var(--art-text)` — but any card text added later without an explicit colour would have been unreadable on the dark card. | Set `color:var(--art-text)` explicitly on `.card`. Defence in depth for the theme-invariance requirement (FR-2.10, FR-6.4). |

**Why neither was caught earlier**: the geometry sweep had only sampled widths at and
above 1080px, and the theme-invariance check had only measured the artwork panel's
background and the card's border — never the card's text colour. The 901–1000px band is
the narrowest window in which the split layout is still active (`max-width:900px`
stacks the layout), and it had never been rendered.

Both defects are now covered by permanent assertions in
`aidlc-docs/scripts/verify-responsive-auth-manual.js` — the card
geometry at all 14 sweep widths, and the card's text colour plus its inherited
colour across both themes.

### Revision — alignment to the supplied reference design (2026-10-31, after the user review)

The user compared the render against a supplied reference screenshot and reported that the
mockup did not meet the expectation. The reference was diffed against the artifact and the
following deltas were closed in a single revision pass (recorded as D8 in the generation
notes):

| Area | Change |
|---|---|
| Contract meta | "CLAUSE ANALYSIS · E-GOV STATUTES" → **"Draft v3 · 14 pages"**, sentence case, rule removed |
| Article headings | "Article 12 (Termination)" → **"Article 12 — Termination"** (em dash) |
| Clause structure | Flat paragraphs → **numbered clauses 12.1, 12.2, 13.1** hanging in the margin |
| Clause prose | Long statutory text → **short clause-sized sentences** matching the reference |
| Contract geometry | `min(340px,58%)` → **`min(305px,50%)`**, left margin `clamp(10px,5.5%,64px)` |
| Contract bottom | Flat paper → **warm amber edge glow** (62px, 38% alpha) |
| Card reference | One line → **two lines**: a clause reference above a statute citation |
| Card order | GREEN, YELLOW, GREEN → **YELLOW, GREEN, GREEN** |
| Card border | Amber all round → **3px verdict-coloured left edge** + neutral border elsewhere |
| Card ref colour | Amber → **muted grey**, with the statute line in amber |
| Connectors | Crossed the prose → **start at the contract's right edge**, 0.7px at 45% opacity |
| Headline measure | `max-width:430px` → **`max-width:360px`** with `text-wrap: balance` |
| Sign-in subtext | "Sign in to continue analysing contracts." → **"Sign in to review your contracts and chats."** |
| Password placeholder | "••••••••" → **"At least 8 characters"** |
| Google button | Plain text → **the four-colour Google "G" mark** |

**Conflict resolved**: the reference design's cards cite *clauses* only, but FR-2.6 requires
every card to carry a real Civil Code article with an e-Gov marker. Both are now shown, on
two lines per card, so the visual match and the requirement are satisfied together.

**Bug found during the revision**: the first attempt at the hanging clause numbers used
`display:flex` on the paragraph, which turned each inline highlight span into a flex item
and shredded the prose into columns. Replaced with the hanging-indent technique
(`padding-left` + negative `text-indent`), and the contract's left padding widened from
26px to 34px so the numbers were not clipped.

**Regression protection added**: 10 new static assertions (card anatomy, numbered clauses,
Google marks), and geometry verified across 10 viewport widths from 320px to 2560px —
zero horizontal overflow, no card or the contract escaping the artwork panel at any width.

### Verifier triage

The static verifier's first run reported 6 failures. Five were **false positives in the verifier**
(the token `innerHTML` appearing inside a comment; the `preconnect` link counted as a stylesheet; the word "prototype" inside a comment and inside JS strings) and one was a **genuine artifact defect** (`#3B3733` / `#F2C877` outside the token blocks). The verifier was fixed for the false positives and the artifact was fixed for the real one — the failures were not blindly applied to the artifact.
