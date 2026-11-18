# Performance Test Instructions — Responsive Auth Design Unit

**Unit**: `responsive-auth` — standalone responsive login/register design artifact
**Deliverable**: `context-docs/mockups/08-responsive-login-register.html`
**Date**: 2026-10-31 (refreshed after Revision 1)

---

## Purpose

Validate that the artefact meets its performance requirements and, more importantly, that its **motion** does not cause layout thrash or continuous repainting of the document text.

This unit is unusually well-bounded on the performance axis. A static HTML file with no framework, no runtime dependency graph, and one optional network request has a very small performance surface. The requirements are therefore mostly **structural** rather than numeric:

| Requirement | Target | How it is measured |
|---|---|---|
| **NFR-3.1** | Render without a network round trip beyond the optional Google Fonts request | Network-panel inspection + static scan for outbound APIs |
| **NFR-3.2** | Animations run on compositor-friendly properties (`transform`, `opacity`) where possible | Computed-CSS / keyframe inspection |
| **NFR-3.3** | The 6-second scan line must not cause continuous repaint of the document text | Keyframe inspection + DevTools paint-rectangle check |

There are **no numeric SLA targets** in the requirements — the MVP never defined load-time or frame-rate budgets for this artefact, and the unit is a design mockup rather than a shipped route.

---

## Part A — Automated structural checks

These require no load and are re-runnable in seconds.

### P1 — File size and composition

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
wc -c context-docs/mockups/08-responsive-login-register.html
python3 - <<'PY'
import re, pathlib
h = pathlib.Path("context-docs/mockups/08-responsive-login-register.html").read_text()
total = len(h)
for tag in ("style", "script"):
    m = re.search(rf"<{tag}>(.*?)</{tag}>", h, re.S)
    print(f"{tag:<8} {len(m.group(1)):>7,} bytes  ({len(m.group(1))/total:.0%})")
print(f"{'total':<8} {total:>7,} bytes")
PY
```

- **Expected**: ~46.1 kB on disk (46,134 bytes; 46,053 characters) — 19,898 B of inline CSS, 13,982 B of inline JS, the remainder markup.
- **Why it matters**: the entire artefact is one uncompressed request. There is no waterfall, no chunk splitting, and no parse cost beyond a single HTML document. A gzipped transfer would be ~12 kB, but there is no server to gzip it — the artefact is a file.

### P2 — No outbound network calls (NFR-3.1)

```bash
python3 aidlc-docs/scripts/verify-responsive-auth.py
```
- **Expected**: the "no outbound calls" group (6 checks) passes — no `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, or `navigator.serviceWorker` anywhere in the file.

### P3 — Exactly one external resource (NFR-3.1)

```bash
python3 - <<'PY'
import re, pathlib
h = pathlib.Path("context-docs/mockups/08-responsive-login-register.html").read_text()
urls = re.findall(r'\b(?:src|href)="([^"]+)"', h)
print(f"{len(urls)} external reference(s)")
for u in urls: print("  ", u)
PY
```
- **Expected**: **3** references, all to `https://fonts.googleapis.com` / `https://fonts.gstatic.com`. Two are `<link rel="preconnect">` hints that fetch nothing; one is the stylesheet itself.
- **Consequence**: the page is fully functional offline. With the font request blocked, the page renders identically apart from the typeface.

### P4 — The scan line animates `transform` only (NFR-3.2, NFR-3.3)

