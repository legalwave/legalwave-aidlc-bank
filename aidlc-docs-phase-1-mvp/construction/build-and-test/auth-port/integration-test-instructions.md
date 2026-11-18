# Integration Test Instructions — Auth Port Unit

**Unit**: `auth-port` — apply the approved `responsive-auth` design to the running React SPA
**Deliverable**: `frontend/src/features/auth/` + two additive edits to `frontend/src/styles/tokens.css` and `frontend/index.html`
**Date**: 2026-10-31
**Total**: **131 automated CDP checks** across 13 parts + 6 manual integration scenarios

---

## Purpose

This unit's integration risk is **not** the same as the `responsive-auth` unit's. The artifact integrated with nothing but the browser. This port integrates with a **running React SPA**, and the boundaries that matter are different — and in two places genuinely dangerous:

| Boundary | What crosses it | Risk |
|---|---|---|
| **React Router ↔ the tab set** | Selecting a tab **navigates** between `/login` and `/register`, so React Router **unmounts** the page component and mounts a fresh one | Focus is lost to `<body>` on every arrow-key tab change. This is a real, shipped accessibility defect — see §"The focus defect" below |
| **The auth screen ↔ the rest of the SPA** | The light theme is a `prefers-color-scheme` override; the chat, citations and settings screens are **dark-only** and share the same 20 global tokens | A `:root`-scoped light override would restyle the **entire application**. This is the theme-containment boundary (FR-8.7) |
| **The two `data-testid` families ↔ one element** | The app's contract (`login-form`, …) and the artifact's contract (`auth-signin-form`, …) must both be emitted | An element carries only **one** `data-testid`. The two families must be emitted on **nested** elements, or one family is silently lost |
| **The form ↔ the API** | The port keeps the **real** `signIn` / `signUp` calls (D1) | The artifact's demo-only success card must **not** be ported; a validation failure must not reach the network |
| **The component tree ↔ the CSS scope** | `auth.css` adds rules; `tokens.css` gains an `.auth-page` scope and a scoped light block | An unscoped selector would leak the design into the chat screen |
| **The session ↔ the route guards** | `providers.tsx` reads the token in a **state initialiser** | Seeding `localStorage` after boot is never seen — the harness must seed it **before** the page scripts run |
| **The component ↔ the browser's a11y tree** | The APG tablist, the `aria-live` region, the `aria-pressed` toggle, the `role="status"` notice | ARIA that is present in the source but not in the rendered DOM is not ARIA |

> **These are the boundaries the static verifier cannot reach.** A `useEffect` keyed on the wrong dependency compiles, lints, and passes a source scan — and still drops the focus.

---

## Part A — Automated behavioural verification (CDP)

### A1. Run the verifier

The verifier speaks the DevTools Protocol over a WebSocket, so it needs the `ws` package. It is **not** a dependency of the SPA — it is a dependency of the *test harness*, and it is installed in a scratch directory outside the repository so that FR-8.6 is never violated.

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

# One-time: ensure the harness dependency is available
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1
npm install ws >/dev/null 2>&1
cd - >/dev/null

# The harness serves the PRODUCTION BUILD — build it first.
npm --prefix frontend run build

