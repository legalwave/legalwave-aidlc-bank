# Code Generation Plan — `auth-port`

**Unit**: `auth-port` — apply the approved responsive-auth design in the running React SPA
**Date**: 2026-10-31
**Execution plan**: `aidlc-docs/inception/plans/auth-port-execution-plan.md`
**Requirements**: `aidlc-docs/inception/requirements/auth-port/requirements.md`
**Source artifact**: `context-docs/mockups/08-responsive-login-register.html`
**Code root**: `/home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp/frontend`
**Documentation root**: `aidlc-docs/construction/auth-port/`

This plan is the single source of truth for Code Generation.

---

## Unit Context

| Field | Value |
|---|---|
| **Stories implemented** | No user stories (skipped — see the execution plan). FR-1…FR-8 and NFR-1…NFR-6 are the acceptance contract. |
| **Dependencies on other units** | None at runtime. Depends on the **rebrand unit**'s output (the `features/auth/` tree, `ROUTES`, `useSession`, `BRAND`, the 20 tokens) and on the **responsive-auth unit**'s output (the design artifact). Both are complete. |
| **Interfaces consumed** | `useSession().signIn/signUp`, `ROUTES.LOGIN/REGISTER/CHAT`, `BRAND.name/tagline`, `BRAND.logoSrc` |
| **Interfaces produced** | None new. The auth feature's public surface is unchanged: two routes, two pages. |
| **Data entities owned** | None — no model, no schema, no storage key. |
| **Service boundaries** | `features/auth/` only. The port adds components and a hook under it; it creates no new top-level feature area and modifies no shared module. |

### Contract preservation checklist (must all hold at the end)

**Status: ✅ all verified** — see the "Verified by" column. The two rows that needed action during generation are recorded in the generation notes: the `auth-card` testid was initially dropped with the old centred-card shell (restored on the new `.auth-page` root), and nine *artifact* testids were initially un-emitted (moved onto wrapper elements, because an element carries only one `data-testid`).

| Contract | Value | Where it must remain | Verified by |
|---|---|---|---|
| Existing route | `/login` → sign-in mode; `/register` → register mode | `app/routes.tsx` — **not modified** | CDP Parts 1, 2 |
| Existing endpoint | `POST /api/auth/login`, `POST /api/auth/register` | `shared/api/endpoints.ts` — **not modified** | Static group 22; CDP Parts 1, 2 |
| Storage keys | `jlca_token`, `jlca_user` | `shared/api/client.ts` — **not modified** | Static group 28; CDP Part 11 |
| Existing testids | `auth-card`, `brand`, `login-form`, `login-form-email-input`, `login-form-password-input`, `login-form-error`, `login-form-submit-button`, `login-form-register-link`, `register-form`, `register-form-name-input`, `register-form-email-input`, `register-form-password-input`, `register-form-error`, `register-form-submit-button`, `register-form-login-link` | the rendered auth page | Static groups 14, 21; CDP Parts 1, 2 — all 31 testids asserted in the **rendered DOM** |
| Existing element ids | `login-email`, `login-password`, `register-name`, `register-email`, `register-password` | the rendered auth page | Static group 16 |
| Global tokens | the 20 declarations in `styles/tokens.css` | byte-identical | Static group 1 — the exact **values** are pinned, not just the names |
| Dependencies | `frontend/package.json` | unchanged | Build instructions step 2; static group 2 |
| Backend | `backend/**` | byte-identical | Static group 28; build instructions step 7 |

---

## Part 1 — Planning

### Step 1 — Read the unit context
- [x] Read `aidlc-docs/inception/requirements/auth-port/requirements.md` (FR-1…FR-8, NFR-1…NFR-6, decisions D1–D9)
- [x] Read `aidlc-docs/inception/plans/auth-port-execution-plan.md` (scope, risk register, step sequence S1–S11)
- [x] Read `context-docs/mockups/08-responsive-login-register.html` (the source of truth for markup, CSS and behaviour)
- [x] Read the existing `frontend/src/features/auth/**`, `frontend/src/styles/tokens.css`, `frontend/src/styles/global.css`, `frontend/src/app/routes.tsx`, `frontend/src/app/providers.tsx`, `frontend/src/shared/api/endpoints.ts`, `frontend/index.html`
- [x] Confirm the unit is ready: the design is approved, the requirements are written, the workspace is brownfield, the code root is known

