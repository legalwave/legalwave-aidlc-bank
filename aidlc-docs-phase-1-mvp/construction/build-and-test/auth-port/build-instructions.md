# Build Instructions — Auth Port Unit

**Unit**: `auth-port` — apply the approved `responsive-auth` design to the running React SPA
**Deliverable**: `frontend/src/features/auth/` (the two-panel auth screen) + two additive edits to `frontend/src/styles/tokens.css` and `frontend/index.html`
**Date**: 2026-10-31
**Scope**: this unit only. `backend/` was **not** built, modified, or tested.

---

## Prerequisites

| Item | Value |
|---|---|
| **Build tool** | **Vite 8.3.5** via `npm --prefix frontend run build` (`tsc -b && vite build`) |
| **Language / runtime** | TypeScript 7.0.2 · React 19.3.1 · react-router 8.5.1 |
| **Dependencies** | **0 added** (FR-8.6) — `frontend/package.json` is byte-identical to its pre-unit state |
| **Environment variables** | **None** (FR-8.5) — the unit changes no request the SPA already made |
| **Verification tooling** | Python 3.8+ (static verifier), Node.js 18+ (CDP behaviour verifier), Chrome/Chromium 90+ with `--remote-debugging-port` |
| **System requirements** | Any OS; ~500 MB disk (Chrome + `node_modules`); a `node_modules/` already installed under `frontend/` |
| **Network** | Only for `npm install` (one-time) and the optional Google Fonts request at runtime |

**No dependency may be added.** FR-8.6 forbids it, and the `property-based-testing` extension was opted out at Requirements Analysis precisely because PBT-09 would require a test-runner dependency.

---

## Build steps

### 1. Install the frontend dependencies (one-time)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend install
```

### 2. Confirm no dependency was added by this unit

```bash
python3 - <<'PY'
import json, pathlib
pkg = json.loads(pathlib.Path("frontend/package.json").read_text())
for section in ("dependencies", "devDependencies"):
    for name, ver in sorted(pkg.get(section, {}).items()):
        print(f"{section:>15}  {name}@{ver}")
PY
```
- **Expected**: the dependency set is unchanged from the pre-unit baseline. This unit added **nothing**.

### 3. Type-check and build

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run build
```
- **Expected output**:
  ```
  ✓ 377 modules transformed.
  dist/assets/index-<hash>.js    462.10 kB │ gzip: 142.98 kB
  dist/assets/index-<hash>.css    29.70 kB │ gzip:   6.75 kB
  ✓ built in <n>s
  ```
- **Exit code**: `0`.
- **Why `tsc -b` matters here**: the build runs the TypeScript project build first. `tsc -b` type-checks the *whole* project, not just the changed files, so a type error introduced in `features/auth/` fails the build before Vite ever bundles. The unit's new `PasswordField` prop (`wrapperTestId`) and the `AuthMode` type import are both covered by this.

> **The CSS hash changes on every build.** The hash in `dist/assets/index-<hash>.css` is content-derived. The `auth.css` and `tokens.css` edits in this unit changed it. Do not treat a changed hash as a defect.

