# Requirements — `auth-port`: Apply the Responsive Auth Design in `frontend/`

**Unit**: `auth-port` — port the approved `responsive-auth` design artifact into the running React SPA
**Date**: 2026-10-31
**Source artifact**: `context-docs/mockups/08-responsive-login-register.html` (approved 2026-10-31, 313 automated checks green)
**Target**: `frontend/src/features/auth/` + `frontend/src/styles/` + `frontend/index.html`
**Answers source**: none — the design is already fixed and approved by the source artifact; the open questions are integration questions, resolved in §"Integration decisions" below

---

## Intent Analysis

| Field | Value |
|---|---|
| **User request** | "now apply this design in frontend" — following the completion of the `responsive-auth` design unit |
| **Request type** | Enhancement / port — apply an approved design artifact to an existing application surface |
| **Scope estimate** | Multiple components — one feature area (`features/auth/`), one shared style file (`styles/tokens.css`), and one entry file (`index.html`). No other feature area is touched. |
| **Complexity estimate** | Moderate — the design is fully specified and already verified; the complexity is in decomposing a single-file static prototype into React components, reconciling the prototype's demo-only behaviour with the app's real API-backed behaviour, and preserving an existing `data-testid` contract |
| **Requirements depth** | Standard — the visual and behavioural design needs no further user decisions; the integration constraints need to be written down precisely |

### Why no clarifying-questions round

The design questions were already asked, answered, approved and verified in the `responsive-auth`
unit (`aidlc-docs/inception/requirements/responsive-auth/requirements.md`, 20 questions + 3
extension opt-ins). Re-asking them would re-litigate a settled decision. The only genuinely new
questions are integration questions — how the prototype's demo behaviour maps onto the app's real
behaviour — and those are resolved below with the reasoning shown, because each has one correct
answer given the existing code.

### Integration decisions