# Run the verifier
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-auth-port.js
```
- **Expected output**: 131 lines prefixed `PASS`, ending with:
  ```
  131/131 checks passed
  ALL CHECKS PASS
  ```
- **Exit code**: `0` when every check passes.
- **Report location**: stdout — each line is `PASS|FAIL  <check name>  — <detail>`.

> **If you see `Cannot find module 'ws'`**, `NODE_PATH` was not set. This is the single most likely failure when running from a fresh shell. `ws` must **not** be added to `frontend/package.json` — FR-8.6 forbids it.

> **If you see `FATAL: no production build found`**, you skipped the build step. The harness serves `frontend/dist` itself.

### A2. What the 13 parts prove

| Part | Checks | Covers | Requirements |
|---|---|---|---|
| **1** — Structure and contracts | 37 | The `/login` route renders; all 31 testids appear in the **rendered DOM**; the artifact's form testid **encloses** the app's form testid; the artwork contract is reachable by its original testid; the real `signIn` is called; a successful sign-in navigates to the chat | FR-5.1, FR-8.1, FR-8.2, FR-8.3, D1 |
| **2** — The `/register` route | 21 | The same contract on `/register`: the real `signUp`, the navigation to the chat, the register testid family, the artifact's form testid enclosing the app's | FR-5.2, FR-8.1, FR-8.2, D1 |
| **3** — Tab navigation | 8 | The APG keyboard pattern — `role="tablist"`, `aria-selected`, `aria-controls`, `aria-labelledby`, the roving `tabindex`, Arrow/Home/End navigation, and **focus following the selection** across the route swap | FR-3.1, FR-3.2, **FR-3.3**, NFR-1.2 |
| **4** — The password toggle | 8 | The toggle swaps `type` between `password` and `text`, exposes `aria-pressed` reflecting the state, and names the action | FR-3.7, FR-7.7 |
| **5** — The validation lifecycle | 17 | An empty submit is blocked before any request; the identifier rules (email **or** username); the register password's 8-character minimum; the sign-in password's **lack** of a length rule; the error clears on blur; the error is announced in the live region | FR-4.1 … FR-4.9, NFR-4.2 |
| **6** — The demo notices | 4 | "Forgot password?" and "Continue with Google" raise an explicit notice in a `role="status" aria-live="polite"` region rather than navigating nowhere | FR-3.10, FR-3.11, D5 |
| **7** — Theme invariance | 5 | The artwork panel's background, card border, card text and **inherited** card colour are byte-identical in both themes, while the form panel **does** change | FR-2.9, FR-6.4, D10 |
| **8** — Geometry sweep | 5 | Across 14 widths (320–2560 px): no horizontal overflow, the annotation cards never escape the artwork panel, the `min()` cap binds where the space is narrower | NFR-2.1 … NFR-2.5, **D9** |
| **9** — The breakpoint and the fit | 1 | Below 900 px the layout collapses to a single column; at ≥ 900 px the split layout holds; both forms fit 1440×900 with 0 px overflow | FR-1.2, FR-1.3, NFR-2.4 |
| **10** — Reduced motion | 3 | Under `prefers-reduced-motion: reduce` the scan line is removed, the cards are visible immediately, and the transitions are disabled | FR-7.4, FR-7.5, FR-7.6 |
| **11** — The password is never persisted | 3 | After a failed submit, the password appears in neither `localStorage`, `sessionStorage`, nor `document.cookie`; and it is not logged | NFR-4.5 |
| **12** — The source artifact's static invariants | 12 | The artifact's own rules still hold **inside the SPA** — the `min()` cap is present in the **declared** CSS (read from the CSSOM, not the computed value), the D10 colour is present, the hanging indent is present, the roving `tabindex` is present | FR-2.4, FR-8.5, D9, D10 |
| **13** — Theme containment | 7 | Seeds a session, navigates to the chat, and asserts the chat body is still `rgb(31, 27, 28)` under `prefers-color-scheme: light` — **the light theme does not leak out of the auth screen** | **FR-8.7** |

### A3. How the harness works

1. Spawns headless Chrome with `--remote-debugging-port=9236`.
2. Serves `frontend/dist` from a **built-in static server** on `127.0.0.1:9336` — with an SPA fallback to `index.html` for every unknown path, so the client-side routes resolve.
3. Drives the page over the DevTools Protocol: `Emulation.setDeviceMetricsOverride` for the viewport, `Emulation.setEmulatedMedia` for the theme and the motion preference, `Page.reload({ignoreCache:true})` after every viewport or media change, and `Runtime.evaluate` to read the DOM.
4. Uses `Page.addScriptToEvaluateOnNewDocument` to seed `localStorage` **before** the page scripts run — the only reliable way, because `providers.tsx` reads the token in a **state initialiser**.

> **Why the harness serves the production build and not the dev server** — this is load-bearing, not a preference. The Vite dev server holds an HMR websocket open. Under CDP that produced an **endless reload loop** in which React never mounted (the `#root` element stayed empty, `bodyLen` 103). Serving the production build removes the HMR client entirely, and the harness then became deterministic: **131/131 checks pass on repeated consecutive runs.**

