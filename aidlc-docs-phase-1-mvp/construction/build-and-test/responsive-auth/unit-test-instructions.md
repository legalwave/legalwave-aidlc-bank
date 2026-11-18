# Unit Test Execution — Responsive Auth Design Unit

**Unit**: `responsive-auth` — standalone responsive login/register design artifact
**Deliverable**: `context-docs/mockups/08-responsive-login-register.html`
**Date**: 2026-10-31 (refreshed after Revision 1)
**Total checks**: 152 static + 1 SRI hash + 45 behavioural = **198**

---

## Context: what "unit test" means for this unit

This unit is a **single self-contained HTML file** with inline CSS and JS. There is no module graph, no import/export surface, and no test runner — and **adding one would violate FR-8.1/FR-8.4** (one file, zero dependencies).

The `property-based-testing` extension was explicitly **opted out** at Requirements Analysis for exactly this reason. The unit therefore uses a purpose-built **static verifier** as its unit-test substitute, exactly as the frontend unit used `tsc` + `oxlint` instead of a Jest suite.

The static verifier is not a lightweight smoke test. It asserts against the requirement text directly:

- parses the HTML with `html.parser` and walks the tag stack
- resolves **every** ARIA reference against the actual id set
- computes **WCAG 2.1 contrast ratios** from the token values for every declared text and non-text pair, in **both** themes
- strips comments and string literals before scanning for forbidden APIs, so a token *named* in a comment is not mistaken for a call

The behavioural verifier (45 checks, described in `integration-test-instructions.md`) covers what static analysis cannot.

---

## Part A — Static verification (the unit-test substitute)

### A1. Run the static verifier

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-responsive-auth.py
```

- **Expected output**:
  ```
  file            : context-docs/mockups/08-responsive-login-register.html
  size            : 44987 bytes
  checks run      : 152
  result          : ALL CHECKS PASS
  ```
- **Exit code**: `0` = all pass, `1` = one or more failures.
- **Report location**: stdout. On failure, every failing assertion is printed with its reason (and, for contrast, the measured ratio).

### A2. Re-verify the SRI hash

```bash
python3 aidlc-docs/scripts/verify-font-sri.py
```
- **Expected**: `result : HASH MATCHES — the pinned integrity value is current`
- **Exit code**: `0`.

### A3. Confirm the deliverable is still the only artifact

This project is **not** under version control, so "what changed" is verified by file modification time rather than `git status`.

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
find frontend backend -newermt "2026-10-31 01:26" -type f \
  -not -path "*/node_modules/*" -not -path "*/.vite/*" 2>/dev/null
```
- **Expected**: **empty** — no file under `frontend/` or `backend/` was created or modified by this unit (FR-8.3).
- Adjust the timestamp to the moment this unit began when re-running this check later.

---

## Part B — Check inventory

The 152 static checks fall into the following groups. Each is derived from the requirement text; none is decorative. The counts are the **runtime** check count (loops multiply a single call site over every item in the set).

| # | Group | Checks | Requirement |
|---|---|---|---|
| 1 | Markup balance | 1 | FR-8.1 — the file is well-formed HTML |
| 2 | Duplicate ids | 1 | NFR-1.5 — ARIA references are unambiguous |
| 3 | ARIA references resolve | 1 | NFR-1.5, FR-7.9 |
| 4 | Every input has a `<label for>` | 1 | NFR-1.1, FR-4.2 |
| 5 | Tablist pattern wiring — 1 tablist, 2 tabs, 2 panels, `aria-selected`, `aria-controls`, `aria-labelledby` | 9 | FR-3.1, NFR-1.5 |
| 6 | Roving tabindex — exactly 1 selected, exactly 1 `tabindex="0"` | 2 | NFR-1.1, FR-3.2 |
| 7 | Password toggles — 2, each with `aria-label` and a resolvable `aria-controls` | 5 | FR-3.5, FR-3.6 |
| 8 | Forbidden APIs — `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `insertRow` | 7 | NFR-4.2, NFR-4.8, NFR-4.9 |
| 9 | No persistence or logging — `localStorage`, `sessionStorage`, `document.cookie`, `console.log/debug/info` | 6 | NFR-4.5 |
| 10 | No outbound calls — `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `navigator.serviceWorker` | 6 | NFR-3.1, FR-5.5 |
| 11 | Form has no real endpoint — no `action`, not `method=post`, has `novalidate` | 6 | NFR-4.3, FR-5.5 |
| 12 | SRI on the font stylesheet — 1 stylesheet link, `sha256-` integrity, `crossorigin="anonymous"` | 3 | NFR-4.6 |
| 13 | Token discipline — no hex literal outside a token block | 2 | NFR-5.2 |
| 14 | Required palette present — every mandated hex from the brief | 11 | NFR-6.2 |
| 15 | **WCAG contrast, both themes** — every text pair ≥ 4.5:1, every non-text pair ≥ 3:1 | 39 | NFR-1.2, NFR-1.3 |
| 16 | Verbatim copy — every string named in the brief | 14 | NFR-6.3 |
| 17 | e-Gov statute citations — a real Civil Code article on every annotation card | 4 | FR-2.6 |
| 18 | Annotation card anatomy — 3 `card-ref`, 3 `card-statute`, 3 verdict chips, 2 GREEN + 1 YELLOW | 5 | FR-2.5, FR-2.6, NFR-1.6 |
| 19 | Numbered clauses — `12.1`, `12.2`, `13.1` | 4 | FR-2.3 |
| 20 | Google brand mark on both buttons | 1 | FR-3.8 |
| 21 | Verdict chips carry text, not colour alone | 2 | NFR-1.6 |
| 22 | Reduced-motion block present | 4 | FR-7.4, FR-7.5 |
| 23 | Only two automatic motions (scan line + card fade-in) | 2 | NFR-3.3 |
| 24 | Motion durations (6 s scan, 200 ms fade) | 2 | FR-2.4, FR-7.3 |
| 25 | Contract rotation | 1 | FR-2.2 |
| 26 | 900 px breakpoint | 2 | FR-1.2, NFR-2.2 |
| 27 | 10 px radius | 1 | FR-6.5 |
| 28 | Viewport meta tag | 1 | NFR-2.1 |
| 29 | `data-testid` coverage — ≥ 12 present, all unique (17 in the shipped artifact) | 2 | testability |
| 30 | `aria-live` region present | 2 | FR-4.3, NFR-1.4 |
| 31 | Decorative elements hidden from the a11y tree | 4 | FR-7.9 |
| 32 | No prototype notice in the rendered markup (it is a JS notice) | 1 | FR-3.14 |
| | **Total** | **152** | |

