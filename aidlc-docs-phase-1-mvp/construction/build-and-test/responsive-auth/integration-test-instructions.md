# Integration Test Instructions — Responsive Auth Design Unit

**Unit**: `responsive-auth` — standalone responsive login/register design artifact
**Deliverable**: `context-docs/mockups/08-responsive-login-register.html`
**Date**: 2026-10-31 (refreshed after Revision 1 and after the D9/D10 defect pass)
**Total**: 160 automated CDP checks (45 behavioural + 115 integration) + 10 manual integration scenarios

> **Status update (2026-10-31).** The items that were previously left to a human have
> now been automated in `aidlc-docs/scripts/verify-responsive-auth-manual.js`
> — **115/115 PASS**. That covers the 14-width geometry sweep, the success → reset
> cycle, the six XSS payloads, the storage and cookie probes, the runtime
> performance measurements, the focus indicators in both themes, and the
> theme-invariance checks. The 10 manual scenarios in Part B remain **available as
> a human cross-check**, not as an outstanding obligation — but **I-9 is still
> worth running by eye**, because it is the only check that compares the artwork
> against the supplied reference design, and it is the check that catches defects
> every automated assertion passes. Running it found two real defects (D9, D10).
>
> The full manual sweep is still worth doing once, for the reason given in
> §Part B — but it is no longer the only line of defence.

---

## Purpose

This unit has **no service to integrate with**. There is no backend, no API, no database, and no framework. What it does integrate with is the **browser itself** — and that is exactly where its real integration risk lives.

Static analysis (152 checks) proves the markup and the token system are *well-formed*. It cannot prove that the artefact actually **behaves** when a browser parses it. The specific integration boundaries are:

| Boundary | What crosses it | Risk |
|---|---|---|
| **DOM ↔ Script** | The inline `<script>` binds to elements the parser produced | A `getElementById` that returns `null` at bind time is invisible to static analysis |
| **Keyboard ↔ ARIA** | Arrow/Home/End keys drive the tablist state machine | The APG pattern's roving `tabindex` and automatic activation are runtime contracts |
| **CSS cascade ↔ Media queries** | `@media (prefers-color-scheme: light)` and the 900 px breakpoint override the base token set and the split layout | A rule that loses the cascade produces a *wrong-looking* page that still passes every structural check |
| **`prefers-reduced-motion` ↔ Animation** | The motion-preference media query disables the scan line, the card fade-in, and the underline transition | An override that fails to match leaves animations running for users who asked for none |
| **User input ↔ Validation state** | Field values flow into `aria-invalid`, the visible error, and the `aria-live` announcement | The error lifecycle has three coupled outputs; they can diverge |
| **User input ↔ DOM insertion** | The identifier the user types is echoed into the success card | This is the DOM-XSS boundary (SECURITY-05 / NFR-4.2) |
| **Document ↔ Network** | Exactly one outbound request: the SRI-protected font stylesheet | Any other request is an unintended side channel |

These are **integration** boundaries rather than unit boundaries because each one crosses from the artefact's own code into a subsystem the artefact does not own.

---

## Part A — Automated behavioural verification (CDP)

### A1. Run the behaviour verifier

The verifier speaks the DevTools Protocol over a WebSocket, so it needs the `ws` package. It is **not** a dependency of the deliverable — it is a dependency of the *test harness*, and it is installed in a scratch directory outside the repository so that the artefact's zero-dependency guarantee is not polluted.

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

# One-time: ensure the harness dependency is available
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1
npm install ws >/dev/null 2>&1
cd - >/dev/null

# Run the verifier
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-behaviour.js
```

- **Expected**: 45 lines prefixed `PASS`, ending with:
  ```
  45/45 checks passed
  ALL INTERACTION CHECKS PASS
  ```
- **Exit code**: `0` when every check passes.
- **Report location**: stdout — each line is `PASS|FAIL  <check name>  — <detail>`.

> **If you see `Cannot find module 'ws'`**, `NODE_PATH` was not set. This is the single most likely failure when running the verifier from a fresh shell. `ws` must not be added to the repository — the deliverable is required to have zero dependencies (FR-8.4), and the harness lives outside the repo precisely so that it cannot violate that.

**How it works**: the script spawns headless Chrome with `--remote-debugging-port=9222`, serves the artefact over `http://localhost:9333` (so the same-origin policy and the font request behave as in production rather than under `file://`), and drives the page over the DevTools Protocol. It evaluates JavaScript in the page, dispatches real keyboard events, and reads back computed styles and DOM state.

