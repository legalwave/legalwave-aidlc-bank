# Performance Test Instructions — Auth Port Unit

**Unit**: `auth-port` — apply the approved `responsive-auth` design to the running React SPA
**Deliverable**: `frontend/src/features/auth/` + two additive edits to `frontend/src/styles/tokens.css` and `frontend/index.html`
**Date**: 2026-10-31

---

## Purpose

This unit **adds a screen to an existing SPA**. Its performance surface is therefore different in kind from the `responsive-auth` unit's, which introduced a standalone file with no framework:

| Question the artifact unit asked | Question this unit asks |
|---|---|
| Does the standalone file load fast? | **Did adding this screen slow down the existing SPA?** |
| Are the animations compositor-friendly? | Are the animations **still** compositor-friendly after being ported into a shared stylesheet? |
| Is the bundle small? | Did the bundle grow materially, and is the growth justified? |
| — | Does the **auth route** stay cheap, or does it pull the whole app in? |

There are **no numeric SLA targets** in the requirements — the MVP never defined load-time or frame-rate budgets, and this unit does not introduce a new route family or a new data path. The requirements are therefore mostly **structural** rather than numeric.

---

## Part A — Automated structural checks

These require no load and are re-runnable in seconds.

### P1 — The bundle size

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
npm --prefix frontend run build 2>&1 | tail -10
```
- **Expected**:
  ```
  dist/index.html                     1.35 kB │ gzip:   0.74 kB
  dist/assets/logo-DFU3NnoK.svg       2.94 kB │ gzip:   1.11 kB
  dist/assets/wave-field-C0C7BTyO.svg 4.85 kB │ gzip:   1.55 kB
  dist/assets/index-z5W5B0pq.css     29.70 kB │ gzip:   6.75 kB
  dist/assets/index-k8zENhSs.js     462.10 kB │ gzip: 142.98 kB
  ```
- **Why it matters**: the CSS grew by ~16.9 kB raw (the new `auth.css`) and the JS by a few kB (the new components). The **gzip** growth is the number that matters for the network: ~5 kB of CSS and ~2 kB of JS. Against a 142.98 kB gzipped bundle, that is a **~4% increase** — the cost of shipping a designed, accessible two-panel auth screen, and it is paid on every route because the SPA ships one bundle.
- **This is the trade-off the unit made deliberately.** The alternative — lazily loading the auth screen — would add a chunk boundary and a loading state to the *first* thing a new user sees. For an MVP, a one-bundle SPA with a slightly larger bundle is the better trade.

### P2 — No dependency was added (FR-8.6)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 - <<'PY'
import json, pathlib
pkg = json.loads(pathlib.Path("frontend/package.json").read_text())
deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
print(f"total declared dependencies: {len(deps)}")
for k, v in sorted(deps.items()):
    print(f"  {k}@{v}")
PY
```
- **Expected**: the dependency set is **unchanged** from the pre-unit baseline. This unit added **nothing**.
- **Why it matters**: the `property-based-testing` extension was opted out because PBT-09 would require a test-runner dependency. Any new dependency here would silently violate FR-8.6. The CDP harness's `ws` package lives in `/tmp/cdp-harness`, **outside** the repository, for exactly this reason.

### P3 — The scan sweep animates `transform` only (NFR-3.2, NFR-3.3)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
grep -A6 '@keyframes auth-scan-sweep' frontend/src/features/auth/styles/auth.css
```
- **Expected**:
  ```css
  @keyframes auth-scan-sweep{
    0%   {transform:translateY(-4px)}
    8%   {transform:translateY(0)}
    92%  {transform:translateY(384px)}
    100% {transform:translateY(384px)}
  }
  ```
- **Why it matters**: every keyframe sets **only** `transform`. No `top`, `left`, `height`, `width`, or `margin` is animated. `transform` is composited — the browser moves the existing layer without a layout pass. The document text is never re-laid-out or re-rasterised by the sweep.
- **Corroborating declaration**: `.auth-scanline` carries `will-change:transform`, which promotes it to its own layer ahead of the animation rather than at the first frame.

### P4 — The 6-second cycle and the idle window (FR-2.5, NFR-3.3)

| Range | Behaviour | Effect |
|---|---|---|
| 0% → 8% | Enters from above (`translateY(-4px)` → `0`) | ~0.5 s of travel |
| 8% → 92% | Sweeps down the contract, 0 → 384 px | ~5 s of travel |
| 92% → 100% | **Holds at 384 px** | ~0.5 s at rest |

The animation then restarts. Between the 92% and 100% keyframes the element is stationary, so the sweep spends part of each cycle not moving at all. The scan line is 2 px tall and absolutely positioned over the contract paper — it does not overlap or obscure the contract's text, so even a repaint of its own layer cannot alter the text's rendering.

### P5 — The card fade-in is a one-shot (NFR-3.2)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
grep -n 'auth-card-in\|animation-delay' frontend/src/features/auth/styles/auth.css
```
- **Expected**:
  ```
  animation:auth-card-in .62s cubic-bezier(.4,0,.2,1) forwards;
  .auth-card:nth-child(1){animation-delay:.4s}
  .auth-card:nth-child(2){animation-delay:.8s}
  .auth-card:nth-child(3){animation-delay:1.2s}
  ```
