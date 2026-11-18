# Generation Notes — `responsive-auth` unit

**Deliverable**: `context-docs/mockups/08-responsive-login-register.html` (single self-contained file)
**Code generation plan**: `aidlc-docs/construction/plans/responsive-auth-code-generation-plan.md`
**Requirements**: `aidlc-docs/inception/requirements/responsive-auth/requirements.md`
**Execution plan**: `aidlc-docs/inception/plans/responsive-auth-execution-plan.md`

These notes record the decisions that a reader of the artifact alone could not reconstruct,
and the deviations from the brief that were deliberately accepted.

---

## 1. D1 — The SRI finding (full)

### The problem

The brief mandates Google Fonts (`Inter` + `Newsreader`) and NFR-4.6 requires the
stylesheet to be protected with Subresource Integrity. These two requirements collide
because **Google Fonts content-negotiates on the `User-Agent` header and returns
different CSS bytes per browser**. SRI is an exact-byte hash, so a single pinned
`integrity` value cannot be valid for every browser.

### The measurement

Six responses were fetched and hashed — three request variants × three user agents.
Two distinct hashes emerged:

| User agent | Bytes | sha256 (base64) |
|---|---|---|
| Chrome 120 | 11,196 | `sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=` |
| Firefox 121 | 11,196 | `sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=` |
| Safari 17 | 11,355 | `sha256-2z4j/YziFGLrRpGYxKNXqwfQf8TvKJ5emf0y09TJgwo=` |

Chrome and Firefox agree byte-for-byte; Safari's payload is 159 bytes larger (it
carries additional `@font-face` blocks and format hints).

### The decision

Pin the **Chrome/Firefox-agreeing** hash:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap"
      integrity="sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=" crossorigin="anonymous">
```

### The accepted deviation

**Safari refuses the stylesheet** (hash mismatch → the resource is blocked, per the SRI
specification). This is a deliberate, documented deviation, and NFR-4.6's disjunction
covers it:

> NFR-4.6 — the font stylesheet is either (a) protected with a valid `integrity` hash
> **or** (b) served with a local fallback stack that still renders correctly.

The artifact satisfies **both** halves:

- **(a)** The pinned hash is valid for Chrome and Firefox — the primary targets.
- **(b)** The font stacks are declared with full local fallbacks, so Safari renders the
  intended design with `Georgia` / `system-ui` instead of the webfonts:

  ```css
  --font-serif:'Newsreader',Georgia,'Times New Roman',serif;
  --font-sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  ```

  The layout does not depend on the webfonts — both stacks are serif/sans pairs with
  comparable metrics, and the design was verified to render correctly under the
  fallback stack.

### Why not the alternatives

| Alternative | Why rejected |
|---|---|
| No `integrity` attribute | Violates NFR-4.6 (a) outright; removes the protection entirely |
| Pin the Safari hash | Inverts the user base — breaks Chrome and Firefox instead |
| Two `<link>` elements with different hashes | The browser fetches whichever matches its UA and ignores the other. This **would** work, but it doubles the preconnect cost, makes the file harder to read, and depends on subtle UA-matching behaviour that is not guaranteed by the spec. |
| Self-host the fonts | Violates the brief's "single self-contained HTML file" constraint and the "only the Google Fonts CDN may be contacted" rule (NFR-3.1) |

### Regression protection

`aidlc-docs/scripts/verify-font-sri.py` re-fetches the stylesheet with the
Chrome user agent, recomputes the digest, and compares it to the pinned value. An
upstream change is caught as a failure rather than silently breaking the fonts. The
script exits 0 with a `SKIP` line when the network is unavailable, so it is safe to run
in an offline pipeline.

```
$ python3 aidlc-docs/scripts/verify-font-sri.py
pinned integrity : sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=
crossorigin      : anonymous
fetched          : 11,196 bytes
computed         : sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=
result           : HASH MATCHES — the pinned integrity value is current
```

---

## 2. D6 — The light-theme amber refinement (contrast)

### The problem

The brief specifies the light theme's accent as the deeper amber `#B8741A`. Measured
against the light panel, that value **fails WCAG AA**:

| Pair | Ratio | Required | Result |
|---|---|---|---|
| `#B8741A` text on `#FBF9F5` panel | 3.60:1 | 4.5:1 | **FAIL** |
| `#FFFFFF` on `#B8741A` button fill | 3.78:1 | 4.5:1 | **FAIL** |

NFR-1.3 requires 4.5:1 for all body text **in both themes**, so the artifact as first
drafted violated a hard requirement. This is execution-plan risk **R3**, confirmed by
measurement rather than assumption.

### The decision

Split the accent into three distinct roles, so the mandated `#B8741A` is preserved
wherever it is a *fill* while every *text* use reaches 4.5:1:

| Token | Dark theme | Light theme | Role |
|---|---|---|---|
| `--accent` | `#E3A53A` | `#B8741A` | Fills, borders, rules, focus rings (non-text → 3:1) |
| `--accent-text` | `#E3A53A` | `#96600F` | Accent-coloured **text** on the form panel (→ 4.5:1) |
| `--accent-ink` | `#1A1208` | `#1A1208` | Ink **on** an amber fill (→ 4.5:1) |
| `--art-accent` | `#E3A53A` | *(inherited)* | Amber on the always-dark artwork panel |

The light theme's `--accent-ink` changed from `#FFFFFF` to `#1A1208`. This is the key
observation: **`#1A1208` on `#B8741A` is 4.90:1**, so the mandated fill colour was never
the problem — the light theme's choice of *white* ink on it was.

### The resulting measurements

Light theme (form panel):

| Pair | Ratio | Required | Result |
|---|---|---|---|
| Body text `#241F1A` on `#FBF9F5` | 15.53:1 | 4.5:1 | PASS |
| Muted `#5E574E` on `#FBF9F5` | 6.77:1 | 4.5:1 | PASS |
| Input text `#241F1A` on `#FFFFFF` | 16.33:1 | 4.5:1 | PASS |
| Link text `#96600F` on `#FBF9F5` | 5.02:1 | 4.5:1 | PASS |
| Link text `#96600F` on `#F5F2EC` | 4.73:1 | 4.5:1 | PASS |
| Button ink `#1A1208` on fill `#B8741A` | 4.90:1 | 4.5:1 | PASS |
| Focus ring `#B8741A` on `#F5F2EC` | 3.39:1 | 3:1 | PASS |

Dark theme and artwork panel all pass as well. The complete matrix is asserted by
`verify-responsive-auth.py` (39 contrast checks), so the ratios above cannot silently
regress.

### The second defect this surfaced

The artwork panel is **always dark** (FR-2.10, FR-6.3) but was reading the theme-swapped
`--accent`. In light theme that put `#B8741A` on the `#1E1D1C` annotation card at
**4.45:1** — just under the bar, and inconsistent with the hard-coded `rgba(227,165,58,…)`
values already in the artwork gradients.

The fix was to introduce the theme-invariant `--art-accent` token and point the three
artwork consumers at it:

- `.art-brand-mark` (brand scales glyph)
- `.art-connectors path` (SVG connector strokes)
- `.card-ref` (the "CIVIL CODE, ART. 541 · E-GOV" citation label)
- `.scanline` (the sweep gradient stops)

`verify-responsive-auth.py` now asserts that **none** of the twelve `--art-*` tokens are
redeclared in the light-theme block, so the artwork panel cannot drift with the theme.

---

## 3. D8 — Alignment to the supplied reference design (revised 2026-10-31)

The first build was verified correct against the *written* brief but did not match the
supplied reference design. The reference screenshot was compared side by side with the
render and the following deltas were closed.

### Artwork panel