Two consequences of testing the production build that a developer must know:

- The production CSS **minifies hex colours to lower case**, so the token comparisons are **case-insensitive** (`hexEq`). A naive `===` against `#1F1B1C` fails against `#1f1b1c`.
- `textContent` is used instead of `innerText` for the chat content check, because `innerText` is layout-dependent and returns `''` for rendered-but-not-laid-out content.

---

## Part B — The focus defect (the one real bug the harness found)

**This is the most important integration finding of the unit, and it is worth reading in full.**

### The symptom

After pressing `ArrowRight` on the tab set, the route changed to `/register` and the correct tab became selected — but `document.activeElement` was **`null`**. Focus had been lost to `<body>`.

### The cause

`AuthTabs` handles the arrow key, calls `onSelect(next)`, and then calls `tabRefs.current[next]?.focus()`. But selecting a tab **navigates** (D2), and React Router unmounts `LoginPage` and mounts `RegisterPage`. The `focus()` call landed on the node that was about to be unmounted, so the browser discarded the focus.

### The first fix attempted, and why it failed

The intent was moved into a `useRef` plus a `useEffect` keyed on `mode`, so the focus would be applied after the re-render. That still failed, because the component is **remounted**, not re-rendered: React Router replaces the page component, so `AuthTabs` is unmounted and a fresh instance is mounted. A fresh instance has a fresh ref, and the ref was already `null`.

### The fix that worked

The pending-focus intent is held in a **module-scoped variable**:

```ts
let pendingFocusMode: AuthMode | null = null
```

Module scope is the correct lifetime: it survives the route swap, and it is discarded when the auth page is left entirely. The keydown handler records the intent and navigates; a mount effect reads it and focuses the newly mounted tab.

> **Do not "tidy" this back into a ref.** A ref is the more idiomatic React shape, and it is **wrong** here. The comment in `AuthTabs.tsx` records the reasoning; the CDP Part 3 checks lock the behaviour in.

### What it would have shipped

A keyboard user pressing `ArrowRight` would have had focus thrown to the top of the document, losing their place in the tab set on **every** tab change — a direct violation of the APG pattern (FR-3.3), under which focus MUST follow the selection.

---

## Part C — Manual integration scenarios

These six scenarios are **available as a human cross-check**, not as an outstanding obligation. Every one of them is already covered by the automated harness; running them by hand is a second opinion, not a gap.

### I-1 — Sign in with a real account

1. Start the backend and the frontend.
2. Register a new account through `/register`.
3. Sign in through `/login` with the same credentials.
4. Confirm the chat screen renders and the session survives a reload.

- **Expected**: the sign-in navigates to `/chat`; a reload keeps the session; the token is stored under `jlca_token` and the user under `jlca_user` — **both keys unchanged** from before this unit.
- **Why it matters**: D1 replaced the artifact's demo-only success card with the **real** submit. The artifact's FR-5.3/5.4 said "no account was created"; the port does create one, and the port says so.

### I-2 — The server error surfaces

1. Stop the backend (or point it at a bad URL).
2. Submit the sign-in form with valid-looking credentials.

- **Expected**: the message appears in the `login-form-error` element with `role="alert"`; the form is **not** left in the busy state; the submit button becomes enabled again.
- **Why it matters**: the busy flag must always be cleared, or the form deadlocks after one failure. This is NFR-4.7 (fail-safe) and SECURITY-15.