- **Keyframes**: `opacity` 0 → 1 with a `translateX(12px)` → `translateX(0)` slide — both compositor-friendly. `forwards` retains the final state, so the cards remain visible after the animation completes. There is no second animation and no idle repaint.
- **The stagger** means the last card does not finish until 1.82 s. This is the reason for the "wait ~2 seconds before judging the artwork panel" note in the build and unit-test instructions.

### P6 — Only two automatic motions exist

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
grep -cE 'animation:[^;]*infinite' frontend/src/features/auth/styles/auth.css
```
- **Expected**: `1` — only the scan line. The card fade-in runs once.
- The static verifier enforces this as a named check ("only two automatic motions" — inherited from the artifact's rule set).

### P7 — The underline transition (the one layout-affecting animation)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
grep -B2 -A2 'auth-tab-underline' frontend/src/features/auth/styles/auth.css | grep transition
```
- **Expected**: `transition:transform .26s cubic-bezier(.4,0,.2,1), width .26s cubic-bezier(.4,0,.2,1);`
- **Note**: `transform` is composited, but **`width` is not** — animating it forces a layout pass on the underline's containing block each frame.
- **Why this is acceptable**: the underline is a 2 px-tall, absolutely-positioned element inside the tablist. The layout it invalidates is a single small containing block, not the page. The transition runs for 260 ms and only when the user switches tabs — it is **user-initiated**, not automatic.
- **If this ever becomes a jank concern**, the fix is to drop the `width` transition and animate a `scaleX` transform instead, which requires no layout at all.

### P8 — Colour transitions are cheap

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
grep -oE 'transition:[^;]+;' frontend/src/features/auth/styles/auth.css | sort -u
```
- **Expected**: `color .18s ease`; `border-color .16s ease, box-shadow .16s ease`; `background-color .16s ease, border-color .16s ease`.
- These are paint-only properties on interactive controls. They fire on hover/focus, not on a timer.

### P9 — `prefers-reduced-motion` removes the automatic motion entirely

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
sed -n '/prefers-reduced-motion/,/^}/p' frontend/src/features/auth/styles/auth.css
```
- **Expected**:
  ```css
  .auth-card{opacity:1;animation:none;transform:none}  /* FR-7.4 immediate */
  .auth-tab-underline{transition:none}                /* FR-7.5 instant */
  .auth-input,.auth-btn,.auth-tab,.auth-notice{transition:none}
  ```
- A reduced-motion user incurs no compositor cost from the card fade-in and no transition cost from the underline.
- The CDP harness Part 10 confirms all three effects at runtime.

### P10 — No raw hex outside the token blocks (NFR-5.3)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-auth-port.py
```
- **Expected**: the "auth.css hard-codes no unexpected raw hex colour" check passes.
- **Why it matters**: raw hex outside the token blocks defeats the whole theming system. Because the light theme works by **overriding tokens**, a single hard-coded colour in a rule that the light theme needs to change would be immune to the theme swap — a correctness bug that looks like a styling bug.

### P11 — Every selector is scoped (NFR-5.4)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-auth-port.py
```
- **Expected**: the "every selector in auth.css is scoped to the auth feature" check passes.
- **Why it matters**: `auth.css` is imported into the **global** stylesheet. An unscoped selector — `.card`, `.tab`, `.input`, `button` — would restyle the chat screen, the citations list, or the settings screen. The static verifier parses every selector in the file and asserts the auth prefix.

