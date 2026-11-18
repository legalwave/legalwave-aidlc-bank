# Requirements — Responsive Login/Register Design (LegalWave)

**Unit**: `responsive-auth` — a standalone, responsive login/register design artifact
**Date**: 2026-10-31
**Deliverable**: `context-docs/mockups/08-responsive-login-register.html` — one self-contained HTML file with inline CSS and JS
**Answers source**: `aidlc-docs/inception/requirements/responsive-auth/requirement-verification-questions.md` (20 design questions + 3 extension opt-ins)

---

## Intent Analysis

| Field | Value |
|---|---|
| **User request** | "Design a responsive login/register page for LegalWave… Deliver it as a single self-contained HTML file with inline CSS and JS." — with a complete layout, style, motion, accessibility, and behaviour specification |
| **Request type** | New feature — a new design artifact (not a modification to the running React application) |
| **Scope estimate** | Single file — one new self-contained HTML prototype in `context-docs/mockups/` |
| **Complexity estimate** | Moderate — the visual specification is detailed and fully specified, but the artwork panel requires SVG connector geometry, a two-theme token system, an ARIA tab pattern, and staggered motion with a reduced-motion path |
| **Requirements depth** | Standard — the brief is exceptionally complete on design; the open items were resolved through 20 questions |

### Key decisions from the questions

| Q | Decision | Consequence for the artifact |
|---|---|---|
| 1 | `context-docs/mockups/08-responsive-login-register.html` | New file; `01-login.html` untouched |
| 2 | Two written articles + one skeleton section | Article 12 and 13 are readable prose; a third section is grey bars |
| 3 | Validate on submit, then re-validate on blur | Standard accessible pattern; `aria-live` + `aria-describedby` |
| 4 | Google button shows an inline demo notice | No dead controls |
| 5 | Checkbox is a working toggle; link shows a demo notice | Each control responds, none pretends to work |
| 6 | Success replaces the form panel's contents | Unambiguous end state with a reset link |
| 7 | Form switches to cream; artwork stays dark in both themes | Two-panel token split |
| 8 | Mobile banner is logo + texture only | No cards or scan line below 900px |
| 9 | Full ARIA tablist pattern | `tablist`/`tab`/`tabpanel`, arrow keys, roving `tabindex` |
| 10 | Google Fonts link with robust local fallbacks | Renders correctly offline |
| 11 | All three cards carry a statute reference with an e-Gov label | Real Civil Code article numbers |
| 12 | Two ambers scoped by panel | `#E3A53A` artwork (both themes); `#E3A53A`/`#B8741A` form (dark/light) |
| 13 | One-shot staggered fade-in | Delays 0.4s / 0.8s / 1.2s; disabled under reduced motion |
| 14 | Standalone artifact only | `frontend/` is not modified in any way |
| 15 | No extra prototype note | The specified footer is the only footer text |
| 16 | Both panels `100vh`; form centres its content | Structure never changes between tabs |
| 17 | Mode-specific label, placeholder, and validation | Sign-in accepts email or username; register requires email |
| 18 | Register requires ≥ 8 characters; sign-in enforces no length rule | "Use at least 8 characters" |
| 19 | Inline SVG for connector lines over HTML cards | Analysis text stays real, selectable, translatable text |
| 20 | Validate the output markup and CSS | Check unclosed tags, duplicate IDs, ARIA wiring |

### Extension configuration