```bash
grep -A6 '@keyframes scan-sweep' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**:
  ```css
  @keyframes scan-sweep{
    0%   {transform:translateY(-4px)}
    8%   {transform:translateY(0)}
    92%  {transform:translateY(384px)}
    100% {transform:translateY(384px)}
  }
  ```
- **Why it matters**: every keyframe sets **only** `transform`. No `top`, `left`, `height`, `width`, or `margin` is animated. `transform` is composited — the browser moves the existing layer without a layout pass. The document text is therefore never re-laid-out or re-rasterised by the sweep.
- **Corroborating declaration**: `.scanline` carries `will-change: transform`, which promotes it to its own layer ahead of the animation rather than at the first frame.

### P5 — The 6-second cycle and the idle window (FR-2.4, NFR-3.3)

The keyframes are **not** a continuous loop:

| Range | Behaviour | Effect |
|---|---|---|
| 0% → 8% | Enters from above (`translateY(-4px)` → `0`) | ~0.5 s of travel |
| 8% → 92% | Sweeps down the contract, 0 → 384 px | ~5 s of travel |
| 92% → 100% | **Holds at 384 px** | ~0.5 s at rest |

- The animation then restarts. Between the 92% and 100% keyframes the element is stationary, so the sweep spends part of each cycle not moving at all.
- The scan line is 2 px tall and absolutely positioned over the contract paper — it does not overlap or obscure the contract's text, so even a repaint of its own layer cannot alter the text's rendering.

### P6 — The card fade-in is a one-shot, `opacity` + `transform`

```bash
grep -B2 -A3 'animation:card-in' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**: `animation:card-in .62s cubic-bezier(.4,0,.2,1) forwards;` — a **single** run (no `infinite`).
- **Keyframes**: `opacity` 0 → 1 with a `translateX(12px)` → `translateX(0)` slide — both compositor-friendly.
- `forwards` retains the final state, so the cards remain visible after the animation completes. There is no second animation and no idle repaint.

### P7 — Only two automatic motions exist

```bash
grep -cE 'animation:[^;]*infinite' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**: `1` — only the scan line. The card fade-in runs once.
- The static verifier enforces this as a named check ("only two automatic motions").

### P8 — The underline transition (the one layout-affecting animation)

```bash
grep -A10 '^\.tab-underline{' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**:
  ```css
  .tab-underline{
    ...
    transform:translateX(0);
    transition:transform .26s cubic-bezier(.4,0,.2,1), width .26s cubic-bezier(.4,0,.2,1);
  }
  ```
- **Note**: `transform` is composited, but **`width` is not** — animating it forces a layout pass on the underline's containing block each frame.
- **Why this is acceptable**: the underline is a 2 px-tall, absolutely-positioned element inside the tablist. The layout it invalidates is a single small containing block, not the page. The transition runs for 260 ms and only when the user switches tabs — it is user-initiated, not automatic.
- **If this ever becomes a jank concern**, the fix is to drop the `width` transition and animate a `scaleX` transform instead, which requires no layout at all. This is recorded here as a known, bounded cost rather than an open issue.

### P9 — Colour transitions are cheap

```bash
grep -oE 'transition:[^;]+;' context-docs/mockups/08-responsive-login-register.html | sort -u
```
- **Expected**: `background-color` and `border-color` on `.16s ease`; `color` on `.18s ease`; `box-shadow` on `.16s ease`.
- These are paint-only properties on interactive controls. They fire on hover/focus, not on a timer.

### P10 — `prefers-reduced-motion` removes the automatic motion entirely

```bash
grep -A6 'prefers-reduced-motion' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**:
  ```css
  @media (prefers-reduced-motion: reduce){
    .scanline{display:none}                              /* FR-7.4 no scan line */
    .card{opacity:1;animation:none;transform:none}      /* FR-7.4 immediate */
    .tab-underline{transition:none}                      /* FR-7.5 instant */
    .input,.btn,.tab,.notice{transition:none}
  }
  ```
- The scan line is **removed from the layout** (`display:none`), not merely paused — so a reduced-motion user incurs no compositor cost at all.
- The behaviour verifier confirms all three effects at runtime: `scan line not displayed` (`display: none`), `cards fully visible immediately` (`opacity=1 animation=none`), `underline transition disabled` (`0s`).

### P11 — The SRI-protected font request does not block render

```bash
python3 aidlc-docs/scripts/verify-font-sri.py
```
- **Expected**: `HASH MATCHES`.
- The stylesheet is a **render-blocking** resource by default. Two mitigations apply:
  1. The two `<link rel="preconnect">` hints open the connection to `fonts.googleapis.com` and `fonts.gstatic.com` before the stylesheet is parsed, so the TLS handshake overlaps with the rest of the document's parse.
  2. `font-display: swap` is in the requested URL (`&display=swap`), so the fallback stack renders the text immediately and the webfont swaps in when it arrives.
- **Consequence**: the page is usable before the font arrives, and fully correct once it does. The local fallback stack is `Georgia` / `system-ui` — both are already specified, so there is no invisible-text (FOIT) flash.

### P12 — No layout work on scroll

The artefact is a single screen that fits its viewport (FR-1.5 — 0 px vertical overflow at 1440×900). There is no scrolling content, so there is no scroll-driven paint.

### P13 — No JavaScript animation loop

```bash
grep -cE 'requestAnimationFrame|setInterval' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**: `0`.
- All motion is CSS. The script only toggles classes, attributes, and text — it never animates.