| Element | Before | After (reference) |
|---|---|---|
| Contract meta line | "CLAUSE ANALYSIS · E-GOV STATUTES", uppercase + letterspaced, with a rule beneath | **"Draft v3 · 14 pages"**, sentence case, no rule |
| Article headings | "Article 12 (Termination)" | **"Article 12 — Termination"** (em dash) |
| Clause structure | Three flat paragraphs under three headings | **Numbered clauses 12.1, 12.2, 13.1** hanging in the margin |
| Clause prose | Long, single-paragraph statutory text | **Short, clause-sized sentences** matching the reference |
| Contract width | `min(340px, 58%)` | **`min(305px, 50%)`**, left margin `clamp(10px, 5.5%, 64px)` |
| Page bottom | Flat paper | **Warm amber edge glow** (`.contract::after`, 62px, 38% alpha) |
| Card reference line | "Civil Code, Art. 541 · e-Gov" only | **Two lines**: a clause reference ("Clause 12.1 · Notice") above a statute line ("Civil Code, Art. 132 · e-Gov") |
| Card order | GREEN, YELLOW, GREEN | **YELLOW, GREEN, GREEN** — top card is the notice clause |
| Card border | Amber border all round | **A 3px verdict-coloured left edge** (green / yellow), neutral 1px border elsewhere |
| Card reference colour | Amber | **Muted grey**, with the statute line in amber |
| Connector lines | Started inside the contract, crossing the prose | **Start at the contract's right edge**, 0.7px stroke at 45% opacity |
| Headline measure | `max-width: 430px` | **`max-width: 360px`** with `text-wrap: balance` — wraps to two lines |

### Form panel

| Element | Before | After (reference) |
|---|---|---|
| Sign-in subtext | "Sign in to continue analysing contracts." | **"Sign in to review your contracts and chats."** |
| Password placeholder | "••••••••" | **"At least 8 characters"** |
| Google button | Plain text | **The four-colour Google "G" mark** before the label |

### The one conflict, and how it was resolved

The reference design's cards cite **clauses** ("Clause 12.1 · Notice", "Clause 13.1 ·
Governing law") rather than statutes. FR-2.6 requires every card to cite a **real Civil
Code article** with an **e-Gov marker**, and the reference card set has only one such
citation.

Both were satisfied by keeping the reference's two-line card anatomy: the first line is
the clause reference (what the annotation is *about*), the second is the statute
citation (what it is *grounded in*). The card set therefore carries
`Clause 12.1 · Notice / Civil Code, Art. 132 · e-Gov`,
`Clause 12.2 · Termination / Civil Code, Art. 541 · e-Gov`, and
`Clause 13.1 · Governing law / Civil Code, Art. 1 · e-Gov`.

### A layout bug found and fixed during the revision

The first attempt at the hanging clause numbers used `display:flex` on the paragraph.
That made each inline `<span class="mark-yellow">` / `<span class="mark-green">` a
**flex item**, which shredded the prose into three columns. The fix was the classic
hanging indent — `padding-left:32px` with `text-indent:-32px` — which keeps the inline
highlights flowing normally. The contract's left padding was also widened from `26px`
to `34px` so the numbers had room and were not clipped.

### Regression protection

The static verifier gained 10 new assertions covering the card anatomy (3 clause
references, 3 statute lines, 3 verdict chips, 2 GREEN + 1 YELLOW), the numbered clauses
(12.1, 12.2, 13.1), and the two Google brand marks. Geometry was verified across ten
viewport widths from 320px to 2560px: **zero horizontal overflow**, and no card or the
contract escapes the artwork panel at any width.

---

## 4. D7 — The reset restores in place

The first implementation of the success-card reset called `window.location.reload()`.
That is wrong for this artifact: a reload discards the prototype's state, produces a
visible flash, and makes the "try a different account" path feel like leaving the page.

The shipped implementation hides the form's children, shows a dedicated
`#success-region` container, and on reset unhides the form children, clears the
container, clears every `.input` value and the "Keep me signed in" checkbox, resets the
validation state, and focuses the first field — all without a reload.

---

## 5. DOM id scheme