| # | Question | Decision | Reasoning |
|---|---|---|---|
| D1 | The artifact's FR-5.3/FR-5.4 replace the form with a demo success card; the app really authenticates. | **Port the real submit.** On success, navigate to `ROUTES.CHAT` exactly as today. No demo success card. | The artifact's FR-5.5 ("no real backend shall be contacted") was an artifact constraint because the artifact had no backend. The SPA does. Porting the demo card would break authentication. The **visual language** of the success state is retained as a compact inline confirmation inside the form panel before navigation. |
| D2 | The artifact has one page with two tabs; the app has `/login` and `/register` as separate routes. | **Keep both routes. The tab set becomes the shared shell.** Each route selects its initial tab; clicking the other tab navigates to the other route. | The rebrand unit's FR-2.3 created the two routes and the route split is load-bearing for the guards and for the E2E docs. Removing the tabs would lose the artifact's defining interaction; removing the routes would regress the app. Both are preserved: the tab *state* is derived from the route, and the route is derived from the tab. |
| D3 | The artifact's sign-in field is "Email or username"; the backend login endpoint takes `{email, password}`. | **Keep the label and the validation rule; send the identifier as the `email` field.** The identifier accepts a username-shaped value for the client-side check, but the request body sends exactly what the user typed in the `email` key, unchanged from today's behaviour. | The backend contract is fixed and documented in `aidlc-docs/inception/api-contract.md`; it is out of scope to change. The client's identifier rule is a superset of the server's, which is the correct failure mode: a username-shaped value passes client validation and is rejected by the server with a real error message rather than being blocked by a client-side rule the server does not share. |
| D4 | The artifact's "Keep me signed in" checkbox. | **Render it, and keep it honest.** It is not a session-lifetime control in this app (`localStorage` already persists the token), so it is **not rendered** — a control that does not do what it says is worse than no control. | The app's session semantics are fixed by the existing `providers.tsx` / `client.ts`. Inventing a "remember me" that silently does nothing would violate NFR-4.7 (fail safe / no misleading state). |
| D5 | The artifact's "Forgot password?" link and "Continue with Google" button. | **Both are rendered and both show an explicit inline notice that the feature is not connected.** | This is exactly FR-3.10/FR-3.11 from the artifact, and it is also the honest behaviour in a prototype-stage app: no dead controls. |
| D6 | The artifact's `data-testid` values (`auth-signin-form`, etc.) vs the app's (`login-form`, etc.). | **Both are emitted.** The app's existing testids are preserved verbatim on the same elements, and the artifact's testids are added alongside. | The artifact's 313-check verification suite is the acceptance oracle for this port — it can be re-pointed at the running app. The app's testids are referenced by `aidlc-docs/construction/build-and-test/` docs and by the sidebar-collapse unit's E2E inventory. Losing either set would break something. |
| D7 | The artifact is one file with inline CSS; the app uses per-area CSS with tokens. | **Split by concern**: `features/auth/styles/auth.css` holds the auth-scoped rules; new auth-scoped tokens go into `styles/tokens.css`; the artwork tokens are scoped to the auth feature, not global. | The rebrand unit's FR-5 required the per-area CSS split with 0 cross-file duplication and `tokens.css` as the token source of truth. The artwork panel is always dark in both themes and exists only on the auth screens, so its tokens are declared on the auth root scope (`.auth-page`) rather than `:root`, which keeps the global token surface unchanged. |
| D8 | The artifact loads Newsreader + Inter from Google Fonts with SRI. | **Add the same SRI-protected stylesheet to `frontend/index.html`.** The app's existing `--serif` (`Source Serif 4`) and `--sans` (`Inter`) stay as the global typography; the auth screens get their own `--auth-font-serif` / `--auth-font-sans` tokens resolving to Newsreader / Inter with the same fallbacks. | The artifact's typography is part of its verified design. `index.html` is the only place a stylesheet with an `integrity` attribute belongs — Vite does not inline `<link integrity>` in a CSS `@import` reliably. The auth tokens are scoped so the rest of the app's typography is untouched. |
| D9 | The artifact's light theme overrides `--bg-canvas`, `--text` etc. at `:root`. The app has 20 global tokens. | **The light-theme override is scoped to the auth feature's form panel only**, via a `.auth-form-panel` scope with its own token names (`--auth-bg`, `--auth-panel`, …). The app's global 20 tokens are untouched. | Overriding `:root` in a light scheme would restyle the whole app (chat, citations, settings) — a regression far outside this unit's scope. The rebrand unit's NFR requires the 20 token values preserved. Scoping the light theme to the auth panel reproduces the artifact's behaviour exactly (artwork dark in both themes, form panel light) with zero blast radius. |

---

## Functional Requirements

### FR-1 — Layout and structure

- **FR-1.1** — The auth screen shall be a two-column split: an artwork panel occupying approximately **55%** of the viewport width and a form panel occupying approximately **45%**, implemented as `grid-template-columns:55fr 45fr`.
- **FR-1.2** — Below **900px** viewport width the layout shall collapse to a single column, the artwork panel shall become a banner approximately **200px** tall positioned above the form panel, and the form panel shall occupy the remainder of the page.
- **FR-1.3** — In the mobile banner only the LegalWave brand lockup shall be visible. The contract document, the scan line, the three annotation cards, the headline and the subtext shall not be rendered in the banner.
- **FR-1.4** — On desktop both panels shall be **100vh** tall and the form panel's content shall be vertically centred, so switching between sign-in and create-account does not change the page structure.
- **FR-1.5** — The page shall not scroll on desktop at the reference viewport (1440×900). The create-account form is the taller of the two modes and shall fit within that viewport.

### FR-2 — Artwork panel (left)

- **FR-2.1** — The panel background shall be a near-black warm `#171615`, with a soft amber radial glow and faint horizontal ruled lines evoking legal paper. Both layers shall be `aria-hidden="true"` and non-interactive.
- **FR-2.2** — A contract page shall be rendered at `#EFEBE2`, rotated `-1.6deg`, in a serif face, containing:
  - the title **"Service Agreement"**,
  - the meta line **"Draft v3 · 14 pages"**,
  - **Article 12 (Termination)** — written, realistic clause prose,
  - **Article 13 (Governing Law)** — written, realistic clause prose,
  - a third section rendered as **five grey skeleton text bars**.