> **The theme-invariance of the artwork tokens is asserted inside groups 15 and 31**, and it is the assertion that caught the second contrast defect. The artwork panel is always dark, so its accent must not follow the form panel's theme swap. Before that assertion existed, `#B8741A` was being applied to the artwork's annotation cards in light theme, measuring 4.45:1 against `#1E1D1C`. The fix introduced a theme-invariant `--art-accent`.

---

## Part C — Requirement → check traceability

### Functional requirements

| Requirement | Verified by |
|---|---|
| **FR-1** — 55/45 split, single column below 900 px, 200 px logo banner, fits 1440×900 | Groups 26, 28 + behaviour + geometry sweep (see integration doc) |
| **FR-2** — Artwork panel: tilted contract, meta line, numbered clauses, highlights, skeleton bars, glow, scan sweep, ruled lines, radial glow, three annotation cards with clause ref + statute + e-Gov + verdict chip | Groups 17, 18, 19, 22, 23, 24, 25 + behaviour |
| **FR-3** — Tabbed form (full APG tablist), sliding underline, show/hide toggles, keep-signed-in, amber button, "or" divider, Google button with brand mark, disclaimer footer | Groups 5, 6, 7, 20 + behaviour |
| **FR-4** — Validation rules, plain-language messages, `aria-live`, `aria-invalid`/`aria-describedby`, error clears on blur | Groups 4, 30 + behaviour |
| **FR-5** — Success card stating no account was created; in-place reset without reload | Behaviour |
| **FR-6** — Two-theme token system; artwork scoped out; all 12 artwork colours theme-invariant | Groups 13, 14, 15, 31 |
| **FR-7** — Motion and accessibility | Groups 22, 23, 24, 31 + behaviour |
| **FR-8** — Single self-contained file, no app changes, no backend | Groups 1, 8, 9, 10, 11 + build instructions A3 |

### Non-functional requirements

| Requirement | Verified by |
|---|---|
| **NFR-1** — Accessibility | Groups 3, 4, 5, 6, 7, 15, 18, 21, 30, 31 + behaviour |
| **NFR-2** — Responsiveness | Groups 26, 28 + geometry sweep |
| **NFR-3** — Performance | Groups 10, 23, 24 + performance doc |
| **NFR-4** — Security (security-baseline enabled) | Groups 8, 9, 10, 11, 12, 15 + behaviour (XSS, network) |
| **NFR-5** — Maintainability | Groups 13, 14, 31 + build instructions (structure) |
| **NFR-6** — Fidelity to the brief | Groups 14, 16, 17, 18, 19, 20 + visual review |

---

## Part D — Reviewing results

| Check | Command | Pass criteria |
|---|---|---|
| Static verifier | `python3 aidlc-docs/scripts/verify-responsive-auth.py` | `ALL CHECKS PASS`, 152 checks, exit 0 |
| SRI hash | `python3 aidlc-docs/scripts/verify-font-sri.py` | `HASH MATCHES`, exit 0 |
| Behaviour verifier | `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-responsive-auth-behaviour.js` | 45/45 `PASS`, exit 0 |
| Integration verifier | `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-responsive-auth-manual.js` | 115/115 `PASS`, exit 0 |
| Self-containment | URL scan (build instructions, step 2) | 3 URLs, all `https://fonts.*` |
| App untouched | `find frontend backend -newermt "2026-10-31 01:26" -type f` | empty |
| Plan diagrams | `python3 aidlc-docs/scripts/validate-plan-diagrams.py` | `OK` |