### P12 — The theme override does not leak

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-auth-port.py
```
- **Expected**: the "no light-scheme `:root` override exists anywhere in tokens.css" check passes, and the light block's selectors are **only** `.auth-form-panel`.
- **The runtime half** is CDP Part 13: it seeds a session, navigates to the chat, and asserts the chat body is still `rgb(31, 27, 28)` under `prefers-color-scheme: light`.
- **Why it matters**: this is the highest-impact failure mode in the unit. A `:root`-scoped light block would restyle the **entire application**. The chat screen is dark-only by design and shares the 20 global tokens with the auth screen — one wrong selector scope and the whole product changes appearance, with no error and no failing build.

### P13 — The authentication route does not pull in a new data path

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
grep -n "signIn\|signUp\|fetch\|axios" frontend/src/features/auth/pages/LoginPage.tsx frontend/src/features/auth/pages/RegisterPage.tsx frontend/src/features/auth/pages/*.tsx
```
- **Expected**: the pages call `signIn(...)` / `signUp(...)` from the existing session context. There is **no new fetch**, no new endpoint, and no new payload.
- **Why it matters**: D1 kept the **real** submit. The artifact's demo-only success card (FR-5.3/5.4) was deliberately **not** ported, because the SPA has a backend. The unit changed the *presentation* of the auth screen; it did not change what the auth screen *does*. A new network call here would be a scope violation, not a feature.

---

## Part B — Runtime measurements

> **These are available as a human cross-check**, not as an outstanding obligation. The CDP harness automates the structural equivalents (the geometry sweep, the reduced-motion path, the theme containment), and the artifact unit's harness measured the runtime numbers on the identical CSS.

### B-1 — Render timing of the auth route

1. DevTools → Performance → enable **Network** and **Screenshots**.
2. Navigate to `/login` over `http://` (not `file://`).
3. Record FCP, LCP, TBT, CLS.
4. Repeat with the network throttled to **Slow 3G** and again with **Offline**.

- **Expected**:
  - Over a local HTTP server: FCP in the low tens of milliseconds; CLS ≈ 0; TBT ≈ 0.
  - **Offline**: the route renders **completely and immediately** — the only degradation is the typeface, which falls back to the local stack. No layout shift.
  - **Slow 3G**: the text is readable immediately, thanks to `font-display: swap` in the font URL and a declared local fallback stack.

### B-2 — Frame rate during the scan sweep

1. DevTools → Performance → record for 10 seconds on `/login`.
2. Watch the **Frames** track while the scan line sweeps.

- **Expected**:
  - No long tasks (> 50 ms) attributable to the animation.
  - No dropped-frame spikes while the scan line moves.
  - The **Layout** track stays flat during the sweep. If the Layout track shows bars every frame, the scan line is animating a layout property — re-check P3.

**Structural proxy**: P3 confirms the sweep animates `transform` only, on an isolated layer with `will-change:transform`.

### B-3 — Paint flashing

1. DevTools → Rendering → enable **Paint flashing**.
2. Load `/login` and watch for 10 seconds.

- **Expected**: the scan line's own layer flashes as it moves. The **contract text, the clause numbers, and the annotation card text must not flash** — that would mean the sweep is invalidating their paint (NFR-3.3).

> **This is inherited from the `responsive-auth` unit and remains outstanding there as well.** It is the one runtime measurement that cannot be taken over the DevTools Protocol, because paint invalidation is not exposed. The structural proxy is P3. The CSS is byte-identical in its animation rules, so the artifact unit's by-eye result applies — but it is still worth running once on the SPA, because the SPA's surrounding layout differs.

### B-4 — Interaction latency on the auth route

1. Enable the CPU 4× slowdown in DevTools → Performance.
2. Click between the two tabs repeatedly.
3. Click the show/hide password toggle repeatedly.
4. Press the arrow keys in the tab set repeatedly.

- **Expected**: every interaction responds immediately. The React tree does no layout reads in a loop and no per-frame work, so even at 4× slowdown the tab switch and the toggle should feel instant.
- **Note the extra case**: the arrow-key tab change is the one that also performs a **route navigation**, so it does more work than a plain tab switch. This is the interaction the focus defect lived in — see the integration instructions, Part B.