- **FR-2.3** — Numbered clauses **12.1**, **12.2** and **13.1** shall hang in the margin, implemented with `padding-left` plus a negative `text-indent` (never `display:flex` on the clause paragraph, which would shred the inline highlight spans into separate flex items).
- **FR-2.4** — Highlighted phrases shall appear within the contract text in **yellow** and **green**, marking a flagged clause and a compliant clause respectively.
- **FR-2.5** — An **amber scan line** shall sweep down the contract page on a **6-second** looping animation, animating `transform` only on an isolated layer.
- **FR-2.6** — **Three annotation cards** shall overlap the contract page's right edge. Each shall be connected to the document by a **thin amber line** drawn as an inline SVG overlay above the document, with the cards themselves as HTML above that, so the analysis text remains real selectable text. Each card shall contain:
  - a reference label naming the clause and its topic,
  - a statute citation naming a **real Civil Code article** and the source **e-Gov**,
  - a verdict chip — **GREEN** or **YELLOW** — carrying the verdict as **text**, not colour alone,
  - one sentence of analysis.
- **FR-2.7** — The panel shall carry a **top-left brand lockup**: a line-art scales-of-justice icon in amber beside the serif wordmark **"LegalWave"**.
- **FR-2.8** — The panel shall carry a **bottom-left headline** in serif — **"Every clause, checked against the statute."** — with the one-line subtext **"Upload a contract and see each claim tied to the law it came from."**
- **FR-2.9** — The artwork panel shall remain visually identical in both colour schemes: it keeps `#171615`, its amber glow, and the contract page in both dark and light modes.
- **FR-2.10** — The annotation cards shall not overflow the artwork panel at any viewport width. Their width shall be capped against the space remaining to the panel's right edge: `width:min(228px, calc(100% - var(--card-left, 54%) - 12px))`, with a `--card-left` value on each card matching its inline `left`.

### FR-3 — Form panel (right)