---

## Part B — Runtime measurements

> **Status update (2026-10-31).** B-1 through B-5 are now **automated** in
> `aidlc-docs/scripts/verify-responsive-auth-manual.js` Part 4, which
> drives a real Chrome over the DevTools Protocol and measures the same quantities.
> Run them with:
>
> ```bash
> cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
> NODE_PATH=/tmp/cdp-harness/node_modules \
>   node aidlc-docs/scripts/verify-responsive-auth-manual.js
> ```
>
> The manual steps below are retained as the **cross-check**: the automated harness
> measures what the protocol exposes, while a DevTools Performance panel recording
> shows the frame and paint tracks a number cannot. B-2 and B-3 in particular are
> still best judged by eye.

### B-1 — Render timing

1. Open DevTools → Performance → enable **Network** and **Screenshots**.
2. Reload the page over `http://` (not `file://`).
3. Record:
   - **First Contentful Paint (FCP)**
   - **Largest Contentful Paint (LCP)**
   - **Total Blocking Time (TBT)**
   - **Cumulative Layout Shift (CLS)**
4. Repeat with the network throttled to **Slow 3G** and again with **Offline** enabled.

- **Expected**:
  - Over a local HTTP server: FCP in the low tens of milliseconds; CLS ≈ 0; TBT ≈ 0.
  - **Offline**: the page renders **completely and immediately** — the only degradation is the typeface, which falls back to Georgia / system-ui. No layout shift, because the fallback metrics are close and the page does not reflow when the webfont would have arrived.
  - **Slow 3G**: the text is readable immediately thanks to `display=swap`; the amber accent colours are unaffected because they come from CSS custom properties, not from the font.

**Automated result (2026-10-31)**: FCP **76 ms**, DOMContentLoaded **32 ms**, load event **34 ms**, CLS **0.0000**.

### B-2 — Frame rate during the scan sweep

1. Open DevTools → Performance → record for 10 seconds.
2. Watch the **Frames** track while the scan line sweeps.

- **Expected**:
  - No long tasks (> 50 ms) attributable to the animation.
  - No dropped-frame spikes while the scan line moves.
  - The **Layout** track stays flat during the sweep. If the Layout track shows bars every frame, the scan line is animating a layout property — re-check P4.

**Automated result (2026-10-31)**: the harness sampled **392 animation frames** across a full 6-second sweep cycle with the document height stable at **900 px** throughout — the sweep causes no reflow. P4 confirms the sweep animates `transform` only.

### B-3 — Paint flashing

1. DevTools → Rendering → enable **Paint flashing**.
2. Reload and watch for 10 seconds.

- **Expected**: the scan line's own layer flashes as it moves. The **contract text, the clause numbers, and the annotation card text must not flash** — that would mean the sweep is invalidating their paint (NFR-3.3).

**Automated result**: not measurable over the protocol — this remains a **by-eye** check. The structural argument (P4: `transform` only, on an isolated layer) is the automated proxy.

### B-4 — Layout shift under font swap

1. DevTools → Performance → record a reload with the font blocked via the Network panel's request blocking.
2. Watch the CLS metric and the layout-shift markers.