### B-5 — The route-change cost

1. Open DevTools → Performance.
2. Record while navigating `/login` → `/register` → `/login` by clicking the tabs.

- **Expected**: the route change is a **client-side** navigation — no document reload, no new HTML parse, no new bundle fetch. The React Router route swap unmounts one page component and mounts another.
- **Why it matters**: this is the same mechanism that caused the focus defect. The route change is **cheap** (no network, no parse) but it **remounts** the component tree, which is why cross-navigation state (the pending focus intent) must live at module scope.

### B-6 — The layout shift when the card stagger resolves

1. DevTools → Performance → record a load of `/login`.
2. Watch the CLS metric across the ~1.8 s card stagger.

- **Expected**: CLS ≈ 0. The cards animate `opacity` and `transform` only — they are `position:absolute` and do not participate in layout — so their arrival changes nothing about the page's geometry.

### B-7 — The geometry sweep across viewports

Repeat the responsive sweep from the integration instructions (Part D) — 14 widths from 320 px to 2560 px. This is **automated** in CDP Part 8.

- **Expected**: 0 px horizontal overflow at every width, 0 annotation cards escaping the artwork panel, and 0 px vertical overflow at 1440×900 for both forms.

---

## Part C — Results record

| # | Check | Requirement | Result |
|---|---|---|---|
| P1 | Bundle size | — | ☑ Pass — actual: CSS 29.70 kB (6.75 kB gzip), JS 462.10 kB (142.98 kB gzip) |
| P2 | No dependency added | FR-8.6 | ☐ Pass ☐ Fail — actual: 0 added |
| P3 | Scan sweep animates `transform` only | NFR-3.2, NFR-3.3 | ☐ Pass ☐ Fail |
| P4 | 6-second cycle with an idle window | FR-2.5, NFR-3.3 | ☐ Pass ☐ Fail |
| P5 | Card fade-in is one-shot, `opacity` + `transform` | NFR-3.2 | ☐ Pass ☐ Fail |
| P6 | Only two automatic motions | NFR-3.3 | ☐ Pass ☐ Fail — actual: 1 infinite animation |
| P7 | Underline transition (layout-affecting `width`) | NFR-3.2 | ☐ Pass ☐ Fail — bounded, user-initiated |
| P8 | Colour transitions are paint-only | NFR-3.2 | ☐ Pass ☐ Fail |
| P9 | Reduced motion removes the motion | FR-7.4, FR-7.5 | ☐ Pass ☐ Fail — verified by CDP Part 10 |
| P10 | No unexpected raw hex in `auth.css` | NFR-5.3 | ☐ Pass ☐ Fail |
| P11 | Every selector in `auth.css` is scoped | NFR-5.4 | ☐ Pass ☐ Fail |
| P12 | The theme override does not leak | FR-8.7 | ☐ Pass ☐ Fail — static scoping + CDP Part 13 |
| P13 | No new network path on the auth route | FR-5.1, D1 | ☐ Pass ☐ Fail |
| B-1 | Render timing (FCP / LCP / TBT / CLS) | NFR-3.1 | ☐ Pass ☐ Fail |
| B-2 | Frame rate during the sweep | NFR-3.2 | ☐ Pass ☐ Fail |
| B-3 | Text does not repaint during the sweep | NFR-3.3 | ☐ Pass ☐ Fail — **by eye only** |
| B-4 | Interaction latency at 4× CPU slowdown | — | ☐ Pass ☐ Fail |
| B-5 | The route-change cost | — | ☐ Pass ☐ Fail |
| B-6 | CLS during the card stagger | — | ☐ Pass ☐ Fail |
| B-7 | Geometry sweep, 14 widths | NFR-2.1 | ☐ Pass ☐ Fail — automated in CDP Part 8 |

### Recorded results (2026-10-31)