### Step 2 — Decide the file plan

| Action | Path | Notes |
|---|---|---|
| Modify | `frontend/src/styles/tokens.css` | Append the auth-scoped token block + the scoped light-theme override. The 20 existing declarations are untouched. |
| Modify | `frontend/index.html` | Add the SRI-protected Google Fonts stylesheet + the two preconnects. |
| Rewrite | `frontend/src/features/auth/styles/auth.css` | The full design in 6 commented sections. |
| Create | `frontend/src/features/auth/hooks/useAuthValidation.ts` | The shared FR-4 rule set and error lifecycle. |
| Create | `frontend/src/features/auth/components/AuthArtwork.tsx` | The artwork panel. |
| Create | `frontend/src/features/auth/components/AuthTabs.tsx` | The APG tablist. |
| Create | `frontend/src/features/auth/components/PasswordField.tsx` | The Show/Hide toggle. |
| Create | `frontend/src/features/auth/components/GoogleButton.tsx` | The outline button + brand mark. |
| Create | `frontend/src/features/auth/components/AuthNotice.tsx` | The inline notice region. |
| Create | `frontend/src/features/auth/components/AuthScreen.tsx` | The shared two-panel shell. |
| Rewrite | `frontend/src/features/auth/pages/LoginPage.tsx` | Renders `AuthScreen` in sign-in mode. |
| Rewrite | `frontend/src/features/auth/pages/RegisterPage.tsx` | Renders `AuthScreen` in register mode. |
| Delete | `frontend/src/features/auth/components/AuthCard.tsx` | Superseded by `AuthScreen`. |
| Create | `aidlc-docs/scripts/verify-auth-port.py` | The static verifier. |
| Create | `aidlc-docs/scripts/verify-auth-port.js` | The CDP integration harness. |
| Create | `aidlc-docs/construction/auth-port/code/generation-notes.md` | The generation notes. |

### Step 3 — Write the plan
- [x] Number every step, give each a checkbox, name the exact file paths
- [x] Map every step to the requirements it satisfies
- [x] Record the contract preservation checklist

### Step 4 — Save the plan
- [x] `aidlc-docs/construction/plans/auth-port-code-generation-plan.md`

### Step 5 — Summarise and log for approval
- [x] Summary presented to the user
- [x] Approval prompt logged in `aidlc-docs/audit.md`

---

## Part 2 — Generation

### Step 6 — Token and font substrate (S1)

- [x] **6.1** Append to `frontend/src/styles/tokens.css` an auth-scoped token block. Every value is copied verbatim from the artifact's `:root` block (FR-6.1, FR-6.2, FR-6.3). The scope is a **class selector** — `.auth-page` — not `:root`, so the app's global token surface is unchanged (FR-8.7, decision D7/D9).

  Tokens to declare on `.auth-page`:

  | Token | Dark value | Purpose |
  |---|---|---|
  | `--auth-bg` | `#1E1D1C` | form-panel canvas |
  | `--auth-panel` | `#262524` | form-panel surface |
  | `--auth-input` | `#2B2A29` | input fill |
  | `--auth-border` | `#3A3836` | borders |
  | `--auth-text` | `#ECE8E1` | primary text |
  | `--auth-text-muted` | `#A09B93` | muted text |
  | `--auth-accent` | `#E3A53A` | amber fills / borders / rules |
  | `--auth-accent-ink` | `#1A1208` | dark text on amber |
  | `--auth-accent-text` | `#E3A53A` | accent as readable text (dark) |
  | `--auth-accent-soft` | `rgba(227,165,58,.14)` | notice fill |
  | `--auth-accent-ring` | `rgba(227,165,58,.55)` | focus ring |
  | `--auth-radius` | `10px` | input / button radius |
  | `--auth-radius-sm` | `6px` | small radius |
  | `--auth-font-serif` | `'Newsreader',Georgia,'Times New Roman',serif` | headings, lockup, contract |
  | `--auth-font-sans` | `'Inter',system-ui,-apple-system,'Segoe UI',sans-serif` | body |
  | `--auth-contract-rotation` | `-1.6deg` | contract tilt |

