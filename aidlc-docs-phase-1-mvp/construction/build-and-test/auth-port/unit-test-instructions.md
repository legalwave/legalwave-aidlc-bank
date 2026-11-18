# Unit Test Execution — Auth Port Unit

**Unit**: `auth-port` — apply the approved `responsive-auth` design to the running React SPA
**Deliverable**: `frontend/src/features/auth/` + two additive edits to `frontend/src/styles/tokens.css` and `frontend/index.html`
**Date**: 2026-10-31
**Total checks**: 172 static + 131 CDP behaviour = **303**

---

## Context: what "unit test" means for this unit

The project has **no test runner** — no Jest, no Vitest, no Playwright. That is a pre-existing property of the MVP, not an omission introduced here. The `property-based-testing` extension was explicitly **opted out** at Requirements Analysis because PBT-09 requires a framework dependency, and FR-8.6 forbids adding one.

This unit therefore uses the same two-part substitute the frontend unit used, extended with a browser-level harness:

| Layer | Tool | What it proves |
|---|---|---|
| **Type + lint** | `tsc -b` and `oxlint` | The code compiles and the lint baseline is not regressed |
| **Static verifier** | `verify-auth-port.py` | The sources contain what the requirements say they must contain |
| **Behaviour verifier** | `verify-auth-port.js` | The **running SPA** actually behaves as specified |

The static verifier is not a smoke test. It asserts against the requirement text directly:

- parses `tokens.css` and `auth.css` with a **brace-matching CSS scanner** that skips strings and comments and recurses into `@media`
- pins the **exact values** of the 20 pre-existing `:root` tokens, so a silent edit to a shared token is caught even though the token *name* is still present
- scans every `.ts`/`.tsx` in the auth feature for forbidden APIs (`dangerouslySetInnerHTML`, `eval(`, `new Function(`, `.innerHTML =`, `document.write(`)
- checks the SRI `integrity` and `crossorigin` attributes on the Google Fonts stylesheet
- checks that **no file under `backend/` was touched**

The behaviour verifier drives the **production build** in headless Chrome over the DevTools Protocol. Its 131 checks cover what static analysis cannot — the tab navigation, the focus behaviour after a route change, the validation lifecycle, the theme invariance, the geometry, and the theme containment.

---

## Part A — Static verification (the unit-test substitute)

### A1. Run the static verifier

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-auth-port.py
```
- **Expected output**:
  ```
  ============================================
  checks run      : 172
  passed          : 172
  failed          : 0
  result          : ALL CHECKS PASS
  ============================================
  ```
- **Exit code**: `0` = all pass, `1` = one or more failures.
- **Report location**: stdout. Every failing assertion is printed with its reason.

### A2. Type-check

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run build
```
- **Expected**: `tsc -b` succeeds, then `vite build` reports `✓ 377 modules transformed.`
- **Exit code**: `0`.

`tsc -b` type-checks the **whole project**, not only the changed files. A type error in `features/auth/` fails the build before Vite bundles anything.