Ids are `<surface>-<role>` for interactive elements and `<surface>-<field>-error` for
their error paragraphs. The surface prefix is `signin` or `register`.

### Structural

| Id | Element |
|---|---|
| `form-region` | The form panel's inner container — the thing that is hidden when the success card shows |
| `tab-signin` | "Sign in" tab (`role="tab"`) |
| `tab-register` | "Create account" tab (`role="tab"`) |
| `tab-underline` | The sliding amber underline (decorative, `aria-hidden`) |
| `live-region` | `role="status" aria-live="polite"` announcement region |
| `success-region` | Container the success card is rendered into |
| `panel-signin` | `role="tabpanel"` for sign-in |
| `panel-register` | `role="tabpanel"` for registration |

### Sign-in surface

`form-signin`, `signin-identifier`, `signin-identifier-error`, `signin-password`,
`signin-password-error`, `signin-remember`, `forgot-password`, `google-signin`,
`signin-notice`

### Register surface

`form-register`, `register-name`, `register-name-error`, `register-email`,
`register-email-error`, `register-password`, `register-password-error`,
`google-register`, `register-notice`

### Conventions

- Each `<input>` has a `<p id="<input-id>-error" class="field-error" aria-hidden="true">`
  sibling, wired via `aria-describedby`.
- The password toggle carries `aria-controls="<input-id>"`.
- Each form carries `novalidate` — the browser's native bubbles are suppressed so the
  artifact's own plain-language messages are the only ones shown.

---

## 6. `data-testid` inventory

16 test ids, all prefixed `auth-`. The static verifier asserts there are at least 12
and that none are duplicated.

| Test id | Targets |
|---|---|
| `auth-tab-signin` | "Sign in" tab |
| `auth-tab-register` | "Create account" tab |
| `auth-signin-form` | Sign-in form |
| `auth-signin-identifier-input` | Email-or-username input |
| `auth-signin-password-input` | Password input |
| `auth-signin-password-toggle` | Sign-in show/hide button |
| `auth-signin-remember-checkbox` | "Keep me signed in" checkbox |
| `auth-forgot-password-button` | "Forgot password?" link |
| `auth-signin-submit-button` | "Sign in" submit button |
| `auth-google-button` | "Continue with Google" (sign-in) |
| `auth-register-form` | Registration form |
| `auth-register-name-input` | Full-name input |
| `auth-register-email-input` | Email input |
| `auth-register-password-input` | Password input |
| `auth-register-password-toggle` | Registration show/hide button |
| `auth-register-submit-button` | "Create account" submit button |
| `auth-google-register-button` | "Continue with Google" (registration) |

The success card's reset control is selected by
`[data-testid="auth-success-reset-button"]` at runtime — it is created by the script, so
it is not present in the static markup.

---

## 7. Validation rule table (as implemented)

Implemented in `validateField(input, mode)` in the artifact's inline script. Every
message is plain language, names the fix, and never leaks a technical token.

### Sign-in

| Field | Condition | Message |
|---|---|---|
| Identifier | empty | "Enter your email address or username to continue." |
| Identifier | not an email **and** not a username | "Enter a valid email address, or a username of at least 3 letters, numbers, dots, dashes or underscores." |
| Password | empty | "Enter your password to continue." |
| Password | any non-empty value | *(no rule — FR-4.6: authentication owns the length policy)* |

### Registration

| Field | Condition | Message |
|---|---|---|
| Name | empty | "Enter your full name so your account can be identified." |
| Email | empty | "Enter your email address so we can reach you." |
| Email | not an email | "Enter a valid email address, for example name@example.com." |
| Password | empty | "Enter a password to create your account." |
| Password | shorter than 8 characters | "Use at least 8 characters for your password." |

### Predicate helpers

- `looksLikeEmail(value)` — requires exactly one `@`, a non-empty local part, and a
  dotted domain with a 2+ character TLD.
- `looksLikeUsername(value)` — at least 3 characters from `[A-Za-z0-9._-]`.

### Error lifecycle