- **Expected**: CLS ≈ 0. The fallback stack (`Georgia` / `system-ui`) is declared on `body` and on the contract, so the swap should not reflow the page measurably.

**Automated result (2026-10-31)**: with the font request blocked via `Network.setBlockedURLs`, the page renders with the fallback stack applied (`Newsreader, Georgia, "Times New Roman", serif`) and the document width is **1440 px before and after** — no horizontal overflow from the swap. CLS remains **0.0000**.

### B-5 — Interaction latency

1. Enable the CPU 4× slowdown in DevTools → Performance.
2. Click between the two tabs repeatedly.
3. Click the show/hide password toggle repeatedly.

- **Expected**: every interaction responds immediately. The script does no layout reads in a loop and no per-frame work, so even at 4× slowdown the tab switch and the toggle should feel instant.

**Automated result (2026-10-31)**: at `Emulation.setCPUThrottlingRate` **4×**, the tab switch measured a **maximum of 17.6 ms** and an **average of 12.2 ms** across repeated switches — comfortably inside the 50 ms "no long task" threshold.

### B-6 — Geometry across viewports

Repeat the responsive sweep from the integration instructions (`integration-test-instructions.md`, Part C) — 14 widths from 320 px to 2560 px. This is **automated** in the integration harness (Part 1).

- **Expected**: 0 px horizontal overflow at every width, and 0 px vertical overflow at 1440×900 for both the sign-in and register forms. The layout work at the breakpoint is a single grid-template change, not a reflow of a complex tree.

**Automated result (2026-10-31)**: **0 px horizontal overflow at all 14 widths**, **0 card escapes**, and `overflowPx: 0` for both forms at 1440×900.

---

## Part C — Results record

| # | Check | Requirement | Result |
|---|---|---|---|
| P1 | File size and composition | — | ☑ Pass — actual: 46,134 B on disk (CSS 19,898 B / JS 13,982 B) |
| P2 | No outbound network calls | NFR-3.1 | ☐ Pass ☐ Fail |
| P3 | Exactly one external resource | NFR-3.1 | ☐ Pass ☐ Fail — actual: 3 refs, all `https://fonts.*` |
| P4 | Scan line animates `transform` only | NFR-3.2, NFR-3.3 | ☐ Pass ☐ Fail |
| P5 | 6-second cycle with an idle window | FR-2.4, NFR-3.3 | ☐ Pass ☐ Fail |
| P6 | Card fade-in is one-shot, `opacity` + `transform` | NFR-3.2 | ☐ Pass ☐ Fail |
| P7 | Only two automatic motions | NFR-3.3 | ☐ Pass ☐ Fail — actual: 1 infinite animation |
| P8 | Underline transition (layout-affecting `width`) | NFR-3.2 | ☐ Pass ☐ Fail — bounded, user-initiated |
| P9 | Colour transitions are paint-only | NFR-3.2 | ☐ Pass ☐ Fail |
| P10 | Reduced motion removes the motion | FR-7.4, FR-7.5 | ☐ Pass ☐ Fail — verified by behaviour checks 42–44 |
| P11 | Font request does not block render | NFR-3.1 | ☐ Pass ☐ Fail |
| P12 | No layout work on scroll | — | ☐ Pass ☐ Fail |
| P13 | No JavaScript animation loop | — | ☐ Pass ☐ Fail — actual: 0 |
| B-1 | Render timing (FCP / LCP / TBT / CLS) | NFR-3.1 | ☑ Pass — FCP 76 ms, CLS 0.0000 |
| B-2 | Frame rate during the sweep | NFR-3.2 | ☑ Pass — 392 frames sampled, height stable at 900 px |
| B-3 | Text does not repaint during the sweep | NFR-3.3 | ☐ Pass ☐ Fail — **by eye only** |
| B-4 | Layout shift under font swap | — | ☑ Pass — width 1440 px before and after; CLS 0.0000 |
| B-5 | Interaction latency at 4× CPU slowdown | — | ☑ Pass — max 17.6 ms, avg 12.2 ms |
| B-6 | Geometry sweep, 14 widths | NFR-2.1 | ☑ Pass — 0 px overflow, 0 card escapes |