### 4. Lint

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run lint
```
- **Expected**: **0 errors**, **5 warnings**.
- **All 5 warnings are pre-existing** and live in files this unit did not touch:
  - `app/providers.tsx`
  - `features/chat/components/ChatThread.tsx` (×2)
  - `features/chat/hooks/useChatStream.ts`
  - `shared/components/Markdown.tsx`
- **Exit code**: `0` (oxlint exits non-zero only on errors).

> A new warning appearing in `features/auth/**` is a regression from this unit and must be fixed. A pre-existing warning count of 5 is the baseline.

### 5. Run the static verifier

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
- **Exit code**: `0` when all 172 checks pass, `1` otherwise.

### 6. Run the CDP behaviour verifier

The verifier speaks the DevTools Protocol over a WebSocket and therefore needs the `ws` package. It is installed **outside** the repository, in `/tmp/cdp-harness`, so the SPA's dependency set is never polluted by test-harness dependencies.

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

# One-time setup
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1 && npm install ws >/dev/null 2>&1
cd - >/dev/null

# Run
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-auth-port.js
```
- **Expected output**: 131 lines prefixed `PASS`, ending with:
  ```
  131/131 checks passed
  ALL CHECKS PASS
  ```
- **Exit code**: `0` when every check passes.

**The harness tests the production build, not the dev server.** This is deliberate and load-bearing — see §"Why the harness serves the production build" below.

### 7. Confirm the backend was not touched

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
find backend -newermt "2026-10-31 05:55" -type f \
  -not -path "*/node_modules/*" -not -path "*/__pycache__/*" 2>/dev/null
```
- **Expected**: **empty** — this unit changed nothing under `backend/` (FR-8.8).

### 8. Open the app for visual review

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run dev
```
Then open the printed URL (default `http://localhost:5173`) and navigate to `/login` and `/register`.

> **The auth screen requires an unauthenticated session.** If a `jlca_token` is present in `localStorage`, `RedirectIfAuthenticated` sends you to the chat screen instead. Clear it in DevTools → Application → Local Storage, or use a private window.

Review in both themes:
- **Dark** — the browser default when `prefers-color-scheme: dark`.
- **Light** — DevTools → Rendering → Emulate CSS `prefers-color-scheme: light`.

> **Wait ~2 seconds after load before judging the artwork panel.** The three annotation cards fade in on a stagger — the last has a 1.2 s animation delay plus a 0.62 s duration. A screenshot taken earlier shows one card, or one and a half, and can be mistaken for a rendering bug.

> **The light theme is scoped to the form panel only.** The left artwork panel stays dark in both themes (FR-6.4 / FR-8.7). That is the intended behaviour, not a bug — see `generation-notes.md` §6.

---

## Why the harness serves the production build

The harness originally ran against the Vite **dev server**. That produced persistent flakiness in the chat-screen checks: the dev server holds an HMR websocket open, and under CDP the page entered an endless reload loop in which React never mounted (the `#root` element stayed empty, `bodyLen` 103).

The fix was to serve the **production build** from a small static server built into the harness. Three consequences:

1. The harness tests the artefact that is actually shipped.
2. The reload loop disappears — there is no HMR client in a production bundle.
3. `document.readyState` is no longer pinned at `interactive` by the open websocket, so the wait-for-load logic is straightforward.

Two further adjustments followed:

- The production CSS **minifies hex colours to lower case**, so the token comparisons are case-insensitive (`hexEq`).
- `textContent` is used instead of `innerText` for the chat content check, because `innerText` is layout-dependent and returns `''` for rendered-but-not-laid-out content.

**Consequence for the operator**: the CDP harness **requires** step 3 to have run. It exits with code `2` and the message `FATAL: no production build found at …/frontend/dist` if `frontend/dist/index.html` is missing.

---

## Build artifacts

| Artifact | Size | Notes |
|---|---|---|
| `frontend/dist/assets/index-<hash>.js` | 462.10 kB (gzip 142.98 kB) | The whole SPA bundle |
| `frontend/dist/assets/index-<hash>.css` | 29.70 kB (gzip 6.75 kB) | Includes the new `auth.css` and the extended `tokens.css` |
| `frontend/dist/index.html` | — | Now also carries the SRI-pinned Google Fonts stylesheet |

The unit's own source changes are:

| File | Change |
|---|---|
| `frontend/src/features/auth/components/AuthScreen.tsx` | The two-panel shell; both `data-testid` families; `auth-card` moved to the shell |
| `frontend/src/features/auth/components/AuthTabs.tsx` | The APG tablist; the module-scoped `pendingFocusMode` focus fix |
| `frontend/src/features/auth/components/AuthArtwork.tsx` | The always-dark artwork panel |
| `frontend/src/features/auth/components/PasswordField.tsx` | The `wrapperTestId` prop for the second testid family |
| `frontend/src/features/auth/components/GoogleButton.tsx` | **New** — the Google button with the brand mark |
| `frontend/src/features/auth/components/AuthNotice.tsx` | **New** — the `role="status"` notice region |
| `frontend/src/features/auth/styles/auth.css` | **New** — the ported design CSS, with D9 and D10 verbatim |
| `frontend/src/styles/tokens.css` | **Additive** — the `.auth-page` token scope and the scoped light block |
| `frontend/index.html` | **Additive** — the SRI-pinned Google Fonts stylesheet |

---

## Verification scripts

| Script | Purpose | Checks | Exit |
|---|---|---|---|
| `aidlc-docs/scripts/verify-auth-port.py` | Static analysis: the 20 original token values, the light-theme scoping, the `auth.css` invariants, the component contracts, the security scan, and the no-collateral-damage check | 172 | 0 / 1 |
| `aidlc-docs/scripts/verify-auth-port.js` | Headless Chrome over the DevTools Protocol against the **production build**: the DOM/testid contracts, the tab navigation and APG keyboard pattern, the password toggle, the validation lifecycle, the demo notices, the theme invariance, the geometry sweep, the breakpoint, reduced motion, the password-persistence probes, the source artifact's static invariants, and the theme containment. Requires `NODE_PATH=/tmp/cdp-harness/node_modules` | 131 | 0 / 1 |

Both live in `aidlc-docs/scripts/`.

---

## Common warnings

| Warning | Meaning | Action |
|---|---|---|
| `FATAL: no production build found` | The CDP harness was run before `npm --prefix frontend run build` | Run step 3, then re-run step 6 |
| `Cannot find module 'ws'` | `NODE_PATH` was not set for the harness | Re-export `NODE_PATH=/tmp/cdp-harness/node_modules`. **Do not** add `ws` to `frontend/package.json` — FR-8.6 forbids it |
| oxlint reports 5 warnings | All 5 are pre-existing and in files this unit did not touch | None. **Any warning in `features/auth/**` is a regression** and must be fixed |
| The light theme appears to change only the right-hand panel | Correct — the light override is scoped to `.auth-form-panel` | None. This is FR-8.7 |
| The three annotation cards are not all visible on load | The fade-in is staggered (up to 1.2 s delay) | Wait ~2 s before judging |

---

## Troubleshooting

### The static verifier reports failures

1. Read the failing lines — each carries the assertion message and names the requirement it protects.
2. Re-read the corresponding requirement in `aidlc-docs/inception/requirements/auth-port/requirements.md`.
3. **Fix the application, not the verifier.** The verifier encodes FR-1…FR-8 and NFR-1…NFR-6 directly; loosening an assertion to make a check pass invalidates the check.
4. Re-run the full sequence: static → build → CDP.

### The CDP harness is flaky or reports an empty `#root`

Check that you are running against the **production build**. A harness run against the Vite dev server reproduces the HMR reload loop described above. The harness serves `frontend/dist` itself — do not point it at a running dev server via `AUTH_PORT_URL` unless you are deliberately debugging the dev server.

### A testid check fails

The two `data-testid` families — the app's (`login-form`, …) and the artifact's (`auth-signin-form`, …) — are emitted on **nested** elements, because an element can carry only one `data-testid`. The rule is:

> Where the app's family already owns an element, the artifact's testid rides on a **wrapper** that encloses it.

The static verifier asserts all 31 testids appear in the sources; the CDP harness asserts all 31 appear in the **rendered DOM** and that the artifact's form testid **encloses** the app's form testid on both routes. If a testid is missing, check which family owns the element before adding a second attribute to it.

### The focus check fails after a tab change

This was a real defect (FR-3.3), fixed with the module-scoped `pendingFocusMode` variable in `AuthTabs.tsx`. **The fix must not be moved into a component ref.** React Router **remounts** the page component on a route change, so a ref is destroyed by the unmount and the focus intent is lost. Module scope is the only lifetime that survives the route swap.

### The build fails with a type error

`tsc -b` type-checks the whole project. The most likely cause is a prop mismatch in `AuthScreen.tsx` → `PasswordField.tsx` (the `wrapperTestId` prop) or an `AuthMode` import that was written as a value import instead of a type import.

---

## Rollback

This unit changed files **inside `frontend/` only**. Rollback is a restore of those files from the pre-unit state — there is no database migration, no backend change, and no persisted state to unwind.

> The project is **not** under version control, so rollback is by restoring the pre-unit copies of the nine files listed under "Build artifacts". If a backup was taken before the unit began, restoring those nine files restores the previous behaviour exactly.

The **storage keys are unchanged** — `jlca_token` and `jlca_user` (`frontend/src/shared/api/client.ts`) keep their names and their values, so a rollback does not invalidate a signed-in session.