- **FR-3.1** — Two tabs shall be present: **"Sign in"** and **"Create account"**, with an **amber underline that slides** between them when the active tab changes.
- **FR-3.2** — Each tab shall carry `role="tab"` with `aria-selected` reflecting the active state; the tab list shall use `role="tablist"`; the panels shall use `role="tabpanel"` and be linked by `aria-controls` and `aria-labelledby`.
- **FR-3.3** — Arrow-key navigation (Left/Right/Up/Down) and **Home**/**End** shall move between tabs, with **roving `tabindex`** so the tab set occupies a single tab stop.
- **FR-3.4** — Each mode shall present a serif heading — **"Welcome back"** (sign in) or **"Create your account"** (register) — with a one-line subtitle beneath it.
- **FR-3.5** — **Sign in** fields: an identifier field labelled **"Email or username"** (placeholder indicating either is accepted), a **Password** field with a **Show/Hide toggle** carrying an `aria-label`, and a **"Forgot password?"** link styled in amber.
- **FR-3.6** — **Create account** fields: **Full name**, **Email** (email only — labelled and validated as email), and **Password** with a **Show/Hide toggle** carrying an `aria-label`.
- **FR-3.7** — The **Show/Hide toggle** shall swap the password input's `type` between `password` and `text`, and shall carry an `aria-label` naming the action plus `aria-pressed` reflecting the state.
- **FR-3.8** — A **full-width amber primary button** shall submit the form, with **dark text** on the amber fill.
- **FR-3.9** — An **"or" divider** shall separate the primary button from a **"Continue with Google" outline button** carrying the Google brand mark.
- **FR-3.10** — Clicking **"Continue with Google"** shall show an inline notice explaining that Google sign-in is not connected — it shall not silently do nothing.
- **FR-3.11** — Clicking **"Forgot password?"** shall show an inline notice explaining that password reset is not connected.
- **FR-3.12** — The panel shall end with a footer in **small, letter-spaced, uppercase, muted text**: **"Not legal advice · Verdicts are informational"**.
- **FR-3.13** — The primary button shall reflect the in-flight state — **"Signing in…"** / **"Creating account…"** — and shall be disabled while the request is in flight.
- **FR-3.14** — A server-side failure shall be surfaced as an inline error message in the form panel, in plain language, and shall not clear the user's input.

### FR-4 — Validation

- **FR-4.1** — Validation shall run **on submit**, and thereafter re-run **on blur** for each field, so a corrected field clears its error without requiring a second submit.
- **FR-4.2** — Error messages shall be **plain language**, stating what is wrong **and how to fix it**.
- **FR-4.3** — Each error message shall be programmatically associated with its input via `aria-describedby`, and error text shall be announced through an `aria-live` region.
- **FR-4.4** — Invalid fields shall carry an error state distinguishable by more than colour alone — a border treatment **and** an error icon marker.
- **FR-4.5** — The **sign-in** identifier field shall accept either an email address or a username (≥ 3 characters of letters, numbers, dots, dashes or underscores); the **register** email field shall require an email address and reject a non-email value with a plain-language message.
- **FR-4.6** — **Registration** shall require a password of at least **8 characters**, with a message naming the requirement. **Sign-in** shall enforce no length rule — the failure belongs in authentication, not validation.
- **FR-4.7** — Registration shall require a non-empty name. Sign-in shall have no name field.
- **FR-4.8** — A password of only whitespace shall be treated as empty.
- **FR-4.9** — Validation shall run **before** any network request is issued — a form that fails validation shall not contact the backend.

### FR-5 — Behaviour and routing

- **FR-5.1** — The auth screen shall be reachable at **both** `/login` and `/register`, and both routes shall continue to work.
- **FR-5.2** — `/login` shall open with the **Sign in** tab active; `/register` shall open with the **Create account** tab active.
- **FR-5.3** — Activating a tab shall **navigate** to the corresponding route — the tabs are a navigation control over the two auth modes, not a local-only state toggle.
- **FR-5.4** — A successful sign-in shall navigate to `ROUTES.CHAT` with `replace: true`; a successful registration shall do the same. This is the existing behaviour and shall not change.
- **FR-5.5** — Switching modes shall reset the other mode's validation state and error messages, so a stale error cannot appear in the newly selected form.
- **FR-5.6** — The server error message shall be rendered in the existing `login-form-error` / `register-form-error` element, so the existing error-handling contract is preserved.

### FR-6 — Visual design

- **FR-6.1** — The auth form panel's **dark theme** (the default) shall use exactly these tokens:

  | Role | Value |
  |---|---|
  | Background | `#1E1D1C` |
  | Panel | `#262524` |
  | Input | `#2B2A29` |
  | Border | `#3A3836` |
  | Text | `#ECE8E1` |
  | Muted text | `#A09B93` |
  | Accent amber | `#E3A53A` |
  | Button text on amber | dark (`#1A1208`) |
  | Verdict green | `#6FBF73` |
  | Verdict yellow | `#E8C24A` |

- **FR-6.2** — The auth form panel's **light theme**, applied via `prefers-color-scheme: light`, shall use a **cream `#F5F2EC`** background and a **deeper amber `#B8741A`** for fills, borders and rules.
- **FR-6.3** — Because `#B8741A` measures 3.60:1 as text on the cream panel, the light theme shall use a **separate darker amber `#96600F`** for accent-coloured **text** (5.02:1 on the panel, 4.73:1 on the canvas), and shall never use `#B8741A` for text.
- **FR-6.4** — The artwork panel shall **not** change with the colour scheme (FR-2.9). All twelve artwork colours shall be theme-invariant, including the annotation cards' own text and border colours.
- **FR-6.5** — Typography on the auth screens shall use **Newsreader** (serif) for headings, the brand lockup, the contract text and the success/notice titles, and **Inter** for everything else, with **Georgia** and **system-ui** fallbacks respectively.
- **FR-6.6** — Inputs and buttons shall use a **10px** border radius.
- **FR-6.7** — Keyboard focus shall produce a **clear amber focus ring** on every interactive element.
- **FR-6.8** — Buttons shall use **no gradients**. The palette shall contain **no neon** colours.
- **FR-6.9** — The overall tone shall be quiet, professional, and trustworthy.

### FR-7 — Motion and accessibility

- **FR-7.1** — The **only automatic motion** shall be the scan line and the staggered annotation fade-in.
- **FR-7.2** — The scan line shall animate on a **6-second** loop.
- **FR-7.3** — The three annotation cards shall **fade in one after another** — a one-shot staggered sequence, not a repeating loop — with delays of **0.4s / 0.8s / 1.2s** and a **0.62s** duration.
- **FR-7.4** — Under `prefers-reduced-motion: reduce` the **scan line shall not animate** and the **annotations shall appear immediately**, with no fade.
- **FR-7.5** — Under `prefers-reduced-motion: reduce` no other motion shall occur either — the tab underline shall transition instantly, and input/button/tab transitions shall be disabled.
- **FR-7.6** — Every input shall have a **proper associated `<label>`**.
- **FR-7.7** — The password toggle shall carry an **`aria-label`** and `aria-pressed`.
- **FR-7.8** — Decorative artwork — the glow, ruled lines, scan line, connector lines and the scales icon — shall be hidden from assistive technology (`aria-hidden="true"`).
- **FR-7.9** — The verdict chips shall not rely on colour alone to convey their verdict; each shall carry a text label (**GREEN** / **YELLOW**).
- **FR-7.10** — The auth screen shall be operable entirely by keyboard, including tab switching, password visibility, and form submission.

### FR-8 — Integration constraints

- **FR-8.1** — The **existing** `data-testid` values shall be preserved verbatim on the corresponding elements: `auth-card`, `brand`, `login-form`, `login-form-email-input`, `login-form-password-input`, `login-form-error`, `login-form-submit-button`, `login-form-register-link`, `register-form`, `register-form-name-input`, `register-form-email-input`, `register-form-password-input`, `register-form-error`, `register-form-submit-button`, `register-form-login-link`.
- **FR-8.2** — The **artifact's** `data-testid` values shall also be emitted on the corresponding elements: `auth-tab-signin`, `auth-tab-register`, `auth-signin-form`, `auth-register-form`, `auth-signin-identifier-input`, `auth-signin-password-input`, `auth-signin-password-toggle`, `auth-signin-submit-button`, `auth-register-name-input`, `auth-register-email-input`, `auth-register-password-input`, `auth-register-password-toggle`, `auth-register-submit-button`, `auth-forgot-password-button`, `auth-google-button`, `auth-google-register-button`.
- **FR-8.3** — The existing **element ids** shall be preserved: `login-email`, `login-password`, `register-name`, `register-email`, `register-password`. The artifact's ids (`signin-identifier`, `signin-password`, …) are **not** used — the app's ids win, because existing E2E documentation references them.
- **FR-8.4** — The `localStorage` keys `jlca_token` and `jlca_user` shall not change.
- **FR-8.5** — **No backend change.** `backend/` shall be byte-identical after this unit.
- **FR-8.6** — **No new npm dependency.** `frontend/package.json` shall be unchanged.
- **FR-8.7** — The app's **20 existing global tokens** in `styles/tokens.css` shall keep their exact values. New auth-scoped tokens are added; no existing token is renamed, removed or re-valued.
- **FR-8.8** — **No raw colour literal** shall appear in an auth CSS rule outside a token block. Every colour shall resolve to a custom property.
- **FR-8.9** — The existing chat, citations and settings features shall be **unaffected**. No selector used by those areas shall be changed.

---

## Non-Functional Requirements

### NFR-1 — Accessibility

- **NFR-1.1** — Every interactive element shall have a visible focus indicator meeting at least **3:1** contrast against its background.
- **NFR-1.2** — Body text shall meet at least **4.5:1** contrast against its background; the muted footer text shall meet at least **4.5:1** as well, being 10.5px uppercase.
- **NFR-1.3** — Validation errors shall be announced to screen readers on appearance, not only shown visually.
- **NFR-1.4** — The tab and panel relationship shall be correctly conveyed by ARIA so that the active form is announced when switching.
- **NFR-1.5** — No interactive element shall rely on colour alone to convey state.
- **NFR-1.6** — Touch targets shall be at least **44×44px** on touch viewports.

### NFR-2 — Responsiveness

- **NFR-2.1** — The layout shall work from **320px** to **2560px** wide without horizontal scrolling.
- **NFR-2.2** — The **900px** breakpoint shall switch between the split layout and the stacked banner layout.
- **NFR-2.3** — At the 900px boundary the artwork panel shall shrink to the 200px banner and the form shall remain fully usable.
- **NFR-2.4** — The annotation layout within the artwork panel shall reposition or reflow rather than overflow at narrow widths — specifically in the **901–1000px** band, which is where the source artifact's D9 defect lived.
- **NFR-2.5** — The layout shall reflow when the viewport changes after mount (rotation, window resize, container query) — percentage- and `min()`-based widths must be re-resolved, not cached.

### NFR-3 — Performance

- **NFR-3.1** — The scan sweep shall animate `transform` only, on an isolated layer, so it does not repaint the contract text.
- **NFR-3.2** — The staggered card fade-in shall animate `opacity` and `transform` only.
- **NFR-3.3** — The auth screens shall add no network request beyond the existing auth endpoint calls and the single Google Fonts stylesheet.
- **NFR-3.4** — The annotation cards' staggered entry shall not delay the form panel's interactivity — the form shall be usable from first paint.

### NFR-4 — Security (security-baseline enabled)

- **NFR-4.1 (SECURITY-05)** — All user input shall be validated on the client before any state change, with type, length and format checks. Validation shall not be bypassable by invoking handlers directly — the submit handler shall re-run the full validation, not trust a pre-computed flag.
- **NFR-4.2 (SECURITY-05)** — No user-supplied value shall be inserted into the DOM as HTML. React's default escaping satisfies this; `dangerouslySetInnerHTML` shall not be used anywhere in the auth feature.
- **NFR-4.3 (SECURITY-09)** — The auth feature shall contain **no default credentials, no hardcoded API keys and no real endpoint URLs** beyond the paths routed by the existing API client.
- **NFR-4.4 (SECURITY-12)** — The registration password policy shall be **minimum 8 characters**, enforced client-side with a plain-language message, consistent with FR-4.6.
- **NFR-4.5 (SECURITY-12)** — The auth feature shall **not store, log or transmit** the entered password beyond the single authenticated request that requires it. It shall not be written to `localStorage`, `sessionStorage`, cookies, or the console.
- **NFR-4.6 (SECURITY-13)** — The Google Fonts stylesheet, being an external CDN resource, shall carry a **`integrity` attribute** with a correct hash and a `crossorigin="anonymous"` attribute.
- **NFR-4.7 (SECURITY-15)** — The submit path shall **fail safely**: an unexpected condition shall show a generic message rather than exposing internal detail, and shall never leave the form in a partially-submitted state (the busy flag shall be cleared in a `finally`).
- **NFR-4.8** — The auth feature shall contain **no `eval`, `new Function`, `document.write`**, and no dynamic code execution.

### NFR-5 — Maintainability

- **NFR-5.1** — The auth CSS shall be organised into clearly commented sections: tokens, layout, artwork, form, responsive, reduced motion.
- **NFR-5.2** — CSS custom properties shall be the **single source** for every colour, radius and font choice — no repeated literal colour values outside the token block.
- **NFR-5.3** — The light scheme shall be expressed as a **token override** under `@media (prefers-color-scheme: light)`, not duplicated rule blocks.
- **NFR-5.4** — The design shall be decomposed into focused React components with a single shared validation module, not one monolithic page file.
- **NFR-5.5** — The validation rules shall live in one module shared by both modes, with the mode-specific differences expressed as data rather than as two parallel implementations.
- **NFR-5.6** — The existing `features/auth` module boundary shall be respected: the port adds components under `features/auth/`, does not create a new top-level feature area.

### NFR-6 — Fidelity to the source design

- **NFR-6.1** — Every element present in the source artifact shall be present in the port: the three annotation cards, the scan line, the ruled lines, the glow, the contract page with two written articles and skeleton bars, the brand lockup, the headline and subtext, both tabs, all named fields, both buttons, the divider, and the disclaimer footer.
- **NFR-6.2** — The specified hex values shall be used exactly as given.
- **NFR-6.3** — The specified copy strings shall be used verbatim: "Every clause, checked against the statute.", "Upload a contract and see each claim tied to the law it came from.", "LegalWave", "Sign in", "Create account", "Welcome back", "Create your account", "Keep me signed in" *(see D4 — not rendered)*, "Forgot password?", "Continue with Google", "Not legal advice · Verdicts are informational", "Service Agreement", "Draft v3 · 14 pages".
- **NFR-6.4** — The port shall preserve the source artifact's **structural invariants** that the 313-check suite asserts: the tablist wiring, the roving tabindex, the error lifecycle, the theme-invariance of the artwork panel, and the annotation cards' containment within the panel.

---

## Out of Scope

- Any change to `backend/` — the API contract is fixed and consumed as-is.
- Any change to the chat, citations or settings features.
- Any change to the `localStorage` session contract.
- A real Google OAuth flow, a real password-reset flow, or a real "remember me" session lifetime.
- A demo success card that replaces the form (see D1 — the port keeps the real submit).
- Changes to the other mockups (`01-login.html` … `07-pdf-on-request.html`) or to the source artifact itself, which stays as the approved reference.
- A new test runner or a new npm dependency.

---

## Key Requirements Summary

1. **The approved design, applied to the real app.** The split 55/45 layout, the artwork panel, the tabbed form, the palette, the typography, the motion and the accessibility pattern are ported from `08-responsive-login-register.html` without redesign.
2. **Both routes survive.** `/login` and `/register` remain distinct routes; the tabs navigate between them rather than replacing them.
3. **Real authentication survives.** The form still POSTs to the existing endpoints and still navigates to the chat on success. The prototype's demo-only success card is not ported.
4. **The existing testid and id contracts survive**, and the artifact's testids are added alongside so the same verification suite can be re-pointed at the running app.
5. **Zero blast radius outside the auth feature.** 20 global tokens unchanged, no new dependency, no backend change, no chat/citation/settings regression, no raw hex outside token blocks.
6. **The two source defects are not reintroduced** — the annotation cards are capped against the remaining panel width (D9), and the annotation card carries an explicit theme-invariant colour (D10).

---

## Traceability

| Requirement | Source |
|---|---|
| FR-1.1 … FR-1.5 | Artifact FR-1.1 … FR-1.5 |
| FR-2.1 … FR-2.10 | Artifact FR-2.1 … FR-2.10; FR-2.10 additionally carries the artifact's D9 fix |
| FR-3.1 … FR-3.14 | Artifact FR-3.1 … FR-3.14; FR-3.6 adapted by D1 |
| FR-4.1 … FR-4.9 | Artifact FR-4.1 … FR-4.8; FR-4.9 added — no network call on invalid input |
| FR-5.1 … FR-5.6 | Derived — the artifact's single-page tab model reconciled with the app's two-route model (D2) |
| FR-6.1 … FR-6.9 | Artifact FR-6.1 … FR-6.8; FR-6.3 restates the artifact's post-D9/D10 token split |
| FR-7.1 … FR-7.10 | Artifact FR-7.1 … FR-7.10 |
| FR-8.1 … FR-8.9 | Derived — the app's existing contracts (testids, ids, storage keys, tokens, dependency set) |
| NFR-1.1 … NFR-1.6 | Artifact NFR-1.1 … NFR-1.6 |
| NFR-2.1 … NFR-2.5 | Artifact NFR-2.1 … NFR-2.4; NFR-2.4 carries the D9 band; NFR-2.5 added for the SPA context |
| NFR-3.1 … NFR-3.4 | Artifact NFR-3.1 … NFR-3.3; NFR-3.4 added for the SPA context |
| NFR-4.1 … NFR-4.8 | security-baseline (enabled) — SECURITY-05, -09, -12, -13, -15 |
| NFR-5.1 … NFR-5.6 | Derived — the rebrand unit's per-area CSS and token discipline, plus React decomposition |
| NFR-6.1 … NFR-6.4 | Derived — fidelity to the approved artifact |