### A2. What each of the 45 checks proves

The verifier runs 15 scenarios. Each check maps to a requirement.

#### Scenario 1 — Initial state (5 checks) → FR-3.1, FR-3.2, NFR-1.5

| # | Check | Asserts |
|---|---|---|
| 1 | `initial: sign-in tab selected` | `aria-selected="true"` on the sign-in tab |
| 2 | `initial: create-account tab not selected` | `aria-selected="false"` on the create-account tab |
| 3 | `initial: register panel hidden` | The register panel is hidden on load |
| 4 | `initial: sign-in panel visible` | The sign-in panel is visible on load |
| 5 | `initial: roving tabindex — only active tab is 0` | Exactly one tab is in the tab order; the other is `-1` |

#### Scenario 2 — Clicking the Create account tab (5 checks) → FR-3.1, FR-3.2

| # | Check | Asserts |
|---|---|---|
| 6 | `tab click: register tab selected` | `aria-selected` flips to the clicked tab |
| 7 | `tab click: sign-in tab deselected` | The previously selected tab is deselected |
| 8 | `tab click: register panel shown` | The register panel becomes visible |
| 9 | `tab click: sign-in panel hidden` | The sign-in panel becomes hidden |
| 10 | `tab click: roving tabindex moved` | `tabindex` moved with the selection |
| 11 | `tab click: underline moved` | The sliding underline's `transform` is no longer `translateX(0px)` |

#### Scenario 3 — Arrow-key navigation (3 checks) → FR-3.2, NFR-1.1

| # | Check | Asserts |
|---|---|---|
| 12 | `ArrowRight wraps to sign-in and activates it` | ArrowRight from the last tab wraps to the first **and activates it** (automatic activation) |
| 13 | `ArrowRight moves focus to the activated tab` | `document.activeElement` follows the activation |
| 14 | `End key jumps to the last tab` | `End` selects the final tab |

#### Scenario 4 — Validation on empty submit (5 checks) → FR-4.1, FR-4.3, NFR-1.4

| # | Check | Asserts |
|---|---|---|
| 15 | `empty submit: identifier error shown` | A visible, non-empty error message |
| 16 | `empty submit: password error shown` | A visible error message on the password field |
| 17 | `empty submit: aria-invalid set` | `aria-invalid="true"` on the offending field |
| 18 | `empty submit: live region announced` | The `aria-live` region receives text |
| 19 | `empty submit: no success card` | A failed validation does **not** advance to the success state |

#### Scenario 5 — Error clears on blur after a fix (2 checks) → FR-4.7, FR-5.2

| # | Check | Asserts |
|---|---|---|
| 20 | `blur after fix: identifier error clears` | The message is removed and the error element is hidden |
| 21 | `blur after fix: aria-invalid removed` | `aria-invalid` is cleared (not left as `"true"`) |

#### Scenario 6 — Invalid identifier rejected (1 check) → FR-4.2, NFR-4.1

| # | Check | Asserts |
|---|---|---|
| 22 | `invalid identifier rejected with a plain-language message` | A malformed email is rejected with a human-readable message, not a code or a raw regex |

#### Scenario 7 — Username accepted on sign-in (1 check) → FR-4.8

| # | Check | Asserts |
|---|---|---|
| 23 | `username accepted on sign-in` | A username (no `@`) is accepted on the sign-in form — the format rule is register-only |

#### Scenario 8 — Password show/hide (5 checks) → FR-3.5, FR-3.6

| # | Check | Asserts |
|---|---|---|
| 24 | `show/hide: input type becomes text` | `type` flips to `text` |
| 25 | `show/hide: aria-label updated` | `aria-label` becomes `Hide password` |
| 26 | `show/hide: aria-pressed updated` | `aria-pressed="true"` |
| 27 | `show/hide: button text updated` | The visible label becomes `Hide` |
| 28 | `show/hide: toggles back to password` | The toggle is reversible |

#### Scenario 9 — Demo notices (2 checks) → FR-3.14, FR-5.5

| # | Check | Asserts |
|---|---|---|
| 29 | `forgot password: inline notice shown` | The forgot-password control shows an inline notice rather than navigating |
| 30 | `google button: inline notice shown` | The Google button shows an inline notice — no popup, no redirect |

#### Scenario 10 — Register password policy (1 check) → FR-4.6, NFR-4.4 (SECURITY-12)

| # | Check | Asserts |
|---|---|---|
| 31 | `register: 8-character minimum enforced` | The message mentions 8 characters |