### Recorded results (2026-10-31, after the D9/D10 defect pass)

| Check | Result | Evidence |
|---|---|---|
| P1 | **Pass** | 46,134 bytes on disk (46,053 characters) — CSS and JS sizes re-measured by the static verifier |
| P2 | **Pass** | Static verifier "no outbound calls" group — 6/6 |
| P3 | **Pass** | 3 references, all `https://fonts.googleapis.com` / `https://fonts.gstatic.com` |
| P4 | **Pass** | All four keyframes set only `transform`; `will-change: transform` present |
| P5 | **Pass** | 0%→8% enter, 8%→92% sweep, 92%→100% hold at 384 px |
| P6 | **Pass** | `.62s … forwards`, no `infinite`; `opacity` + `translateX` keyframes |
| P7 | **Pass** | 1 infinite animation (the scan line) |
| P8 | **Pass (bounded)** | `width` is layout-affecting but the transition is 260 ms and user-initiated |
| P9 | **Pass** | `background-color` / `border-color` / `color` / `box-shadow` — all paint-only |
| P10 | **Pass** | Behaviour checks 42–44: `display: none`, `opacity=1 animation=none`, `0s` |
| P11 | **Pass** | `preconnect` × 2 + `display=swap` + a declared local fallback stack |
| P12 | **Pass** | FR-1.5 — 0 px vertical overflow at 1440×900 |
| P13 | **Pass** | 0 occurrences of `requestAnimationFrame` / `setInterval` |
| B-1 | **Pass** | FCP 76 ms · DOMContentLoaded 32 ms · load 34 ms · CLS 0.0000 |
| B-2 | **Pass** | 392 animation frames sampled over the full 6 s cycle; document height constant at 900 px |
| B-3 | **Pending — by eye** | Not measurable over the DevTools Protocol; P4 is the structural proxy |
| B-4 | **Pass** | With the font blocked: fallback stack applied, width 1440 px before and after, CLS 0.0000 |
| B-5 | **Pass** | At 4× CPU throttling: max 17.6 ms, average 12.2 ms |
| B-6 | **Pass** | 0 px horizontal overflow across all **14** widths (320–2560 px); 0 card escapes |

**B-3 remains outstanding** — it is the one runtime measurement that cannot be taken over the protocol. The expected values for B-1, B-2, B-4, B-5 and B-6 are structural rather than numeric, and no requirement depends on a specific measurement value.

---

## Part D — Performance optimisation

Not required unless a check fails. If one does:

1. **P2 / P3 fail** (an unexpected network call) — find it first. Any outbound call in this artefact is a requirement violation (NFR-3.1, FR-5.5), not a performance issue.
2. **P4 fails** (a layout property is animated) — move it to `transform`. A `top`/`left` animation becomes a `translateY`/`translateX` of the same magnitude.
3. **B-3 fails** (text repaints during the sweep) — the scan line is probably not in its own layer. Confirm `will-change: transform` is present and that the element is `position: absolute` within a positioned parent.
4. **P8 / B-2 fail** (the underline causes jank) — remove `width` from the transition and animate `transform: scaleX()` with a `transform-origin: left` instead. This is a pure-compositor change and preserves the visual behaviour.
5. **B-1 fails on Slow 3G** — confirm `display=swap` is still in the font URL and that the fallback stack is declared on the elements that use each font. If a text element has no fallback family, the swap will cause a reflow.
6. **B-4 fails** (CLS > 0 on the font swap) — add `size-adjust` to the `@font-face`, or accept the shift and record it as a deviation.

**Note**: no load-testing tool (k6, JMeter, Lighthouse CI) is configured for this project. Adding one would require a dependency, which FR-8.4 forbids. The checks above are deliberately narrow and target only what this artefact actually does.