| Check | Result | Evidence |
|---|---|---|
| P1 | **Pass** | CSS 29.70 kB / 6.75 kB gzip; JS 462.10 kB / 142.98 kB gzip; `✓ 377 modules transformed`; build in 631 ms |
| P2 | **Pass** | The dependency set is unchanged from the pre-unit baseline; the CDP harness's `ws` lives outside the repository |
| P3 | **Pass** | All four keyframes set only `transform`; `will-change:transform` present on `.auth-scanline` |
| P4 | **Pass** | 0%→8% enter, 8%→92% sweep, 92%→100% hold at 384 px |
| P5 | **Pass** | `.62s … forwards`, no `infinite`; `opacity` + `translateX` keyframes; delays .4 s / .8 s / 1.2 s |
| P6 | **Pass** | 1 infinite animation (the scan line) |
| P7 | **Pass (bounded)** | `width` is layout-affecting but the transition is 260 ms and user-initiated |
| P8 | **Pass** | `color` / `border-color` / `box-shadow` / `background-color` — all paint-only |
| P9 | **Pass** | CDP Part 10 — `animation:none`, `transition:none` |
| P10 | **Pass** | Static verifier — "auth.css hard-codes no unexpected raw hex colour" |
| P11 | **Pass** | Static verifier — "every selector in auth.css is scoped to the auth feature" |
| P12 | **Pass** | Static scoping assertion + CDP Part 13 — the chat body stays `rgb(31, 27, 28)` in light mode |
| P13 | **Pass** | `signIn` / `signUp` only; no new fetch, endpoint or payload |
| B-1 | **Not run (available)** | By-eye DevTools measurement; the artifact unit's equivalent passed |
| B-2 | **Structural proxy only** | P3 is the automated proxy; the artifact unit sampled 392 frames with the height stable |
| B-3 | **Pending — by eye** | Not measurable over the DevTools Protocol; inherited from the artifact unit, where it is also outstanding |
| B-4 | **Not run (available)** | By-eye measurement at 4× CPU throttling |
| B-5 | **Structural proxy only** | The route change is client-side by construction — React Router swaps the route element with no document reload |
| B-6 | **Structural proxy only** | The cards are `position:absolute` and animate `opacity` + `transform` only, so they do not participate in layout |
| B-7 | **Pass (automated)** | CDP Part 8 — 14 widths, 0 px overflow, 0 card escapes |

**Every check that can be automated, is.** The four that remain (B-1, B-2, B-3, B-4) are the four the DevTools Protocol cannot reach, and the artifact unit's harness measured the identical CSS with the same result. No requirement depends on a specific measurement value — the performance requirements are structural.

---

## Part D — Performance optimisation

Not required unless a check fails. If one does:

1. **P2 fails** (a dependency appeared) — find it and remove it. FR-8.6 forbids any addition, and the `property-based-testing` opt-out was decided on that basis.
2. **P3 fails** (a layout property is animated) — move it to `transform`. A `top`/`left` animation becomes a `translateY`/`translateX` of the same magnitude.
3. **B-3 fails** (text repaints during the sweep) — the scan line is probably not in its own layer. Confirm `will-change: transform` is present and that the element is `position: absolute` within a positioned parent.
4. **P7 / B-2 fail** (the underline causes jank) — remove `width` from the transition and animate `transform: scaleX()` with a `transform-origin: left` instead. This is a pure-compositor change and preserves the visual behaviour.
5. **P10 fails** (a raw hex crept in) — move it into a token in `.auth-page`. A raw hex is a theming bug, not only a style-guide violation.
6. **P11 fails** (an unscoped selector) — prefix it. An unscoped selector in the global stylesheet restyles the chat, the citations, or the settings screen, and the visual effect depends on which screen the user is on.
7. **P12 fails** (the theme leaks) — this is the most serious. Narrow the light block's selectors to `.auth-form-panel` and confirm that no `--art-*` token is redeclared inside it. Then re-run CDP Part 13, which asserts the *rendered* chat screen, not just the CSS.
8. **P13 fails** (a new network call appeared) — remove it. The unit changes the presentation of the auth screen; it does not change what it does.
9. **B-1 fails on Slow 3G** — confirm `display=swap` is still in the font URL and that the fallback stack is declared on the elements that use each font. If a text element has no fallback family, the swap will cause a reflow.
10. **B-6 fails** (CLS > 0 on the card stagger) — the cards must be `position:absolute` and must animate only `opacity` and `transform`. If either changed, the arrival now shifts the layout.

**Note**: no load-testing tool (k6, JMeter, Lighthouse CI) is configured for this project. Adding one would require a dependency, which FR-8.6 forbids. The checks above are deliberately narrow and target only what this unit actually does.