### I-3 — The demo-only controls

1. Click "Forgot password?".
2. Click "Continue with Google".
3. Click the Show/Hide password toggle.

- **Expected**: the first two raise an explicit notice — "Password reset is not connected in this prototype." and "Google sign-in is not connected in this prototype." — in a `role="status" aria-live="polite"` region, and **nothing navigates**. The toggle swaps the input's type and its `aria-pressed` state.
- **Why it matters**: NFR-4.7 forbids a control from misrepresenting its effect. "Keep me signed in" is **not rendered at all** (D4) rather than rendered as an inert no-op, because the session lifetime is fixed by `providers.tsx` and no code path would honour the control.

### I-4 — Keyboard-only traversal

1. `Tab` into the tab set.
2. Use `ArrowRight`, `ArrowLeft`, `Home`, `End`.
3. `Tab` out.

- **Expected**: the roving `tabindex` means the tab set is **one** tab stop; the arrows move both the selection and the focus; the focus ring is visible on the selected tab.
- **Why it matters**: this is the scenario the focus defect was found in. Run it after any change to `AuthTabs.tsx`.

### I-5 — The theme containment

1. Set `prefers-color-scheme: light` in DevTools → Rendering.
2. View `/login` — the form panel is cream, the artwork panel stays dark.
3. Sign in and view the chat — the chat is **still dark**.

- **Expected**: exactly that. The light override is scoped to `.auth-form-panel`; the 20 global `:root` tokens are unchanged.
- **Why it matters**: this is the single highest-risk boundary in the unit. A `:root`-scoped light block would restyle the **whole application**, and no screen-by-screen check would reveal it until someone used the app in light mode.

### I-6 — The two routes

1. Open `/login` — the "Sign in" tab is selected.
2. Click the "Create account" tab.
3. Open `/register` directly — the "Create account" tab is selected.

- **Expected**: the tab set is the shared shell, the route determines the active tab, and selecting a tab navigates between `/login` and `/register`.
- **Why it matters**: D2 keeps **both** routes alive. The artifact had one page with two tabs; the app has two routes. Collapsing the app's routing to satisfy the artifact would have broken the existing contract.

---

## Part D — The geometry sweep

Part 8 sweeps **14 viewport widths**: 320, 360, 390, 414, 480, 600, 768, 900, **901**, 1024, 1280, 1440, 1920, 2560.

At each width the harness asserts:

- no horizontal overflow,
- the three annotation cards never escape the artwork panel,
- the form panel's content fits its box.

> **901 px is the important one.** The breakpoint is `max-width: 900px`, so 901 px is the narrowest *split* layout — a 100 px band that is easy to miss. It is exactly where the **D9** defect lived: each card was anchored at a percentage of a panel only ~423 px wide but was given a fixed 228 px width, so the right edge was clipped and fragments bled into the form panel.

The fix was to cap the width against the space that actually remains:

```css
width: min(228px, calc(100% - var(--card-left, 54%) - 12px));
```

with each card declaring its own `--card-left`, so the anchor and the cap cannot drift. At 901 px the cards measure 183 / 166 / 179 px; at 1440 px they resolve to the full 228 px.

---

## Part E — The two-testid-family contract

An element can carry only **one** `data-testid`, but decision D6 requires **both** the app's existing family and the artifact's family to be emitted.

The first implementation emitted only the app's family on the elements that already existed, and only the artifact's family on the elements the artifact introduced (the tabs, the toggles, the Google buttons). That left **nine** artifact testids un-emitted, which the static verifier caught after the contract-preservation checklist was audited.

**The rule:**

> Where the app's family already owns an element, the artifact's testid rides on a **wrapper** that encloses it.

```tsx
<div data-testid="auth-signin-form">
  <form data-testid="login-form"> … </form>
</div>
```