| Extension | Enabled | Rationale |
|---|---|---|
| `security-baseline` | **Yes** | SECURITY-05 (input validation is the deliverable's behaviour), SECURITY-09 (no default credentials, no demo page deployed), SECURITY-12 (password policy), SECURITY-13 (SRI for the Google Fonts CDN), SECURITY-15 (fail-safe error handling) are directly applicable. Infrastructure rules are N/A. |
| `resiliency-baseline` | **No** | Every rule targets a deployed, distributed, stateful workload — RTO/RPO, multi-region failover, auto-scaling, DR testing. A static file with no backend, data store, or runtime has no workload to make resilient. |
| `property-based-testing` | **No** | PBT-09 requires a framework dependency, conflicting with "self-contained". The only logic is form validation, which is inherently example-based (one rule → one plain-language message); no property category yields a meaningful generated test. |

---

## Functional Requirements

### FR-1 — Layout and structure

- **FR-1.1** — The page shall be a two-column split: an artwork panel occupying approximately **55%** of the viewport width and a form panel occupying approximately **45%**.
- **FR-1.2** — Below **900px** viewport width the artwork panel shall collapse to a banner approximately **200px** tall, positioned above the form panel, and the form panel shall occupy the remainder of the page.
- **FR-1.3** — In the mobile banner only the LegalWave logo shall be visible. The contract document, the scan line, and the three annotation cards shall not be rendered in the banner (Q8-A).
- **FR-1.4** — Both panels shall be **100vh** tall on desktop, with the form panel's content vertically centred, so switching between sign-in and create-account does not change the page structure or scroll position (Q16-A).
- **FR-1.5** — The page shall not scroll on desktop at the reference viewport (1440×900). The create-account form is the taller of the two modes and shall fit within the viewport at that size.

### FR-2 — Artwork panel (left)

- **FR-2.1** — The panel background shall be a near-black warm `#171615`, with a soft amber radial glow and faint horizontal ruled lines evoking legal paper.
- **FR-2.2** — A contract page shall be rendered at `#EFEBE2`, rotated `-1.6deg`, containing serif text:
  - the title **"Service Agreement"**,
  - **Article 12 (Termination)** — written, realistic clause prose,
  - **Article 13 (Governing Law)** — written, realistic clause prose,
  - a third section rendered as **grey skeleton text bars** (Q2-A).
- **FR-2.3** — Highlighted phrases shall appear within the contract text in **yellow** and **green**, marking a flagged clause and a compliant clause respectively.
- **FR-2.4** — An **amber scan line** shall sweep down the contract page on a **6-second** looping animation.
- **FR-2.5** — **Three annotation cards** shall overlap the contract page's right edge. Each shall be connected to the document by a **thin amber line**, and each shall contain:
  - a small reference label naming the statute and article,
  - a verdict chip — **GREEN** `#6FBF73` or **YELLOW** `#E8C24A`,
  - one sentence of analysis.
- **FR-2.6** — Every annotation card shall cite a **real Civil Code article** and label the source as **e-Gov** (Q11-A). The example given in the brief — "Civil Code, Art. 541 · e-Gov: termination after a failed cure is consistent with statute" — sets the format.
- **FR-2.7** — The connector lines shall be drawn with an **inline SVG overlay** positioned above the document, with the cards themselves as HTML positioned above that, so the analysis text remains real selectable and translatable text (Q19-A).
- **FR-2.8** — The panel shall carry a **top-left brand lockup**: a line-art scales-of-justice icon in amber beside the serif wordmark **"LegalWave"**.
- **FR-2.9** — The panel shall carry a **bottom-left headline** in serif — **"Every clause, checked against the statute."** — with a one-line subtext beneath it.
- **FR-2.10** — The artwork panel shall remain visually identical in both colour schemes (Q7-A): it keeps `#171615`, its amber glow, and the contract page in both dark and light modes.

### FR-3 — Form panel (right)

- **FR-3.1** — Two tabs shall be present: **"Sign in"** and **"Create account"**, with an **amber underline that slides** between them when the active tab changes.
- **FR-3.2** — Each tab shall carry `role="tab"` with `aria-selected` reflecting the active state, and the tab list shall use `role="tablist"` with `role="tabpanel"` panels linked by `aria-controls` and `aria-labelledby` (Q9-A).
- **FR-3.3** — Arrow-key navigation (Left/Right) shall move between tabs, with **roving `tabindex`** so the tab set occupies a single tab stop (Q9-A).
- **FR-3.4** — Each mode shall present a serif heading — **"Welcome back"** (sign in) or **"Create your account"** (register) — and a one-line subtitle beneath it.
- **FR-3.5** — **Sign in** fields:
  - **Email or username** — label and placeholder both indicate either is accepted,
  - **Password** — with a **Show/Hide toggle** carrying an `aria-label`,
  - a **"Keep me signed in"** checkbox,
  - a **"Forgot password?"** link styled in amber.
- **FR-3.6** — **Create account** fields:
  - **Full name**,
  - **Email** (email only — the field is labelled and validated as email),
  - **Password** — with a **Show/Hide toggle** carrying an `aria-label`.
- **FR-3.7** — The **Show/Hide toggle** shall swap the password input's `type` between `password` and `text`, and shall carry an `aria-label` that names the action (Q-A on FR-3.5/3.6; brief requirement).
- **FR-3.8** — A **full-width amber primary button** shall submit the form, with **dark text** on the amber fill.
- **FR-3.9** — An **"or" divider** shall separate the primary button from a **"Continue with Google" outline button**.
- **FR-3.10** — Clicking **"Continue with Google"** shall show an inline demo notice explaining that Google sign-in is not connected in the prototype — it shall not silently do nothing (Q4-A).
- **FR-3.11** — Clicking **"Forgot password?"** shall show an inline demo notice explaining that password reset is not connected in the prototype (Q5-A).
- **FR-3.12** — The **"Keep me signed in"** checkbox shall toggle state normally, and its state shall be reflected in the success message (Q5-A).
- **FR-3.13** — The panel shall end with a footer in **small, letter-spaced, uppercase, muted text**: **"Not legal advice · Verdicts are informational"**.
- **FR-3.14** — No additional prototype notice shall appear in the rendered page (Q15-A).

### FR-4 — Validation

- **FR-4.1** — Validation shall run **on submit**, and thereafter re-run **on blur** for each field, so a corrected field clears its error without requiring a second submit (Q3-A).
- **FR-4.2** — Error messages shall be **plain language**, stating what is wrong **and how to fix it** (brief requirement).
- **FR-4.3** — Each error message shall be programmatically associated with its input via `aria-describedby`, and error text shall be announced through an `aria-live` region (Q3-A).
- **FR-4.4** — Invalid fields shall carry an error state distinguishable by more than colour alone — a border treatment **and** an error icon or marker.
- **FR-4.5** — The **sign-in** identifier field shall accept either an email address or a username; the **register** identifier field shall require an email address and reject a non-email value with a plain-language message (Q17-A).
- **FR-4.6** — **Registration** shall require a password of at least **8 characters**, with a message naming the requirement. **Sign-in** shall enforce no length rule — the failure belongs in authentication, not validation (Q18-A).
- **FR-4.7** — Registration shall require a non-empty name. Sign-in shall require no name field.
- **FR-4.8** — A password of only whitespace shall be treated as empty.

### FR-5 — Behaviour

- **FR-5.1** — Tabs shall switch the form mode **without a page reload** (brief requirement).
- **FR-5.2** — Switching tabs shall reset the other mode's validation state and error messages, so a stale error cannot appear in the newly selected form.
- **FR-5.3** — On successful submit validation, the form panel's contents shall be **replaced by a success card** — a check-mark message plus a **"Use a different account"** reset link that returns to the form (Q6-A).
- **FR-5.4** — The success message shall state that this is a demo and that no account was created or signed in.
- **FR-5.5** — No real backend shall be contacted. No network request shall be made by the form's own logic.

### FR-6 — Visual design

- **FR-6.1** — The dark theme shall be the default and shall use exactly these tokens:

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

- **FR-6.2** — The **light theme**, applied via `prefers-color-scheme: light`, shall use a **cream `#F5F2EC`** background and a **deeper amber `#B8741A`** for the form panel's amber elements (Q12-A).
- **FR-6.3** — The artwork panel shall **not** change with the colour scheme (FR-2.10).
- **FR-6.4** — Typography shall use **Newsreader** (serif) for headings, the logo lockup, and the contract text, and **Inter** for everything else, with **Georgia** and **system-ui** fallbacks respectively (Q10-A).
- **FR-6.5** — Inputs and buttons shall use a **10px** border radius.
- **FR-6.6** — Keyboard focus shall produce a **clear amber focus ring** on every interactive element.
- **FR-6.7** — Buttons shall use **no gradients**. The palette shall contain **no neon** colours (brief requirement).
- **FR-6.8** — The overall tone shall be quiet, professional, and trustworthy (brief requirement).

### FR-7 — Motion and accessibility

- **FR-7.1** — The **only automatic motion** shall be the scan line and the staggered annotation fade-in (brief requirement).
- **FR-7.2** — The scan line shall animate on a **6-second** loop.
- **FR-7.3** — The three annotation cards shall **fade in one after another** — a one-shot staggered sequence, not a repeating loop — with delays of approximately **0.4s / 0.8s / 1.2s** (Q13-A).
- **FR-7.4** — Under `prefers-reduced-motion: reduce` the **scan line shall not animate** and the **annotations shall appear immediately**, with no fade (FR-7.2, FR-7.3 of the brief).
- **FR-7.5** — Under `prefers-reduced-motion: reduce` no other motion shall occur either — the tab underline shall transition instantly.
- **FR-7.6** — Every input shall have a **proper associated `<label>`**.
- **FR-7.7** — The tabs shall carry **`aria-selected`** (FR-3.2).
- **FR-7.8** — The password toggle shall carry an **`aria-label`** (FR-3.7).
- **FR-7.9** — Decorative artwork — the glow, ruled lines, scan line, connector lines, and the scales icon — shall be hidden from assistive technology (`aria-hidden="true"`).
- **FR-7.10** — The verdict chips shall not rely on colour alone to convey their verdict; each shall carry a text label (**GREEN** / **YELLOW**).
- **FR-7.11** — Focus shall remain visible on the contract page's annotation cards if they are made interactive; if the cards are non-interactive, they shall not be in the tab order.

### FR-8 — Deliverable constraints

- **FR-8.1** — The deliverable shall be a **single self-contained HTML file** with **inline CSS and inline JS** — no separate stylesheet, no separate script, no build step (brief requirement).
- **FR-8.2** — The file shall be valid standalone: opening it directly from disk shall render the complete design.
- **FR-8.3** — The React application in `frontend/` shall **not** be modified in any way (Q14-A).
- **FR-8.4** — The file shall be placed at `context-docs/mockups/08-responsive-login-register.html` (Q1-A).
- **FR-8.5** — The only permitted external resource shall be the Google Fonts stylesheet for Newsreader and Inter. No other external request shall be made (FR-5.5).

---

## Non-Functional Requirements

### NFR-1 — Accessibility

- **NFR-1.1** — The page shall be operable entirely by keyboard, including tab switching (arrow keys), password visibility, and form submission.
- **NFR-1.2** — Every interactive element shall have a visible focus indicator meeting at least **3:1 contrast** against its background.
- **NFR-1.3** — Body text shall meet at least **4.5:1** contrast against its background; the muted footer text shall meet at least **4.5:1** as well, being 11px uppercase.
- **NFR-1.4** — Validation errors shall be announced to screen readers on appearance, not only shown visually.
- **NFR-1.5** — The tab and panel relationship shall be correctly conveyed by ARIA so that the active form is announced when switching.
- **NFR-1.6** — No interactive element shall rely on colour alone to convey state.

### NFR-2 — Responsiveness

- **NFR-2.1** — The layout shall work from **320px** to **2560px** wide without horizontal scrolling.
- **NFR-2.2** — The **900px** breakpoint shall switch between the split layout and the stacked banner layout.
- **NFR-2.3** — At the 900px boundary the artwork panel shall shrink to the 200px banner and the form shall remain fully usable.
- **NFR-2.4** — The three-column annotation layout within the artwork panel shall reposition or reflow rather than overflow at narrow widths.
- **NFR-2.5** — Touch targets shall be at least **44×44px** on touch viewports.

### NFR-3 — Performance

- **NFR-3.1** — The file shall render without a network round trip beyond the optional Google Fonts request.
- **NFR-3.2** — Animations shall run on **compositor-friendly properties** (`transform`, `opacity`) where possible, to avoid layout thrash during the scan line and fade-ins.
- **NFR-3.3** — The 6-second scan line shall not cause continuous repaint of the document text.

### NFR-4 — Security (security-baseline enabled)

- **NFR-4.1 (SECURITY-05)** — All user input shall be validated on the client before any state change, with type, length, and format checks. Validation shall not be bypassable by invoking handlers directly.
- **NFR-4.2 (SECURITY-05)** — No user-supplied value shall be inserted into the DOM as HTML. Any value echoed into the success message shall be inserted as **text**, never as markup — preventing DOM-based XSS.
- **NFR-4.3 (SECURITY-09)** — The artifact shall contain **no default credentials, no hardcoded API keys, and no real endpoint URLs**. All backend references shall be plainly marked as not connected.
- **NFR-4.4 (SECURITY-12)** — The registration password policy shall be **minimum 8 characters**, enforced client-side with a plain-language message (consistent with FR-4.6).
- **NFR-4.5 (SECURITY-12)** — The artifact shall **not store, log, or transmit** the entered password. It shall not be written to `localStorage`, `sessionStorage`, cookies, or the console.
- **NFR-4.6 (SECURITY-13)** — The Google Fonts stylesheet, being an external CDN resource, shall carry a **`integrity` (Subresource Integrity) attribute** with a correct hash and a `crossorigin="anonymous"` attribute, or the artifact shall ship without the external stylesheet and rely on the local fallback stack.
- **NFR-4.7 (SECURITY-15)** — Validation and the demo-notice paths shall **fail safely**: an unexpected condition shall show a generic message rather than exposing internal detail, and shall never leave the form in a partially-submitted state.
- **NFR-4.8** — The artifact shall contain **no inline event-handler attributes containing user data**, and no `eval`, `Function`, `document.write`, or `innerHTML` assignment of user-controlled values.
- **NFR-4.9** — The artifact shall use **no `dangerouslySetInnerHTML`-equivalent** — it is plain HTML, so all dynamic content shall use `textContent` or equivalent safe APIs.

### NFR-5 — Maintainability

- **NFR-5.1** — The file shall be organised into clearly commented sections: tokens, layout, artwork, form, motion, behaviour.
- **NFR-5.2** — CSS custom properties shall be the **single source** for every colour, radius, and font choice — no repeated literal colour values outside the token block.
- **NFR-5.3** — The dark and light schemes shall be expressed as **token overrides** under `@media (prefers-color-scheme: light)`, not duplicated rule blocks.
- **NFR-5.4** — The JavaScript shall be organised into small named functions with no framework dependency.

### NFR-6 — Fidelity to the brief

- **NFR-6.1** — Every element named in the brief shall be present: the three annotation cards, the scan line, the ruled lines, the glow, the contract page with two written articles and skeleton bars, the brand lockup, the headline and subtext, both tabs, all named fields, both buttons, the divider, and the disclaimer footer.
- **NFR-6.2** — The specified hex values shall be used exactly as given.
- **NFR-6.3** — The specified copy strings shall be used verbatim: "Every clause, checked against the statute.", "LegalWave", "Sign in", "Create account", "Welcome back", "Create your account", "Keep me signed in", "Forgot password?", "Continue with Google", "Not legal advice · Verdicts are informational".

---

## Out of Scope

- Any change to the React application in `frontend/` — the running app keeps its own auth pages and design tokens.
- Any backend endpoint, request, or data persistence.
- A real Google OAuth flow, a real password-reset flow, or real session management.
- A functional sign-in or registration — the form demonstrates validation and an end state only.
- Server-side rendering, a bundler, or a build step for the artifact.
- The existing mockups `01-login.html` … `07-pdf-on-request.html`, which are left untouched.

---

## Key Requirements Summary

1. **A single self-contained HTML file** at `context-docs/mockups/08-responsive-login-register.html`, with inline CSS and JS, that renders correctly when opened directly from disk and leaves `frontend/` untouched.
2. **A split layout** — 55% artwork / 45% form — collapsing below 900px to a ~200px logo-only banner above the form, with both desktop panels at `100vh` and the form vertically centred.
3. **An artwork panel** in near-black warm `#171615` with an amber radial glow and faint ruled lines, holding a `-1.6deg` rotated `#EFEBE2` contract page with "Service Agreement", a written Article 12 (Termination), a written Article 13 (Governing Law), one skeleton-bar section, and yellow and green highlighted phrases.
4. **Motion limited to two things** — a 6-second looping amber scan line and a one-shot staggered annotation fade-in — both disabled under `prefers-reduced-motion`.
5. **Three annotation cards** overlapping the document's right edge, each connected by a thin amber line drawn as inline SVG, each carrying a real Civil Code article with an e-Gov label, a GREEN/YELLOW verdict chip, and one sentence of analysis — all as real HTML text.
6. **A two-tab form** implementing the full ARIA tablist pattern, with a sliding amber underline, mode-specific fields, a password Show/Hide toggle, a "Keep me signed in" checkbox, a "Forgot password?" link, an amber full-width primary button, an "or" divider, and a "Continue with Google" outline button.
7. **Plain-language validation** on submit with re-validation on blur, `aria-describedby` and `aria-live` wiring, mode-specific identifier rules, and an 8-character registration password minimum.
8. **A demo success state** that replaces the form panel's contents, with no backend contacted and no network request made by the form's own logic.
9. **A warm-charcoal dark theme by default** with the exact specified palette, a cream light variant via `prefers-color-scheme` that leaves the artwork panel dark, Newsreader and Inter with Georgia and system-ui fallbacks, 10px radii, and clear amber focus rings.
10. **Security-conscious by construction** — no `innerHTML` for user values, no password storage or logging, an 8-character minimum on registration, an SRI-hashed external font stylesheet, and generic failure messaging.

---

## Traceability

| Requirement | Source |
|---|---|
| FR-1.1, FR-1.2 | Brief — LAYOUT |
| FR-1.3 | Q8-A |
| FR-1.4 | Q16-A |
| FR-1.5 | Derived — the taller form must fit the reference viewport |
| FR-2.1 … FR-2.4 | Brief — LEFT SIDE |
| FR-2.5, FR-2.6 | Brief — LEFT SIDE, Q11-A |
| FR-2.7 | Q19-A |
| FR-2.8, FR-2.9 | Brief — LEFT SIDE |
| FR-2.10 | Brief — STYLE ("The left artwork panel stays dark in both themes"), Q7-A |
| FR-3.1 … FR-3.4 | Brief — RIGHT SIDE |
| FR-3.5, FR-3.6 | Brief — RIGHT SIDE, Q17-A |
| FR-3.7 | Brief — MOTION AND ACCESSIBILITY |
| FR-3.8, FR-3.9 | Brief — RIGHT SIDE |
| FR-3.10 | Q4-A |
| FR-3.11, FR-3.12 | Q5-A |
| FR-3.13 | Brief — RIGHT SIDE |
| FR-3.14 | Q15-A |
| FR-4.1, FR-4.2, FR-4.3 | Brief — RIGHT SIDE, Q3-A |
| FR-4.4 | NFR-1.6 |
| FR-4.5 | Q17-A |
| FR-4.6 | Q18-A, SECURITY-12 |
| FR-4.7, FR-4.8 | Derived — sensible register/sign-in field rules |
| FR-5.1 | Brief — BEHAVIOR |
| FR-5.2 | Derived — stale error prevention |
| FR-5.3, FR-5.4 | Q6-A |
| FR-5.5 | Brief — BEHAVIOR ("No real backend is connected") |
| FR-6.1 | Brief — STYLE |
| FR-6.2 | Brief — STYLE, Q12-A |
| FR-6.3 | Q7-A |
| FR-6.4 | Brief — STYLE, Q10-A |
| FR-6.5, FR-6.6 | Brief — STYLE |
| FR-6.7, FR-6.8 | Brief — STYLE |
| FR-7.1 … FR-7.5 | Brief — MOTION AND ACCESSIBILITY, Q13-A |
| FR-7.6 … FR-7.8 | Brief — MOTION AND ACCESSIBILITY, Q9-A |
| FR-7.9 … FR-7.11 | Derived — accessibility correctness |
| FR-8.1, FR-8.2 | Brief — "single self-contained HTML file with inline CSS and JS" |
| FR-8.3, FR-8.4 | Q14-A, Q1-A |
| FR-8.5 | SECURITY-13, FR-5.5 |
| NFR-4.1 … NFR-4.9 | security-baseline (enabled) |