### A3. Lint

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run lint
```
- **Expected**: **0 errors**, **5 warnings** — all pre-existing, all in files this unit did not touch:
  `app/providers.tsx`, `features/chat/components/ChatThread.tsx` (×2), `features/chat/hooks/useChatStream.ts`, `shared/components/Markdown.tsx`.
- **Exit code**: `0`.

> Any new warning under `features/auth/**` is a regression from this unit and must be fixed. The count of 5 is the baseline, not a target to match by silencing.

### A4. Confirm the backend is untouched

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
find backend -newermt "2026-10-31 05:55" -type f \
  -not -path "*/node_modules/*" -not -path "*/__pycache__/*" 2>/dev/null
```
- **Expected**: **empty** (FR-8.8).

---

## Part B — Check inventory

The 172 static checks fall into the following groups. Each is derived from the requirement text; none is decorative. The counts are the **runtime** check count — loops multiply a single call site over every item in the set.

| # | Group | Checks | Requirement |
|---|---|---|---|
| 1 | The 20 original `:root` tokens are present **with their exact values** | 21 | FR-8.7 — the chat, citations and settings screens are dark-only |
| 2 | The auth tokens are declared in a separate `.auth-page` scope | 1 | FR-6.1, FR-8.7 |
| 3 | A `prefers-color-scheme: light` block exists | 1 | FR-6.2 |
| 4 | The light block is scoped to `.auth-form-panel` only | 3 | FR-6.3, FR-8.7 |
| 5 | No artwork token (`--art-*`) is redeclared in the light block | 1 | FR-6.4 |
| 6 | No light-scheme `:root` override exists anywhere in `tokens.css` | 1 | FR-8.7 — the light theme must not leak |
| 7 | `.auth-card` exists, with the `min()` width cap relative to `--card-left` | 3 | **D9** |
| 8 | The annotation card carries an explicit theme-invariant `color` | 1 | **D10** |
| 9 | `.auth-clause` uses a hanging indent and **not** `display:flex` | 3 | FR-2.4 |
| 10 | A `prefers-reduced-motion` block exists | 1 | FR-7.6 |
| 11 | A 900 px breakpoint block exists | 1 | NFR-2.4 |
| 12 | `auth.css` hard-codes no unexpected raw hex | 1 | NFR-5.3 |
| 13 | Every selector in `auth.css` is scoped to the auth feature | 1 | NFR-5.4 — no global selector leakage |
| 14 | The **app's** testid family is present | 12 | FR-8.1 |
| 15 | The **artifact's** testid family is present | 19 | FR-8.2 |
| 16 | The field `id`s are present | 6 | FR-4.1 |
| 17 | `aria-selected`, `aria-controls`, `aria-labelledby`, a named tablist | 4 | FR-3.1, NFR-1.2 |
| 18 | The roving `tabindex` is implemented (selected = 0, other = −1) | 1 | FR-3.2, NFR-1.2 |
| 19 | The password toggle switches the type and exposes `aria-pressed` | 2 | FR-3.7, FR-7.7 |
| 20 | The `describedBy` wiring for both password fields | 3 | FR-4.2 |
| 21 | The artwork contract is reachable by its original testid | 1 | FR-2.1, FR-8.1 |
| 22 | The **real** API calls survive — `signIn`, `signUp`, and the navigation to the chat | 4 | FR-5.1, FR-5.2, D1 |
| 23 | The server error is surfaced; the busy flag is always cleared | 2 | FR-5.6, NFR-4.7 |
| 24 | The validation rules — a username is accepted on sign-in, the register password has an 8-character minimum, the sign-in password has **no** length rule | 3 | FR-4.5, FR-4.6 |
| 25 | The blur re-validation is armed only after a submit; the live region is cleared before an announcement | 2 | FR-4.1, FR-4.3 |
| 26 | The Google Fonts stylesheet carries SRI `integrity` and `crossorigin` | 2 | NFR-6.3 |
| 27 | The forbidden-API scan across the whole auth feature | 5 | NFR-4.2, NFR-4.8, NFR-4.9 |
| 28 | The backend directory is present and untouched | 1 | FR-8.8 |
| | **Total** | **172** | |

> **The two testid families (groups 14 and 15) are the subtlest group in this unit.** An element can carry only **one** `data-testid`, but decision D6 requires **both** families to be emitted. The resolution: where the app's family already owns an element, the artifact's testid rides on a **wrapper** that encloses it. The static verifier asserts all 31 testids appear in the sources; the CDP harness asserts all 31 appear in the **rendered DOM** and that the artifact's form testid **encloses** the app's form testid on both routes.

---

## Part C — Requirement → check traceability

### Functional requirements

| Requirement | Verified by |
|---|---|
| **FR-1** — The two-panel screen: a dark artwork panel on the left, the form panel on the right, collapsing below 900 px | Static group 11; CDP Parts 8, 9 (geometry sweep + breakpoint) |
| **FR-2** — The artwork panel: the tilted contract, the meta line, clauses 12.1/12.2/13.1, the highlights, the skeleton bars, the scan sweep, the three annotation cards with their statute citations and verdict chips | Static groups 7, 8, 9, 21; CDP Parts 7, 8, 12 |
| **FR-3** — The tabbed form: the full APG tablist, the sliding underline, the Show/Hide toggles, the amber primary button, the "or" divider, the Google button with the brand mark, the disclaimer footer | Static groups 17, 18, 19; CDP Parts 3, 4, 6 |
| **FR-4** — The validation rule set, the plain-language messages, the `aria-live` announcement, `aria-invalid` / `aria-describedby`, the error clears on blur | Static groups 20, 24, 25; CDP Part 5 |
| **FR-5** — The **real** submit against `POST /api/auth/login` and `/api/auth/register`, then the navigation to the chat; the server error is surfaced | Static groups 22, 23; CDP Part 1 (the sign-in and register contracts) |
| **FR-6** — The two-theme token system; the artwork scoped out of the light theme; all the artwork colours theme-invariant | Static groups 3, 4, 5, 8; CDP Part 7 |
| **FR-7** — Motion and accessibility — the scan sweep, the card fade-in, the underline slide, the reduced-motion path | Static groups 9, 10; CDP Part 10 |
| **FR-8** — Both `data-testid` families, the preserved contracts, the SRI stylesheet, the untouched backend | Static groups 14, 15, 16, 21, 26, 28; CDP Parts 1, 2, 12, 13 |

### Non-functional requirements

| Requirement | Verified by |
|---|---|
| **NFR-1** — Accessibility — keyboard operable, the APG pattern, announced errors, correct ARIA, no colour-only state | Static groups 17, 18, 19, 20, 25; CDP Parts 3, 5 |
| **NFR-2** — Responsiveness — 320 px to 2560 px with no horizontal scroll; the 900 px breakpoint | Static group 11; CDP Parts 8, 9 (14 widths) |
| **NFR-3** — Performance — no new dependency, no layout thrash from the animations, the bundle did not grow materially | Build instructions steps 2, 3; the performance instructions (P1–P8) |
| **NFR-4** — Security — validation before any request, no HTML insertion, no password persistence, the busy flag always cleared, no default credentials | Static groups 23, 27; CDP Parts 5, 11 |
| **NFR-5** — Maintainability — no raw hex outside the token blocks, every selector scoped, the tokens as the single source | Static groups 12, 13; the build instructions |
| **NFR-6** — Fidelity — the SRI hash on the CDN stylesheet, the design's own rules re-verified in the SPA | Static groups 26; CDP Part 12 |

---

## Part D — Reviewing results

| Check | Command | Pass criteria |
|---|---|---|
| Static verifier | `python3 aidlc-docs/scripts/verify-auth-port.py` | `ALL CHECKS PASS`, 172 checks, exit 0 |
| Type-check + build | `npm --prefix frontend run build` | `tsc -b` clean, `✓ 377 modules transformed.`, exit 0 |
| Lint | `npm --prefix frontend run lint` | 0 errors, 5 pre-existing warnings, exit 0 |
| CDP behaviour verifier | `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-auth-port.js` | 131/131 `PASS`, exit 0 |
| Backend untouched | `find backend -newermt "2026-10-31 05:55" -type f` | empty |

---

## Part E — Fixing a failure

1. **Read the assertion message.** It names the requirement it protects.
2. **Fix the application, not the verifier.** The verifier is the executable form of the requirements. Loosening an assertion to make a check pass invalidates the check it was written to protect.
3. **For a token failure**, check whether the failure is in the *value* or in the *scope*:
   - a wrong **value** on one of the 20 original tokens → a shared token was edited. That would restyle the chat, citations and settings screens. Revert the value.
   - a token found **outside** `.auth-page` → an auth token leaked into the global scope. Move it into the `.auth-page` block.
   - a `--art-*` token found in the light block → the artwork would change with the theme. Remove the redeclaration.
4. **For a testid failure**, determine which family owns the element. **Never** add a second `data-testid` to an element that already has one — nest a wrapper instead.
5. **For a focus failure** after a tab change, check that `pendingFocusMode` is still **module-scoped**. A component ref is destroyed by the route change and the focus intent is lost.
6. **Re-run the full sequence** after any edit:
   ```bash
   python3 aidlc-docs/scripts/verify-auth-port.py && \
   npm --prefix frontend run build && \
   NODE_PATH=/tmp/cdp-harness/node_modules \
     node aidlc-docs/scripts/verify-auth-port.js
   ```
   A change that fixes one check can break another — for example, widening the light block to fix a scope check would break the artwork theme-invariance checks.

---

## Part F — The verifier was mutation-tested

The static verifier was itself subjected to a mutation test: **seven deliberate violations** were injected into the sources and the verifier was re-run.

| # | Injected violation | Caught? |
|---|---|---|
| 1 | An original `:root` token re-valued | ✅ |
| 2 | The light block re-scoped to `:root` | ✅ |
| 3 | The `min()` width cap dropped from `.auth-card` | ✅ |
| 4 | The D10 explicit `color:var(--art-text)` dropped | ✅ |
| 5 | The hanging indent replaced with `display:flex` | ✅ |
| 6 | The `prefers-reduced-motion` block removed | ✅ |
| 7 | The roving `tabindex` removed | ✅ |

**All seven were caught.** A verifier that cannot fail is not a verifier — this is the evidence that the 172 checks are load-bearing rather than decorative.

> If you add a check, add it to this table with its injected violation. A new check with no mutation test is an untested test.

---

## Part G — Manual visual review

The verifiers cannot judge whether the ported screen **looks** like the approved design. The visual review remains a mandatory step, not an optional one.

Render at several widths and compare against `context-docs/mockups/08-responsive-login-register.html` and the supplied reference design:

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run build
for w in 390 900 901 1080 1440; do
  google-chrome --headless --disable-gpu --hide-scrollbars \
    --window-size=$w,900 \
    --screenshot=/tmp/auth-port-$w.png \
    "http://127.0.0.1:9336/login"
done
```
- **Expected**: no horizontal scrollbar; the artwork panel intact on the left at ≥ 900 px; the stacked banner layout at ≤ 900 px; the same visual language as the approved artifact.

> **Include 901 px in the sweep.** The breakpoint is `max-width: 900px`, so 901 px is the narrowest *split* layout — a 100 px band that is easy to miss and that is where the D9 card-escape defect lived.

> **Wait ~2 seconds before capturing.** The three annotation cards fade in on a stagger — card 3 has a 1.2 s animation delay plus a 0.62 s duration.

> **Serve the production build, not the dev server**, for the same reason the CDP harness does — the dev server's HMR websocket causes an endless reload loop under headless Chrome.

Confirm the annotated cards, the hanging clause numbers, the highlight phrases, and the warm paper glow all match the reference design. Also confirm the **light theme** changes only the form panel — the artwork panel must stay dark.

---

## Part H — If an automated suite is added later

This unit deliberately ships no test runner. If one is introduced in a later phase, the highest-value first targets — in priority order — are:

| Target | Where | Why |
|---|---|---|
| `validateField` | `frontend/src/features/auth/hooks/useAuthValidation.ts` | The single pure function that carries the whole FR-4 rule set. The username-vs-email branch and the mode-specific password rule are the two cases a user hits first |
| The `pendingFocusMode` focus handoff in `AuthTabs.tsx` | `frontend/src/features/auth/components/AuthTabs.tsx` | The module-scoped intent is the least obvious mechanism in the unit, and it exists because of a React Router remount. A unit test on the remount semantics would lock that reasoning in |
| `AuthScreen` | `frontend/src/features/auth/components/AuthScreen.tsx` | The two-testid-family wrapper mechanism is easy to break by "tidying" an element and giving it a second `data-testid` |
| The CSSOM walker in the CDP harness | `aidlc-docs/scripts/verify-auth-port.js` | A plain `CSSStyleRule` also exposes `cssRules` (nested CSS), so the walker must handle the style case **before** the container case. This bit once already |
| The `setInputValue` helper in the CDP harness | `aidlc-docs/scripts/verify-auth-port.js` | React 19's controlled-input value tracker swallows `el.value = v`. The helper assigns through the native prototype setter. This bit once already |