- [x] **6.2** Append the artwork tokens on the same `.auth-page` scope. **None of them is overridden in the light theme** — that is the theme-invariance invariant (FR-2.9, FR-6.4, NFR-6.4).

  | Token | Value |
  |---|---|
  | `--art-bg` | `#171615` |
  | `--art-glow` | `rgba(227,165,58,.20)` |
  | `--art-rule` | `rgba(236,232,225,.045)` |
  | `--art-paper` | `#EFEBE2` |
  | `--art-ink` | `#2A2724` |
  | `--art-ink-soft` | `#6B645C` |
  | `--art-ink-body` | `#3B3733` |
  | `--art-skeleton` | `#D8D3C9` |
  | `--scan-core` | `#F2C877` |
  | `--art-text` | `#ECE8E1` |
  | `--art-text-muted` | `#A09B93` |
  | `--art-accent` | `#E3A53A` |

- [x] **6.3** Append the verdict and highlight tokens: `--verdict-green` `#6FBF73`, `--verdict-yellow` `#E8C24A`, `--verdict-green-ink` `#10240F`, `--verdict-yellow-ink` `#2B2105`, `--highlight-yellow` `rgba(232,194,74,.42)`, `--highlight-green` `rgba(111,191,115,.38)`.

- [x] **6.4** Append the light-theme override as a **scoped** `@media (prefers-color-scheme: light)` block. The selector is `.auth-form-panel` (not `:root`) — this is the mechanism that keeps the rest of the app dark-only while the auth form panel goes cream (FR-6.2, decision D9).

  | Token | Light value | Note |
  |---|---|---|
  | `--auth-bg` | `#F5F2EC` | cream |
  | `--auth-panel` | `#FBF9F5` | |
  | `--auth-input` | `#FFFFFF` | |
  | `--auth-border` | `#D8D2C6` | |
  | `--auth-text` | `#241F1A` | |
  | `--auth-text-muted` | `#5E574E` | |
  | `--auth-accent` | `#B8741A` | fills / borders / rules only |
  | `--auth-accent-ink` | `#1A1208` | 4.90:1 on the amber fill |
  | `--auth-accent-text` | `#96600F` | **text only** — 5.02:1 on the panel, 4.73:1 on the canvas |
  | `--auth-accent-soft` | `rgba(184,116,26,.13)` | |
  | `--auth-accent-ring` | `rgba(184,116,26,.60)` | |

  The artwork tokens are **not** repeated in this block — that omission is the invariant, not an oversight.

- [x] **6.5** Add to `frontend/index.html`, before `</head>`: the two `preconnect` links and the Google Fonts stylesheet with `integrity="sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s="` and `crossorigin="anonymous"` (FR-8.6/NFR-4.6, SRI). The `href` is copied verbatim from the artifact.

- [x] **6.6** Verify the 20 original token declarations in `tokens.css` are byte-identical.

### Step 7 — The auth stylesheet (S2)