#### Scenario 11 — Success card content (3 checks) → FR-5.3, FR-5.4, FR-5.5

| # | Check | Asserts |
|---|---|---|
| 32 | `register: valid form produces the success card` | A valid registration reaches the success state |
| 33 | `success: states it is a prototype / no account created` | The card says plainly that no account was created |
| 34 | `success: reset link present` | A "use a different account" control exists |
| 35 | `success: form panel hidden while the success card shows` | The form is hidden, so a screen reader does not announce both |

#### Scenario 12 — Reset restores the form in place (3 checks) → FR-5.5

| # | Check | Asserts |
|---|---|---|
| 36 | `reset: success card removed` | The success card is removed from the DOM |
| 37 | `reset: form restored in place (no page reload)` | The form returns **without** a navigation — no reload, no history entry |
| 38 | `reset: field cleared` | The previously entered value is cleared |

#### Scenario 13 — XSS safety (3 checks) → NFR-4.2, NFR-4.8, NFR-4.9 (SECURITY-05)

| # | Check | Asserts |
|---|---|---|
| 39 | `XSS: injected markup did not execute` | A payload containing a script did not run |
| 40 | `XSS: no injected <img> element created` | No element was created from the payload |
| 41 | `XSS: payload rendered as literal text` | The payload appears as text — proving `textContent`, not `innerHTML` |

#### Scenario 14 — Reduced motion (3 checks) → FR-7.4, FR-7.5

| # | Check | Asserts |
|---|---|---|
| 42 | `reduced motion: scan line not displayed` | `display: none` under `prefers-reduced-motion: reduce` |
| 43 | `reduced motion: cards fully visible immediately` | The cards' `opacity` is 1 with no transition waiting on an animation |
| 44 | `reduced motion: underline transition disabled` | The underline's `transition` is suppressed |

#### Scenario 15 — Network isolation (1 check) → NFR-3.1, FR-5.5

| # | Check | Asserts |
|---|---|---|
| 45 | `network: no request outside the font CDN` | The only outbound request is to the Google Fonts origin |

### A3. Re-run after any change to the artefact

```bash
python3 aidlc-docs/scripts/verify-responsive-auth.py && \
python3 aidlc-docs/scripts/verify-font-sri.py && \
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-behaviour.js
```

All three must pass. The behaviour verifier is the one that catches regressions in the *interaction* logic; the static one catches regressions in the *structure*.

---

## Part B — Manual integration scenarios

These require a human at a browser. Each one exercises a boundary the automated verifier covers only partially — usually a boundary where the assertion is about *appearance* or about a combination of state.

**Setup** — serve the file over `http://`, not `file://`:

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 -m http.server 8000 &
# open http://localhost:8000/context-docs/mockups/08-responsive-login-register.html
```

### Scenario I-1 — Keyboard-only traversal of the whole screen

- **Description**: The page must be fully usable without a mouse (NFR-1.1).
- **Test steps**:
  1. Load the page. Click **once** on a non-interactive area to set the focus context, then press `Tab` repeatedly.
  2. Tab through: sign-in tab → create-account tab → identifier field → password field → show/hide → keep-signed-in → forgot password → submit → "or" divider → Google button → disclaimer.
  3. On the tablist, press `ArrowRight`, `ArrowLeft`, `Home`, `End`.
- **Expected results**:
  - Every interactive element receives a visible focus ring with ≥ 3:1 contrast (NFR-1.2).
  - Arrow keys move **and** activate the tab; the underline follows.
  - The active tab is the only tab in the tab order.
  - No focus trap: you can reach the Google button and then the browser chrome.

### Scenario I-2 — The cascade at the 900 px boundary

- **Description**: The split layout must become the stacked banner layout at exactly 900 px (NFR-2.2, NFR-2.3).
- **Test steps**:
  1. Resize the window to **901 px** width. Observe the layout.
  2. Resize to **899 px**. Observe the layout.
  3. Resize to **900 px** exactly.
- **Expected results**:
  - At 901 px: the 55/45 split — dark artwork panel on the left, form on the right.
  - At 899 px and at 900 px: single column; the artwork becomes a **200 px logo-only banner**; the form remains fully usable with no horizontal scroll.
  - The form at the narrow width is still fully visible and submittable.

### Scenario I-3 — The theme swap (the highest-value manual check)

- **Description**: The form panel swaps to cream; the artwork panel must **stay dark** (FR-6.2, FR-6.3).
- **Test steps**:
  1. DevTools → Rendering → Emulate CSS `prefers-color-scheme: light`.
  2. Observe the left artwork panel.
  3. Observe the amber elements: the submit button, the input borders, the focus rings, the underline, the annotation-card accents, the connector lines.
- **Expected results**:
  - The artwork panel is **unchanged** — still the dark palette, same accent.
  - The form panel is cream, with the deeper amber `#B8741A` on fills and borders.
  - Any **text** in the amber family is the darker `#96600F`, not `#B8741A` — this is the split that keeps the light theme above 4.5:1.
  - No artwork element changes hue when the theme flips.