| Event | Effect |
|---|---|
| Submit | Every field in the active mode is validated; the first invalid field receives focus |
| Invalid field | Error text set via `textContent`, `.is-visible` added, `aria-hidden="false"`, `aria-invalid="true"` on the input, `.has-error` class added |
| Blur after a fix | Error cleared: text emptied, `.is-visible` removed, `aria-hidden="true"`, `aria-invalid` removed, `.has-error` removed |
| Any change | The message is announced through `#live-region` (`role="status"`, `aria-live="polite"`) |

No error is ever rendered as markup — `textContent` only (NFR-4.2).

---

## 8. Requirement → implementation traceability

### Functional requirements

| ID | Implementation |
|---|---|
| FR-1.1 | `.page` — `display:grid; grid-template-columns:55fr 45fr; min-height:100vh` |
| FR-1.2 | `@media (max-width:900px)` — single column; `.panel-art{min-height:200px}`; `.art-stage`, `.art-connectors`, `.cards`, `.art-copy` hidden |
| FR-1.3 | `.panel-art` — the left artwork panel |
| FR-1.4 | `.panel-form` — the right form panel |
| FR-1.5 | Both panels sized so the create-account form fits 1440×900 without scrolling (verified by render) |
| FR-2.1 | `.panel-art` background `--art-bg:#171615` |
| FR-2.2 | `.contract` — the tilted page; `--contract-rotation:-1.6deg`; `min(305px,50%)` width; the warm amber bottom edge glow |
| FR-2.3 | `--highlight-yellow` / `--highlight-green` tints over the contract body text |
| FR-2.4 | `.scanline` — `animation:scan-sweep 6s cubic-bezier(.45,0,.55,1) infinite` |
| FR-2.5 | `.art-rules` — the ruled background lines |
| FR-2.6 | `.art-glow` — the radial glow |
| FR-2.7 | `.contract-meta` — "Draft v3 · 14 pages" |
| FR-2.8 | `.art-copy` — the headline and subtext |
| FR-2.9 | `.art-brand-mark` + `.art-brand-name` — the brand lockup |
| FR-2.10 | Artwork tokens are declared once and never redeclared in the light theme |
| FR-3.1 | `.tabs` / `.tab` / `.tab-underline` |
| FR-3.2 | `#panel-signin` / `#panel-register` |
| FR-3.3 | `.field`, `.label`, `.input` |
| FR-3.4 | `.pw-wrap` + `.pw-toggle` — show/hide with `aria-pressed` |
| FR-3.5 | `.check` — the "Keep me signed in" checkbox |
| FR-3.6 | `.link` — the "Forgot password?" button |
| FR-3.7 | `.btn-primary` |
| FR-3.8 | `.btn-outline` — "Continue with Google" |
| FR-3.9 | `.divider` — the "OR" rule |
| FR-3.10 | `.disclaimer` — "Not legal advice · Verdicts are informational" |
| FR-3.11 | `.notice` — the inline demo notice, `role="status"` |
| FR-3.12 | The success card — the `✓` mark, the greeting, the echoed details, the prototype notice, and the reset button |
| FR-3.13 | `.field-error` — the inline error paragraph |
| FR-3.14 | No prototype notice in the **static** markup; the notice appears only after an interaction (verified by the static verifier's visible-text extraction) |
| FR-4.1 | `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected`, `aria-controls`, `aria-labelledby` |
| FR-4.2 | Roving `tabindex` — exactly one tab has `tabindex="0"` |
| FR-4.3 | `#live-region` with `role="status"` and `aria-live="polite"` |
| FR-4.4 | `validateField` — see the validation table above |
| FR-4.5 | `showFieldError` / `clearFieldError` — the error lifecycle above |
| FR-4.6 | No sign-in password length rule; registration enforces 8 characters |
| FR-4.7 | `togglePassword` — `type` swap, `aria-label`, `aria-pressed`, and button text all update together |
| FR-4.8 | `showDemoNotice` — "Forgot password?" and "Continue with Google" report that the flow is not connected |
| FR-4.9 | `showSuccess` / `resetToForm` — the success card and the in-place reset (D3) |
| FR-4.10 | `onTabKeydown` — ArrowLeft/ArrowRight wrap, Home/End jump, automatic activation |
| FR-5.1 | Both tabs and both forms are present in the markup |
| FR-5.2 | Validation state is cleared by `resetToForm` before the form is restored |
| FR-5.3 | The reset restores the form in place without a reload, and clears the entered values |
| FR-6.1 | The dark palette is declared in `:root` |
| FR-6.2 | The light palette is declared in `@media (prefers-color-scheme: light)`, overriding only the form-panel tokens |
| FR-6.3 | The artwork tokens are excluded from the light override |
| FR-6.4 | `--font-serif` (Newsreader) and `--font-sans` (Inter), each with local fallbacks |
| FR-6.5 | `--radius:10px` on cards, inputs, and buttons; `--radius-sm:6px` on the password toggle |
| FR-7.1 | `@media (prefers-reduced-motion: reduce)` |
| FR-7.2 | The scan line and the card fade are the only two `@keyframes` |
| FR-7.3 | Card stagger delays `.4s` / `.8s` / `1.2s` |
| FR-7.4 | The reduced-motion block sets `animation:none` and `opacity:1` on the cards |
| FR-7.5 | The reduced-motion block sets `transition:none` on the underline, inputs, buttons, tabs, and notices |
| FR-7.6 | Every animated property is `transform` or `opacity` |
| FR-7.7 | The tab underline animates `transform` and `width` |
| FR-7.8 | The scan line animates `transform` only |
| FR-7.9 | `.art-glow`, `.art-rules`, `.scanline`, `.art-connectors` all carry `aria-hidden="true"` |
| FR-8.1 | One file, inline CSS, inline JS |
| FR-8.2 | Zero dependencies, zero build step |
| FR-8.3 | `frontend/` and `backend/` are untouched |

### Non-functional requirements

| ID | Implementation |
|---|---|
| NFR-1.1 | Typography uses the serif/sans pairing; hierarchy by size, weight, and colour |
| NFR-1.2 | Semantic landmarks: `header`, `main`, `section`, `footer` |
| NFR-1.3 | Every text pair ≥ 4.5:1 and every non-text pair ≥ 3:1, in **both** themes — asserted by 39 checks in `verify-responsive-auth.py` |
| NFR-1.4 | The focus ring is a visible 2px outline in the accent colour with an offset |
| NFR-2.1 | `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| NFR-2.2 | The 900px breakpoint; below it the layout is a single column |
| NFR-2.3 | The artwork panel collapses to a 200px banner with the logo only |
| NFR-2.4 | `prefers-reduced-motion` is honoured |
| NFR-3.1 | The only network request is the Google Fonts stylesheet — asserted by the behaviour test's `Network.requestWillBeSent` capture |
| NFR-3.2 | No `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, or service worker |
| NFR-4.1 | No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, or `insertRow` |
| NFR-4.2 | User-supplied values reach the DOM only through `textContent` or `createElement` |
| NFR-4.3 | Every input has an associated `<label for>` |
| NFR-4.4 | Errors are associated via `aria-describedby` and announced via `aria-live` |
| NFR-4.5 | No `localStorage`, `sessionStorage`, or `document.cookie` |
| NFR-4.6 | The SRI analysis and accepted Safari deviation are recorded in §1 above |
| NFR-4.7 | No `console.log`, `console.debug`, or `console.info` |
| NFR-4.8 | Every `<form>` carries `novalidate` and has no `action` |
| NFR-4.9 | No `insertRow` or other table-building APIs |
| NFR-5.1 | 0 dependencies, 0 build step |
| NFR-5.2 | Every colour resolves to a token — the static verifier flags any hex literal outside the `:root` and light-theme blocks |
| NFR-5.3 | The two token blocks are the single source of colour truth |
| NFR-6.1 | Every element on the checklist is present (see Step 14 of the code generation plan) |
| NFR-6.2 | Both themes render correctly; the artwork panel stays dark |
| NFR-6.3 | All required copy is verbatim — asserted by 16 string checks |
| NFR-7.1 | The static verifier runs with no third-party dependency |
| NFR-7.2 | The SRI verifier runs with no third-party dependency |

---

## 9. D9 — The annotation cards escaped the artwork panel at 901–1000px

**Found by**: the geometry sweep in `verify-responsive-auth-manual.js` (2026-10-31), the
first check to exercise the split layout between the 900px breakpoint and 1000px.

**Symptom**: at a 901px viewport the artwork panel is 423px wide, but each annotation
card is anchored at `left:54%` / `58%` / `55%` of that panel and then given a fixed
`width:228px`. The pairing overflows as soon as the containing block is narrower than
`228 / (1 − L)`:

| Card | `left` | Escapes below |
|---|---|---|
| 1 (yellow) | 54% | 496px panel |
| 2 (green) | 58% | 543px panel |
| 3 (green) | 55% | 507px panel |

A 423px panel is far below all three thresholds, so at 901–1000px every card's right
edge was clipped by the panel boundary and fragments bled into the light form panel.
Confirmed visually: the capture at 901px showed the cards cut off mid-text with dark
fragments over the form.

**Why no earlier check caught it**: the previous geometry pass only sampled widths at
and above 1080px, where the panel is wide enough for the fixed width to fit. The
breakpoint is `max-width:900px`, so 901–1000px is the narrowest band in which the split
layout is still active — a 100px window that had never been rendered.

**Fix** — cap the width against the space that actually remains, and keep the 228px
design at wide viewports:

```css
.card{
  width:min(228px, calc(100% - var(--card-left, 54%) - 12px));
}
```

Each card declares its own anchor so the two values cannot drift:

```html
<div class="card yellow" style="top:16%;left:54%;--card-left:54%">
```

At 901px the cards now measure 183px / 166px / 179px instead of 228px, and at 1440px
they resolve to the full 228px.

**Regression protection**: `verify-responsive-auth-manual.js` Part 1 now asserts, at
every one of the 14 sweep widths, that no card's right edge exceeds the artwork
panel's right edge and no card's left edge falls before its left edge.

---

## 10. D10 — The annotation card inherited the theme-swapped text colour

**Found by**: the I-3 theme-invariance check in `verify-responsive-auth-manual.js`
(2026-10-31), which measures the artwork panel's colours under
`prefers-color-scheme: dark` and `light` and requires them to be identical.

**Symptom**: `.card` sets a hardcoded dark translucent background
(`rgba(26,25,24,.97)`) but did **not** set `color`. The element therefore inherited the
theme-swappable `--text` token, which measured `rgb(236,232,225)` in the dark theme and
`rgb(36,31,26)` in the light theme. The visible text was unaffected — `.card-text` uses
`var(--art-text)`, `.card-ref` uses `var(--art-text-muted)` and `.card-statute` uses
`var(--art-accent)`, all theme-invariant — but the card element itself resolved to a
light-theme value that would be invisible on its own dark background.

This was a **latent risk rather than a visible defect**: any card text added later
without an explicit colour would have inherited the light theme's ink and become
unreadable on the dark card. The artwork panel is theme-invariant by design
(FR-2.10, FR-6.4), so its contents must be too.

**Fix** — set the colour explicitly on `.card` rather than relying on inheritance:

```css
.card{
  color:var(--art-text);
}
```

**Regression protection**: the I-3 check now asserts twice — once on `.card-text`
(the visible text) and once on the `.card` element itself (the inherited colour) —
that both are identical across the two themes.

---

## 11. Verification summary

| Verifier | What it proves | Result |
|---|---|---|
| `verify-responsive-auth.py` | 152 static assertions — markup balance, id uniqueness, ARIA wiring, label association, forbidden APIs, token discipline, contrast in both themes, verbatim copy, card anatomy, numbered clauses, reduced motion, SRI attributes | **152/152 PASS** |
| `verify-font-sri.py` | The pinned SRI hash still matches the live stylesheet | **HASH MATCHES** |
| `verify-responsive-auth-behaviour.js` | 45 assertions driven through a real Chrome DOM over the DevTools Protocol — tab behaviour, roving tabindex, keyboard navigation, the validation lifecycle, password toggle, demo notices, the password policy, the success card, the in-place reset, XSS safety, reduced motion, and network isolation | **45/45 PASS** |
| `verify-responsive-auth-manual.js` | 115 assertions covering what was previously manual — the 14-width geometry sweep (D9), the success/reset cycle, the six XSS payloads, the storage and cookie probes, the runtime performance measurements, the focus indicators in both themes, and the theme-invariance checks (D10) | **115/115 PASS** |

The behaviour and manual harnesses need the `ws` package. It is installed **outside**
the repository so the project gains no dependency:

```bash
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness && npm install ws
cd - && NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-behaviour.js
cd - && NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-manual.js
```

### The manual items that are now automated

| Formerly-manual item | Now covered by | Result |
|---|---|---|
| 14-width geometry sweep (FR-1.4, FR-1.5) | Part 1 | 0px horizontal overflow at every width; 0 card escapes; the 900px breakpoint behaves as a stacked layout |
| 6 XSS payloads (D-1) | Part 3 | None executed; none created an element; all rendered as literal text |
| Storage and cookie probes (D-2) | Part 3 | `localStorage`, `sessionStorage` and `document.cookie` all empty |
| Runtime performance (B-1…B-5) | Part 4 | FCP ≈76ms, CLS 0.0000, stable document height across the 6s sweep, ≤18ms tab-switch at 4× CPU slowdown, and no overflow with the font request blocked |
| Focus indicators in both themes (NFR-1.2) | Part 5 | A visible ring on all six controls in both themes |
| Theme invariance of the artwork panel (I-3) | Part 5 | Background, card border, card text and inherited card colour all identical across themes |

### Visual review

56 state renders — 7 states × 4 widths (390 / 900 / 1080 / 1440) × 2 themes — were
captured and reviewed. The states are: sign-in default, sign-in errors, sign-in with
the password shown, register default, register errors, the success card, and the
forgot-password notice. The 1080px and 1440px renders confirm all three annotation
cards sit inside the artwork panel with their verdict-coloured left edges and
connectors intact; the 900px and 390px renders confirm the stacked layout and the
200px logo-only banner.

---

## 12. Accepted deviations — summary

| # | Deviation | Justification | Covered by |
|---|---|---|---|
| 1 | Safari refuses the Google Fonts stylesheet (SRI mismatch) | No single SRI hash can satisfy content-negotiated responses. The mandated local fallback stack covers the visual result. | NFR-4.6 (b), §1 |
| 2 | Light-theme accent text uses `#96600F`, not `#B8741A` | `#B8741A` is 3.60:1 on the cream panel and fails WCAG AA. `#B8741A` is retained as the fill colour. | NFR-1.3, §2 |
| 3 | Light-theme button ink is `#1A1208`, not `#FFFFFF` | White on `#B8741A` is 3.78:1 and fails WCAG AA. `#1A1208` on `#B8741A` is 4.90:1. | NFR-1.3, §2 |
| 4 | The artwork panel uses a theme-invariant `--art-accent` | The artwork panel stays dark in both themes (FR-2.10); a theme-swapped accent put `#B8741A` at 4.45:1 on the card. | FR-2.10, NFR-1.3, §2 |
| 5 | The reset restores the form in place rather than reloading | A reload discards state and flashes the page; the requirement is a reset, not a navigation. | FR-5.3, §4 |
| 6 | The annotation cards carry a clause reference **and** a statute citation | The reference design cites clauses only; FR-2.6 requires a real Civil Code article with an e-Gov marker on every card. Both are shown, on two lines. | FR-2.6, §3 |