- [x] **7.1** Rewrite `frontend/src/features/auth/styles/auth.css` with 6 commented sections, in the artifact's order: **1 Layout · 2 Artwork · 3 Form · 4 Responsive · 5 Reduced motion** (plus a header comment carrying the requirement map). Every rule is scoped under `.auth-page` or `.auth-form-panel` — no bare element selectors, no unscoped class names (risk R1).
- [x] **7.2** Port the layout rules: `.auth-page{display:grid;grid-template-columns:55fr 45fr;min-height:100vh}`, `.auth-form-panel{background:var(--auth-panel);display:flex;flex-direction:column;justify-content:center;padding:48px clamp(28px,5vw,72px);min-width:0}`, `.auth-form-inner{width:100%;max-width:412px;margin:0 auto}` (FR-1.1, FR-1.4).
- [x] **7.3** Port the artwork rules verbatim, renaming the artifact's `--bg-*`/`--text*`/`--accent*` to the `--auth-*` names and keeping the `--art-*` names unchanged: `.auth-art`, `.auth-art-glow`, `.auth-art-rules`, `.auth-art-brand`, `.auth-art-brand-mark`, `.auth-art-brand-name`, `.auth-art-stage`, `.auth-contract`, `.auth-contract-title`, `.auth-contract-meta`, `.auth-contract h3`, `.auth-contract p`, `.auth-clause`, `.auth-clause-no`, `.auth-mark-yellow`, `.auth-mark-green`, `.auth-contract-skeleton`, `.auth-scanline`, `@keyframes auth-scan-sweep`, `.auth-art-connectors`, `.auth-cards`, `.auth-card`, `.auth-card.green`, `.auth-card.yellow`, `.auth-card-ref`, `.auth-card-statute`, `.auth-card-body`, `.auth-card-verdict`, `.auth-card-text`, `.auth-art-copy`, `.auth-art-headline`, `.auth-art-subtext` (FR-2.1…FR-2.10).
- [x] **7.4** Carry the **D9 fix** across verbatim: `.auth-card{width:min(228px, calc(100% - var(--card-left, 54%) - 12px))}` with a `--card-left` custom property set per card (FR-2.10, risk R6).
- [x] **7.5** Carry the **D10 fix** across verbatim: `.auth-card{color:var(--art-text)}` — an explicit theme-invariant colour, never the theme-swappable `--auth-text` (FR-6.4, risk R6).
- [x] **7.6** Keep the **hanging indent** on the clause paragraphs: `.auth-clause{padding-left:32px;text-indent:-32px}` — never `display:flex` (FR-2.3, and the defect the source artifact's Revision 1 caught).
- [x] **7.7** Port the form rules: `.auth-tabs`, `.auth-tab`, `.auth-tab-underline`, `.auth-form-heading`, `.auth-form-subtext`, `.auth-field`, `.auth-field-label`, `.auth-input-wrap`, `.auth-input`, `.auth-input.has-error`, `.auth-pw-toggle`, `.auth-field-error`, `.auth-form-row`, `.auth-check`, `.auth-link`, `.auth-btn`, `.auth-btn-primary`, `.auth-divider`, `.auth-btn-outline`, `.auth-google-mark`, `.auth-notice`, `.auth-disclaimer`, `.auth-visually-hidden` (FR-3.1…FR-3.14, FR-6.6, FR-6.7).
- [x] **7.8** Port the responsive rules: `@media (max-width:900px)` → single column, the 200px banner, the artwork's inner layers hidden, the form panel's padding and alignment (FR-1.2, FR-1.3); `@media (max-width:420px)` → the tab gap and heading size; `@media (hover:none)` → 44px touch targets (NFR-1.6).
- [x] **7.9** Port the reduced-motion rules: the scan line hidden, the cards immediate, the underline and transitions disabled (FR-7.4, FR-7.5).
- [x] **7.10** Verify: no raw hex literal appears in any rule outside the token block (FR-8.8). Every colour resolves to a custom property.

### Step 8 — The shared validation hook (S3)

- [x] **8.1** Create `frontend/src/features/auth/hooks/useAuthValidation.ts`. It owns:
  - `values` — the field values for the active mode
  - `errors` — a map of field → message
  - `submitted` — whether a submit has been attempted (FR-4.1)
  - `validateField(field, value, mode)` → message or `null` (FR-4.5…FR-4.8)
  - `validateAll(mode)` → `{ ok, firstBad }` (FR-4.9 — runs before any request)
  - `handleBlur(field)` → re-validates one field, but only after the first submit
  - `clearMode(mode)` → resets a mode's errors (FR-5.5)
  - `announce(message)` → writes to the `aria-live` region (FR-4.3, NFR-1.3)
- [x] **8.2** Port the rule set verbatim from the artifact's `validateField`, with the mode-specific differences expressed as data rather than as two implementations (NFR-5.5):
  - sign-in identifier: empty → "Enter your email address or username to continue."; neither email-shaped nor username-shaped → "Enter a valid email address, or a username of at least 3 letters, numbers, dots, dashes or underscores."
  - sign-in password: empty → "Enter your password to continue."; **no length rule** (FR-4.6).
  - register name: empty → "Enter your full name so your account can be identified."
  - register email: empty → "Enter your email address so we can reach you."; not email-shaped → "Enter a valid email address, for example name@example.com."
  - register password: empty → "Enter a password to create your account."; shorter than 8 → "Use at least 8 characters for your password."
  - `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`, `USERNAME_RE = /^[A-Za-z0-9._-]{3,}$/`
- [x] **8.3** Implement the error lifecycle: setting an error sets `aria-invalid="true"`, adds the `has-error` class, writes the message into the `<p>` and announces it; clearing removes all three (FR-4.3, FR-4.4).
- [x] **8.4** All dynamic text goes through React's children (never `dangerouslySetInnerHTML`) (NFR-4.2).

### Step 9 — The artwork component (S4)

- [x] **9.1** Create `frontend/src/features/auth/components/AuthArtwork.tsx`. It renders the artifact's `<aside class="panel-art">` verbatim in structure: glow, ruled lines, brand lockup, stage, contract, connectors, cards, headline.
- [x] **9.2** The brand lockup: the scales-of-justice inline SVG at `viewBox="0 0 32 32"` with `aria-hidden="true"`, beside the serif wordmark **"LegalWave"** (FR-2.7).
- [x] **9.3** The contract page: title **"Service Agreement"**, meta **"Draft v3 · 14 pages"**, **Article 12 — Termination** with clauses **12.1** and **12.2**, **Article 13 — Governing Law** with clause **13.1**, and the five-bar skeleton section. The yellow and green highlighted phrases are marked with `<span className="auth-mark-yellow">` / `<span className="auth-mark-green">` (FR-2.2…FR-2.4).
- [x] **9.4** The scan line: `<span className="auth-scanline" aria-hidden="true" />` (FR-2.5, FR-7.2).
- [x] **9.5** The connector SVG: the same three paths, `viewBox="0 0 100 100"`, `preserveAspectRatio="none"`, `aria-hidden="true"` (FR-2.6).
- [x] **9.6** The three annotation cards, each with its `--card-left` custom property set inline alongside its `left` (FR-2.10, D9):

  | # | Top | Left | `--card-left` | Ref | Statute | Verdict | Text |
  |---|---|---|---|---|---|---|---|
  | 1 | `16%` | `54%` | `54%` | Clause 12.1 · Notice | Civil Code, Art. 132 · e-Gov | YELLOW | No cure period stated. Review before signing. |
  | 2 | `42%` | `58%` | `58%` | Clause 12.2 · Termination | Civil Code, Art. 541 · e-Gov | GREEN | Termination after a failed cure is consistent with statute. |
  | 3 | `68%` | `55%` | `55%` | Clause 13.1 · Governing law | Civil Code, Art. 1 · e-Gov | GREEN | Japanese law applies. |

- [x] **9.7** The headline and subtext (FR-2.8): **"Every clause, checked against the statute."** and **"Upload a contract and see each claim tied to the law it came from."**

### Step 10 — The tab, field and button components (S5, S6)

- [x] **10.1** Create `frontend/src/features/auth/components/AuthTabs.tsx`. Props: `mode: 'signin' | 'register'`, `onSelect(mode)`. It renders `role="tablist"`, two `role="tab"` buttons with `aria-selected`, `aria-controls`, and a **roving `tabindex`** (the selected tab is `0`, the other `-1`) (FR-3.2, FR-3.3).
- [x] **10.2** The keyboard handler: **ArrowRight/ArrowDown** → next, **ArrowLeft/ArrowUp** → previous, **Home** → first, **End** → last, wrapping at both ends, with `preventDefault()` (FR-3.3).
- [x] **10.3** The sliding underline: an absolutely positioned `<span className="auth-tab-underline">` whose `width` and `transform` are set from the active tab's `offsetWidth` / `offsetLeft`, recomputed on mount, on resize, and after `document.fonts.ready` (FR-3.1).
- [x] **10.4** The tab buttons navigate: `onSelect` calls `navigate(ROUTES.LOGIN | ROUTES.REGISTER)` — the tab set is a navigation control over the two routes, not a local-only state toggle (FR-5.3, decision D2).
- [x] **10.5** Create `frontend/src/features/auth/components/PasswordField.tsx`. It renders the input plus the toggle button; the toggle flips `type` between `password` and `text`, and updates the button's text, `aria-label` and `aria-pressed` (FR-3.7, FR-7.7).
- [x] **10.6** Create `frontend/src/features/auth/components/GoogleButton.tsx` — the outline button with the four-path Google brand mark (`aria-hidden="true"`, `focusable="false"`) and the label **"Continue with Google"** (FR-3.9).
- [x] **10.7** Create `frontend/src/features/auth/components/AuthNotice.tsx` — the inline notice region. It renders `role="status" aria-live="polite"` and only paints when a message is present (FR-3.10, FR-3.11).

### Step 11 — The shared screen shell (S7)

- [x] **11.1** Create `frontend/src/features/auth/components/AuthScreen.tsx`. Props: `mode`, `onSubmit`, `busy`, `serverError`, `onServerErrorClear` (if needed), plus the field values and setters. It renders the two panels, the tab set, the live region, the two tab panels, and the disclaimer footer.
- [x] **11.2** The sign-in panel: the identifier field (`id="login-email"`, `data-testid="login-form-email-input"` and `data-testid="auth-signin-identifier-input"` on the same element is **not** possible — one `data-testid` attribute per element, so the app's id wins and the artifact's testid is asserted through the id), the password field (`id="login-password"`), the "Forgot password?" link, and the submit button.
- [x] **11.3** The register panel: `id="register-name"`, `id="register-email"`, `id="register-password"`, and the submit button.
- [x] **11.4** The `aria-live` region: `<div className="auth-visually-hidden" role="status" aria-live="polite" />` (FR-4.3).
- [x] **11.5** The disclaimer footer: **"Not legal advice · Verdicts are informational"** (FR-3.12).
- [x] **11.6** The `data-testid` allocation — **one testid per element**, chosen so that the app's existing testid always wins where the element is the same one (FR-8.1, FR-8.2, risk R4):

  | Element | `data-testid` | The other family reaches it via |
  |---|---|---|
  | sign-in form | `login-form` | the `auth-signin-form` assertion becomes "a form containing `#login-email`" |
  | register form | `register-form` | the `auth-register-form` assertion becomes "a form containing `#register-email`" |
  | sign-in identifier input | `login-form-email-input` | `#login-email` |
  | sign-in password input | `login-form-password-input` | `#login-password` |
  | sign-in error | `login-form-error` | |
  | sign-in submit | `login-form-submit-button` | |
  | sign-in → register link | `login-form-register-link` | |
  | register name input | `register-form-name-input` | `#register-name` |
  | register email input | `register-form-email-input` | `#register-email` |
  | register password input | `register-form-password-input` | `#register-password` |
  | register error | `register-form-error` | |
  | register submit | `register-form-submit-button` | |
  | register → login link | `register-form-login-link` | |
  | sign-in tab | `auth-tab-signin` | |
  | register tab | `auth-tab-register` | |
  | sign-in password toggle | `auth-signin-password-toggle` | |
  | register password toggle | `auth-register-password-toggle` | |
  | forgot-password link | `auth-forgot-password-button` | |
  | Google button (sign-in) | `auth-google-button` | |
  | Google button (register) | `auth-google-register-button` | |
  | the shell | `auth-card` | |
  | the brand lockup | `brand` | |

- [x] **11.7** Every interactive element carries a `data-testid` and a stable id — no dynamic or auto-generated ids (the automation-friendly rule).

### Step 12 — Rewrite the two pages (S8)

- [x] **12.1** Rewrite `frontend/src/features/auth/pages/LoginPage.tsx`: read the route, render `<AuthScreen mode="signin" …>`, call `signIn(email, password)` from `useSession()`, and `navigate(ROUTES.CHAT, { replace: true })` on success. Keep `setBusy` in a `finally` (NFR-4.7). Surface the server's error message in the `login-form-error` element (FR-5.6).
- [x] **12.2** Rewrite `frontend/src/features/auth/pages/RegisterPage.tsx`: the same, with `signUp(email, password, name || undefined)`.
- [x] **12.3** Both pages keep the existing `useState` + `useSession` + `useNavigate` structure — the session contract is not modified (FR-8.4, FR-5.4).
- [x] **12.4** The **"Keep me signed in"** checkbox is **not rendered** — the app's session lifetime is fixed by `providers.tsx`, and a control that does not do what it says would violate NFR-4.7 (decision D4).

### Step 13 — Remove the superseded component (S9)

- [x] **13.1** Delete `frontend/src/features/auth/components/AuthCard.tsx`. Confirm no import remains — `tsc -b` will catch it.

### Step 14 — Write the verification tooling (S10)

- [x] **14.1** Create `aidlc-docs/scripts/verify-auth-port.py` — the static verifier. It reads the React sources and asserts against the requirements: the token block's presence and exact values, the light-theme override's scoping, the absence of raw hex in `auth.css`, the testid and id contract, the tablist wiring, the D9 `min()` cap, the D10 explicit colour, the hanging indent, the reduced-motion block, the absence of `dangerouslySetInnerHTML` / `eval` / `innerHTML` in the auth feature, and the SRI hash.
- [x] **14.2** Create `aidlc-docs/scripts/verify-auth-port.js` — the CDP harness. It boots the built app, drives both modes, and asserts the tab navigation, the roving tabindex, the arrow keys, the password toggle, the validation lifecycle, the error clears on blur, the no-request-on-invalid-submit rule, the geometry sweep across 14 widths, the theme-invariance of the artwork, and the annotation cards' containment within the panel.

### Step 15 — Verify (S11)

- [x] **15.1** `npm run lint` → zero errors.
- [x] **15.2** `npm run build` → zero errors.
- [x] **15.3** `python3 aidlc-docs/scripts/verify-auth-port.py` → all checks pass.
- [x] **15.4** `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-auth-port.js` → all checks pass.
- [x] **15.5** Confirm `backend/` is unchanged and `frontend/package.json` is unchanged.
- [x] **15.6** Confirm the 20 original token declarations in `tokens.css` are unchanged.
- [x] **15.7** Confirm the chat, citation and settings screens render unchanged.

### Step 16 — Document

- [x] **16.1** Create `aidlc-docs/construction/auth-port/code/generation-notes.md` — the design decisions carried across, the two carried-over defect fixes, the deviations from the source artifact (D1–D9), and the accepted deviations list.
- [x] **16.2** Create the build-and-test instruction set under `aidlc-docs/construction/build-and-test/auth-port-*.md`.
- [x] **16.3** Update `aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md`.

---

## Requirement Traceability

| Requirement | Steps |
|---|---|
| FR-1.1 … FR-1.5 | 7.2, 7.8, 11.1 |
| FR-2.1 … FR-2.10 | 6.2, 7.3, 7.4, 7.5, 7.6, 9.1 … 9.7 |
| FR-3.1 … FR-3.14 | 7.7, 10.1 … 10.7, 11.1 … 11.6, 12.1, 12.2 |
| FR-4.1 … FR-4.9 | 8.1 … 8.4, 11.1, 11.2, 11.3, 12.1, 12.2 |
| FR-5.1 … FR-5.6 | 10.4, 11.1, 12.1 … 12.3 |
| FR-6.1 … FR-6.9 | 6.1 … 6.4, 7.3 … 7.7 |
| FR-7.1 … FR-7.10 | 7.3, 7.8, 7.9, 8.3, 9.2 … 9.4, 10.1 … 10.3, 10.5, 11.4 |
| FR-8.1 … FR-8.9 | 6.6, 7.1, 7.10, 11.6, 12.3, 13.1, 15.5, 15.6 |
| NFR-1.1 … NFR-1.6 | 6.1 … 6.4, 7.7, 7.8, 8.3, 10.1 … 10.3, 10.5, 11.4 |
| NFR-2.1 … NFR-2.5 | 7.2, 7.4, 7.8 |
| NFR-3.1 … NFR-3.4 | 7.3, 7.9, 9.4 |
| NFR-4.1 … NFR-4.8 | 6.5, 8.1 … 8.4, 12.1, 12.2, 12.4, 14.1 |
| NFR-5.1 … NFR-5.6 | 7.1 … 7.10, 8.1, 8.2, 11.x |
| NFR-6.1 … NFR-6.4 | 6.1 … 6.4, 7.3 … 7.6, 9.1 … 9.7, 14.2 |

---

## Completion Criteria

- [x] Every step above marked `[x]`.
- [x] `npm run lint` and `npm run build` both pass with zero errors.
- [x] The static verifier and the CDP harness both pass.
- [x] The contract preservation checklist holds in full.
- [x] `backend/` and `frontend/package.json` are unchanged.
- [x] No duplicate files were created alongside the modified ones.
- [x] The documentation set is written and `aidlc-state.md` and `audit.md` are updated.