For the password fields, `PasswordField` gained an optional `wrapperTestId` prop that is applied to the `.auth-input-wrap` element, so the component itself carries the artifact family rather than the caller reaching into it.

**The invariant is asserted in both verifiers:**

- the static verifier checks that all **31** testids appear in the sources;
- the CDP harness checks that all **31** appear in the **rendered DOM**, and that the artifact's form testid **encloses** the app's form testid on **both** routes.

### The `auth-card` testid moved to the shell

`auth-card` was the old centred-card shell's testid. The port replaces that shell with the two-panel screen, so the testid was initially dropped. The contract-preservation checklist names it explicitly, so it was restored on the new shell — the `.auth-page` root element:

```tsx
<div className="auth-page" data-testid="auth-card">
```

The testid names the *screen*, which is what it always identified: the thing a test navigates to in order to interact with the auth form. Its DOM position moved, but its meaning did not.

---

## Part F — Security probes

| Probe | Where | Expected |
|---|---|---|
| No forbidden API in the auth feature | Static verifier | No `dangerouslySetInnerHTML`, `eval(`, `new Function(`, `.innerHTML =`, `document.write(` |
| The password is never persisted | CDP Part 11 | After a failed submit, the password is in neither `localStorage`, `sessionStorage`, nor `document.cookie`, and is not logged |
| SRI on the CDN stylesheet | Static verifier | `integrity="sha256-…"` and `crossorigin="anonymous"` on the Google Fonts stylesheet |
| Validation before the request | CDP Part 5 | An invalid form is blocked **before** any network call |
| No default credentials | Static verifier | No hardcoded keys, tokens or real endpoint URLs introduced by this unit |

> **The `security-baseline` extension is enabled for this unit.** See the extension-compliance table in `build-and-test-summary.md` for the per-rule compliance record.

---

## Part G — Reviewing results

| Check | Command | Pass criteria |
|---|---|---|
| Static verifier | `python3 aidlc-docs/scripts/verify-auth-port.py` | `ALL CHECKS PASS`, 172 checks, exit 0 |
| CDP behaviour verifier | `NODE_PATH=/tmp/cdp-harness/node_modules node aidlc-docs/scripts/verify-auth-port.js` | 131/131 `PASS`, exit 0 |
| Determinism | the same command, run 3× consecutively | 131/131 every time — **no flakes** |
| Type-check + build | `npm --prefix frontend run build` | `✓ 377 modules transformed.`, exit 0 |
| Lint | `npm --prefix frontend run lint` | 0 errors, 5 pre-existing warnings, exit 0 |

> **Determinism is itself a check.** The harness was flaky before it was switched to the production build. If a run fails and a re-run passes, that is a **flaky check**, not a passing check — investigate it rather than re-running until green.

---

## Part H — Adding a check

When adding a CDP check:

1. Put it in the part that matches its requirement.
2. Give it a name that names the **requirement**, not the mechanism — e.g. `the card width is capped with min()`, not `cardCssRules.length > 0`.
3. **Remember the two traps** that have already bitten this harness:
   - **React 19's value tracker.** `el.value = v` is swallowed — the tracker sees the DOM value already equal to `v`, concludes `onChange` did not fire, and React snaps the input back to its state (the empty string). Assign through the **native prototype setter** and dispatch a bubbling `input` event:
     ```js
     const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
     desc.set.call(el, value);
     el.dispatchEvent(new Event('input', { bubbles: true }));
     ```
   - **The CSSOM walker.** A plain `CSSStyleRule` also exposes a `cssRules` property (nested CSS), so a walker that handles the container case *before* the style case treats every style rule as a group and skips it — finding nothing at all. Handle the style case **first**.
4. Add the check to the inventory table in `unit-test-instructions.md` Part B, and add a **mutation test** for it — inject the violation it is supposed to catch and confirm it fails. A verifier that cannot fail is not a verifier.