---

## Part E — Fixing a failure

1. **Read the assertion message.** It names the requirement it protects and, for contrast, the measured ratio with the offending pair.
2. **Fix the artifact, not the verifier.** The verifier is the executable form of the requirements. Loosening an assertion to make a check pass invalidates the check it was written to protect.
3. **For a contrast failure**, compute the ratio for the offending pair and decide whether the fix is:
   - a **darker/lighter token value**, or
   - a **token split** (one token serving two jobs — e.g. an accent used as both a fill and as text).

   The light-theme amber is the worked example. `#B8741A` is a valid fill (4.90:1 under `#1A1208` ink) but invalid as text (3.60:1 on the cream panel). The correct fix was to split it into `--accent` / `--accent-text` / `--accent-ink` — **not** to darken it, because NFR-6.2 mandates the exact hex.
4. **For a structural failure** (markup balance, ARIA resolution), re-read the corresponding FR before editing.
5. **Re-run the full sequence** after any edit:
   ```bash
   python3 aidlc-docs/scripts/verify-responsive-auth.py && \
   python3 aidlc-docs/scripts/verify-font-sri.py && \
   NODE_PATH=/tmp/cdp-harness/node_modules \
     node aidlc-docs/scripts/verify-responsive-auth-behaviour.js && \
   NODE_PATH=/tmp/cdp-harness/node_modules \
     node aidlc-docs/scripts/verify-responsive-auth-manual.js
   ```
   A change that fixes one check can break another — for example, adding a colour literal outside the token block satisfies a visual requirement but breaks Group 13 (token discipline).

---

## Part F — If an automated suite is added later

This unit deliberately ships no test runner. If one is introduced in a later phase, the highest-value first targets — in priority order — are:

| Target | Where | Why |
|---|---|---|
| `validateIdentifier` / `validatePassword` | the inline `<script>` | Pure functions with the clearest contract. The password policy (8-character minimum) and the identifier format check are the two rules a user hits first. |
| `setFieldError` / `clearFieldError` | the inline `<script>` | The error lifecycle: set `aria-invalid`, write the message, announce via the `aria-live` region, and clear on blur once the value is fixed. |
| `activateTab` | the inline `<script>` | The roving-tabindex state machine — the single most intricate logic in the file, and the one the APG pattern constrains most tightly. |
| `showSuccess` / `resetToForm` | the inline `<script>` | The success/reset cycle, including the in-place restore with no reload and the field clearing. |
| The contrast helper | `verify-responsive-auth.py` | Already implemented as a reusable function. A future browser-side check would let the same pairs be verified against *computed* colours rather than declared tokens. |

---

## Part G — Manual visual unit review

The verifier cannot judge whether the artifact **looks** like the supplied reference design. Four defects during this build were invisible to the static and behavioural checks and were caught only by rendering and comparing:

1. **Clause numbers clipped** — `12.1` rendered as `2.1` because the negative `text-indent` pushed the number outside the contract's left padding.
2. **`display:flex` on `.clause` shredded the prose into three columns** — the inline highlight spans became flex items.
3. **The annotation cards escaped the artwork panel at 901–1000 px** (D9) — each card was anchored at a percentage of a panel only ~423 px wide but given a fixed 228 px width, so the right edge was clipped and fragments bled into the form panel. The previous geometry pass sampled only widths at and above 1080 px, so this band had never been rendered.
4. **The annotation card inherited the theme-swapped text colour** (D10) — `.card` set a dark background but no `color`, so it inherited `--text`. The visible text was unaffected, but any card text without an explicit colour would have been unreadable on the dark card. The theme-invariance check had only measured the panel background and the card border, never the card's text.

The first two were found in Revision 1 by rendering at 1080 px and comparing against the reference image. The second two were found in the post-approval pass by the 14-width geometry sweep and the theme-invariance check. The visual review therefore remains a mandatory step, not an optional one.

Render at several widths and compare against the reference:

```bash
for w in 390 900 1080 1440; do
  google-chrome --headless --disable-gpu --hide-scrollbars \
    --window-size=$w,900 \
    --screenshot=/tmp/responsive-auth-$w.png \
    "file://$PWD/context-docs/mockups/08-responsive-login-register.html"
done
```
- **Expected**: no horizontal scrollbar, the artwork panel intact on the left at ≥ 900 px, and the stacked banner layout at ≤ 900 px.

> **Include 901 px in the sweep.** The breakpoint is `max-width:900px`, so 901 px is the narrowest *split* layout — a 100 px band that is easy to miss and that is where D9 lived. The integration harness sweeps all 14 widths for exactly this reason.

> **Wait ~2 seconds before capturing.** The three annotation cards fade in on a stagger — card 3 has a 1.2 s animation delay plus a 0.62 s duration. A screenshot taken earlier shows one card, or one and a half, and can be mistaken for a rendering bug.

Confirm the annotated cards, the hanging clause numbers, the highlight phrases, and the warm paper glow all match the reference design.