### Scenario I-4 — Focus ring visibility against both themes

- **Description**: NFR-1.2 — focus indicators ≥ 3:1 against their background.
- **Test steps**: In each theme, tab through every control and inspect the focus ring's contrast against the surface directly behind it.
- **Expected results**: A clearly visible amber ring on every control, in both themes. The ring must not be the only thing distinguishing a focused control from an unfocused one at low contrast.

### Scenario I-5 — The error lifecycle end to end

- **Description**: FR-4.7, NFR-1.4 — errors appear, announce, and clear correctly.
- **Test steps**:
  1. Submit the sign-in form empty. Observe the errors and the `aria-live` region.
  2. Type a valid identifier. **Do not blur.** The error should still be there.
  3. Blur the field. The error should clear.
  4. Type an invalid identifier (e.g. `a@b`), blur, and observe the message.
  5. Type a valid identifier, blur, and observe the message change.
- **Expected results**:
  - Errors are plain-language — no regex, no error codes.
  - The `aria-live` region announces on appearance.
  - The error clears **only once the value is actually fixed** — not merely when the field is touched.
  - A stale error never persists alongside a now-valid value.

### Scenario I-6 — The success → reset cycle without a reload

- **Description**: FR-5.5 — the reset restores the form in place.
- **Test steps**:
  1. Switch to **Create account**, fill name / email / a 9-character password, submit.
  2. Observe the success card. Read it fully.
  3. Click "use a different account".
  4. Check the browser's back button and the URL.
- **Expected results**:
  - The success card states plainly that **no account was created** and that this is a prototype.
  - After reset, the form returns with its fields cleared — **no page reload** (the form's field contents are cleared, and the page did not navigate).
  - The URL is unchanged and the back button does not return to a stale page.

### Scenario I-7 — Password visibility toggle

- **Description**: FR-3.5, FR-3.6.
- **Test steps**:
  1. Type a password into the sign-in field.
  2. Click **Show**. Observe the field, the button label, and the icon.
  3. Click **Hide**.
- **Expected results**:
  - The field type flips to `text` and back to `password`.
  - The button's visible text flips `Show` ↔ `Hide`, its `aria-label` follows, and `aria-pressed` reflects the state.
  - The password is **never** written to storage or the console (NFR-4.5).

### Scenario I-8 — The demo paths

- **Description**: FR-3.14, FR-5.5 — no real backend is connected.
- **Test steps**: Click **Forgot password?**, then switch tabs and click **Continue with Google**.
- **Expected results**:
  - Each shows an inline, plain-language notice.
  - Nothing navigates. No popup opens. No network request is made.
  - The Network panel shows only the font stylesheet request.

### Scenario I-9 — The artwork panel at rest

- **Description**: FR-2 — the artwork must match the supplied reference design.
- **Test steps**: Load at 1080 px and compare against the reference image.
- **Expected results**:
  - The tilted contract page shows the title, the `Draft v3 · 14 pages` meta line, two article headings with em-dashes, and the clause numbers `12.1`, `12.2`, `13.1` **hanging in the margin** (not clipped, not inside the prose).
  - The yellow and green highlight phrases are inline within the clause sentences.
  - The warm amber glow sits along the bottom edge of the paper.
  - The five skeleton bars are visible below the last clause.
  - The three annotation cards each show a clause reference, a statute citation with an e-Gov marker, a verdict chip, and a verdict-coloured left edge — 2 GREEN and 1 YELLOW.
  - The connector lines run from the contract's right edge to the cards, and do **not** cross the prose.

> This scenario is the one that caught two defects that all 152 static checks and all 45 behavioural checks passed. It is not optional.

### Scenario I-10 — Keyboard interaction with the reveal animations

- **Description**: FR-7.3, FR-7.4 — motion must be reduced for users who ask for it.
- **Test steps**:
  1. Set the OS or DevTools to `prefers-reduced-motion: reduce`.
  2. Reload and interact.
  3. Repeat with the preference off.
- **Expected results**:
  - With `reduce`: the scan line is not displayed, the cards are visible immediately with no fade, the underline does not transition.
  - With the preference off: the scan line sweeps on its 6-second cycle, the cards fade in, the underline slides.

---

## Part C — Geometry sweep (responsive integration)

The layout must not overflow at any width. This is checked by measuring the rendered box geometry, not by reading CSS.

**This is now automated.** Run it with:

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-manual.js
```

The harness sweeps all **14 widths** — 320, 360, 390, 414, 480, 600, 768, 900, 901, 1024, 1280, 1440, 1920 and 2560 — and asserts, at each one:

| Assertion | Requirement |
|---|---|
| `document.documentElement.scrollWidth <= viewportWidth` — no horizontal scrollbar | NFR-2.1 |
| The artwork panel's right edge is inside the viewport | NFR-2.4 |
| No annotation card's box extends past the artwork panel's box | NFR-2.4 |
| No annotation card's box extends before the artwork panel's left edge | NFR-2.4 |
| The contract's box is inside the artwork panel's box | NFR-2.4 |
| At ≥ 900 px: `scrollHeight <= 900` — the form fits 1440×900 with **0 px overflow** | FR-1.5 |
| At ≤ 900 px: the layout is stacked and the artwork panel is the 200 px logo-only banner | FR-1.3 |

**Recorded result** (2026-10-31, after the D9 fix): geometry verified across **all 14 viewport widths from 320 px to 2560 px** with **zero horizontal overflow**, **zero card escapes**, and the contract inside the panel at every width. FR-1.5 measured `overflowPx: 0` for both the sign-in and register forms at 1440×900, using `Emulation.setDeviceMetricsOverride` so that `clientHeight` reflects a true viewport rather than the browser-chrome offset.

> **Why `setDeviceMetricsOverride` matters**: without it, headless Chrome reports a `clientHeight` smaller than the nominal window height by the browser-chrome offset, which produced a **false** "the page scrolls" reading. The override is the difference between a real measurement and a wrong one.

> **Why the sweep must reload after each viewport change**: `Emulation.setDeviceMetricsOverride` alone does **not** re-resolve percentage- and `min()`-based widths in an already-loaded page. The harness calls `Page.reload({ignoreCache: true})` after every viewport change; without it the page keeps the geometry it had at launch width and the sweep reports **false escapes**. This produced two rounds of misleading diagnostics before it was diagnosed.

> **Why the 901 px width matters**: the breakpoint is `max-width:900px`, so 900 px is *stacked* and 901 px is the narrowest *split* layout. That 100 px band had never been rendered before the D9 defect was found there — see `generation-notes.md` §9.

---

## Part D — Security integration checks

The `security-baseline` extension is **enabled** for this unit. Its rules that bite on this artefact are SECURITY-05, 09, 12, 13 and 15. The infrastructure rules are N/A — a static file has no deployment surface.

| Rule | Check | Where |
|---|---|---|
| **SECURITY-05** | No user-supplied value is inserted as HTML | Static groups 8; behaviour checks 39–41 (XSS); integration Part 3 (6 payloads) |
| **SECURITY-09** | No default credentials, no hardcoded keys, no real endpoint URLs | Static groups 10, 11; behaviour check 45 |
| **SECURITY-12** | Password policy ≥ 8 characters, enforced client-side, with a plain-language message | Behaviour check 31; FR-4.6 |
| **SECURITY-13** | The external stylesheet carries a correct `integrity` and `crossorigin="anonymous"` | Static group 12; `verify-font-sri.py` |
| **SECURITY-15** | Validation and the demo paths fail safely — a generic message, never a partially-submitted form | Behaviour checks 19, 22, 29, 30 |
| — | The password is never stored, logged, or transmitted | Static group 9 (no `localStorage` / `sessionStorage` / `document.cookie` / `console.*`); integration Part 3 (runtime probes) |

### D-1 — XSS probe — **automated**

The integration harness submits **six** payloads into the identifier field (the only value echoed into the success card) and asserts three things per payload:

| Assertion | Expected |
|---|---|
| `window.__xss` is `null` | The payload never executed |
| No `<img>` or `<iframe>` element was created | The payload was not parsed as markup |
| The payload renders as literal text | The value was inserted with `textContent`, not `innerHTML` |

```
<img src=x onerror="window.__xss=1">
<svg/onload=alert(1)>
"><script>window.__xss=1</script>
javascript:window.__xss=1
<iframe src="javascript:window.__xss=1">
<body onload=window.__xss=1>
```

**Recorded result**: 16/16 assertions PASS — all six payloads inert.

### D-2 — Storage probe — **automated**

The harness asserts, after a full submit cycle:

| Assertion | Expected | Recorded |
|---|---|---|
| `Object.keys(localStorage)` | `[]` | `[]` |
| `Object.keys(sessionStorage)` | `[]` | `[]` |
| `document.cookie` | `""` | `""` |
| `window.__xss` across all payloads | `null` | `null` |

---

## Part E — Reviewing results

| Check | Command | Pass criteria |
|---|---|---|
| Behaviour verifier | `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-responsive-auth-behaviour.js` | 45/45 `PASS`, exit 0 |
| Integration verifier | `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-responsive-auth-manual.js` | 115/115 `PASS`, exit 0 |
| Geometry sweep | Part C, inside the integration verifier | 0 px horizontal overflow at all 14 widths; 0 card escapes; 0 px vertical overflow at 1440×900 |
| Keyboard traversal | Scenario I-1 | Every control reachable; focus ring visible in both themes |
| Theme swap | Scenario I-3 | Artwork panel unchanged; no `#B8741A` used as text |
| Error lifecycle | Scenario I-5 | Errors clear only when the value is actually fixed |
| Success / reset | Scenario I-6 | No page reload; fields cleared; URL unchanged |
| XSS probes | Part D-1, automated | All payloads literal; `window.__xss` undefined |
| Storage probe | Part D-2, automated | Empty storage; empty cookie string |
| Runtime performance | Part 4, automated | FCP ≤ 200 ms; CLS ≈ 0; stable document height; tab switch ≤ 50 ms at 4× CPU slowdown |
| Focus indicators | Part 5, automated | A visible ring on all six controls in both themes |
| Artwork vs. the reference design | Scenario I-9 — **still by eye** | The only check that compares the artwork to the supplied reference |

---

## Part F — Fixing a failure

1. **Identify the boundary** from the scenario number — script/DOM, keyboard/ARIA, cascade/media-query, motion preference, input/validation, input/DOM-insertion, or document/network.
2. **Read the requirement** for that boundary in `aidlc-docs/inception/requirements/responsive-auth/requirements.md`.
3. **Fix the artefact**, then re-run the full sequence (A3).
4. **If a check fails only under one theme or one viewport**, suspect the cascade: a token redeclared in the light block, or a rule whose specificity lost to a media query.
5. **If a check fails only at one width**, suspect a fixed `px` width or a `min-width` that does not collapse — the responsive rules should use `min()`/`clamp()`/percentage widths.
6. **Never "fix" a failing check by relaxing the assertion.** The 45 behaviour checks and the 115 integration checks encode FR-3, FR-4, FR-5, the security rules and the responsive contract; a relaxed assertion silently removes a requirement.

---

## Part G — Coverage note

| Requirement | Automated | Still by eye |
|---|---|---|
| FR-1 — layout | Geometry sweep (Part C, 14 widths) | I-2, I-3 |
| FR-2 — artwork | Static groups 17–25; card geometry at every width | **I-9** |
| FR-3 — form | Checks 1–14, 24–30 | I-1, I-7, I-8 |
| FR-4 — validation | Checks 15–23, 31 | I-5 |
| FR-5 — behaviour | Checks 32–38; the success → reset cycle in Part 2 | I-6 |
| FR-6 — visual design | Static groups 13–15, 31; the theme-invariance checks in Part 5 | I-3, I-4 |
| FR-7 — motion & a11y | Checks 42–44; the focus-indicator checks in Part 5 | I-1, I-4, I-10 |
| FR-8 — constraints | Static groups 1, 8–11 | — |
| NFR-1 — accessibility | Groups 3–7, 15, 18, 21, 30, 31; checks 1–14, 42–44; focus indicators in both themes | I-1, I-4 |
| NFR-2 — responsiveness | Geometry sweep (Part C, 14 widths) | I-2 |
| NFR-3 — performance | Group 10; check 45; the runtime measurements in Part 4 | performance doc |
| NFR-4 — security | Groups 8–12; checks 31, 39–41, 45; the 6 XSS payloads and the storage probes in Part 3 | — |

**Only I-9 remains genuinely manual**, and it is the highest-value manual check in the set: it compares the artwork against the supplied reference design, and it is the check that caught the defects every automated assertion passed — the card geometry in the 901–1000 px band (D9) and the card's inherited theme colour (D10).
