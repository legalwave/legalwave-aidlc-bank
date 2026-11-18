# Performance Test Instructions — LegalWave Frontend

> **This document covers the `frontend/` unit only.** For the standalone `responsive-auth` design unit (a single self-contained HTML file), see the sibling `responsive-auth-*.md` files in this directory.


**Last updated**: 2026-10-30 — extended with sidebar collapse checks (P9–P12) for unit 2.

## Purpose

Validate that the frontend changes did not regress runtime performance. Across the two units, the changes that could plausibly affect performance are:

1. The **new background artwork** — a 4.85 KB SVG rendered as a full-viewport layer, twice (auth screens and workspace).
2. The **route split** — `/login` and `/register` are now two separate bundles-worth of route elements rather than one component with a boolean.
3. The **module restructuring** — a deeper import graph, which can affect cold-start parse time.
4. The **sidebar collapse animation** — a `grid-template-columns` transition on the shell, plus a fade-and-slide on the sidebar text layer, plus a `transform`-based mobile drawer. This is the **highest jank risk** in the codebase: animating a grid track forces layout on every frame (risk R1).

Everything else (streaming, chat state, API layer) was moved without behavioural change, and the NDJSON buffering logic was preserved byte-identically (NFR-3.3).

## Performance requirements

There are **no numeric performance targets** in the requirements — the MVP never defined SLA thresholds. NFR-3 constrains the artwork and the background layer structurally rather than numerically:

| Requirement | Target | How it is measured |
|---|---|---|
| NFR-3.1 | Background artwork < 30 KB uncompressed, vector-based | File size on disk |
| NFR-3.2 | Workspace background must not cause scroll jank — fixed-position, `pointer-events: none`, **not** a repeating tiled background on a scrolling element | Computed CSS inspection |
| NFR-3.3 | Streaming responsiveness must not regress | Visual/functional streaming check; buffering logic diff-verified byte-identical |
| NFR-1.1 | The collapse animation must be CSS-only — no JavaScript animation loop, no `requestAnimationFrame` | Source inspection + performance-profile check |
| NFR-1.2 | The transition duration is 200ms with `cubic-bezier(0.4, 0, 0.2, 1)` | Computed CSS inspection |
| NFR-1.3 | Toggling the sidebar must not refetch chat data or re-run the chat list's effects | Network-panel check (no new request) + scroll-position check |
| NFR-1.4 | The mobile drawer must animate on `transform` (composited), not on `left`/`width` | Computed CSS inspection |

NFR-3.1 and NFR-3.2 are **objective and already verified** — see "Automated structural checks" below. NFR-3.3 is verified by the streaming scenario plus the byte-identity diff. NFR-1.1–NFR-1.4 are verified by the structural checks and the manual checks P9–P12.

---

## Automated structural checks (already executed)

These require no load and were run during verification step 12.

### P1 — Artwork size (NFR-3.1)
```bash
ls -l frontend/src/assets/wave-field.svg frontend/src/assets/logo.svg
```
- **Expected**: `wave-field.svg` = 4,856 bytes (well under the 30 KB budget); `logo.svg` = 2,942 bytes.
- Both are vector SVG with no raster fallback and no embedded font.

### P2 — Background layer is fixed and non-interactive (NFR-3.2, NFR-4.1, FR-5.6)
```bash
grep -A6 '^\.shell-bg' frontend/src/features/chat/styles/chat.css
grep -A8 '^\.auth-bg'  frontend/src/features/auth/styles/auth.css
```
- **Expected**:
  - `.shell-bg` → `position:fixed; inset:0; z-index:0; pointer-events:none;` with `opacity:.05`.
  - `.auth-bg` → `position:fixed` with `pointer-events:none` and `opacity:.55`.
- The background must **not** be declared as a `background-image` on a scrolling element (`.thread`, `.groups`, `.content`). If it were, the artwork would repaint on every scroll frame. The grep above confirms it lives on a separate fixed layer instead.

### P3 — Bundle size
```bash
cd frontend && npm run build
```
- **Expected**: `dist/assets/index-<hash>.js` ≈ 448 kB (139 kB gzip), `dist/assets/index-<hash>.css` ≈ 21 kB (4.5 kB gzip).
- The previous unit measured 445 kB JS / 17 kB CSS. The sidebar collapse feature adds ~2.5 kB raw / ~0.7 kB gzip of JS (the hook) and ~4 kB raw / ~0.6 kB gzip of CSS (the collapse, rail, drawer, and reduced-motion rules). Both are small and well within the no-new-dependency constraint.

### P4 — Cold-start module graph
```bash
cd frontend && npx tsc -b --force && npm run build
```
- **Expected**: `✓ 372 modules transformed.` — 371 from the previous unit, plus 1 for the new `features/chat/hooks/useSidebarCollapse.ts`. The module count reflects the file layout, not new work.

### P9 — The collapse animation is CSS-only (NFR-1.1)

```bash
grep -rn "requestAnimationFrame\|setInterval\|setTimeout" frontend/src/features/chat/
```
- **Expected**: **no output**. The collapse must be a plain CSS transition. A JavaScript animation loop would violate NFR-1.1 and the "CSS-only animation" global constraint.

```bash
grep -n "transition:grid-template-columns" frontend/src/features/chat/styles/chat.css
```
- **Expected**: one hit — `transition:grid-template-columns 200ms cubic-bezier(.4,0,.2,1)` on `.shell`.

### P10 — The drawer animates on `transform` (NFR-1.4)

```bash
grep -n "transform:translateX" frontend/src/features/chat/styles/chat.css
```
- **Expected**: the mobile drawer rule uses `transform:translateX(-100%)` → `translateX(0)`. Animating `left` or `width` would force layout on every frame and is the thing NFR-1.4 forbids. The scrim animates `opacity` only.

### P11 — No JavaScript state churn on toggle (NFR-1.3)

```bash
grep -n "refreshChats\|fetchChats" frontend/src/features/chat/hooks/useSidebarCollapse.ts frontend/src/features/chat/components/ChatSidebar.tsx
```
- **Expected**: **no output**. Neither the hook nor the sidebar may trigger a chat refetch. The collapsed state is presentation-only.

---

## Manual performance checks

These are subjective by nature and require a human at the browser.

### P5 — Scroll smoothness in the workspace (NFR-3.2)

- **Steps**:
  1. Sign in, open a chat with a long conversation, and scroll the thread continuously.
  2. Scroll the sidebar chat list.
  3. Open `/settings/api-key` and scroll the settings pane.
- **Expected**: no visible stutter, no flickering background, no scroll-bar jitter in any of the three scroll containers.
- **Why**: a background attached to a scrolling element repaints on every frame; a fixed layer does not. This check confirms the layer is genuinely separate.

### P6 — Background cost on the auth screens

- **Steps**:
  1. Open `/login` and `/register` and observe CPU usage in DevTools → Performance while interacting with the form.
  2. Compare against the same page with the artwork blocked (DevTools → Network → block the SVG).
- **Expected**: no measurable difference in interaction responsiveness. A 4.85 KB vector with `pointer-events: none` and no animation costs effectively nothing per frame.

### P7 — Streaming responsiveness (NFR-3.3)

- **Steps**:
  1. Send a message that produces a long verdict report.
  2. Observe the time from the first `stage` event to the first visible text, and the smoothness of the progressive markdown rendering.
- **Expected**: the stage list advances promptly, text renders progressively, and auto-scroll keeps up without fighting the user when you scroll up.
- **Note**: the NDJSON buffering loop in `shared/api/client.ts` was diff-verified **byte-identical** to the original implementation, so streaming behaviour cannot have changed at the parsing layer.

### P8 — Route-split navigation latency

- **Steps**:
  1. Navigate between `/login` and `/register` repeatedly using the cross-links.
  2. Navigate from `/login` to the workspace after signing in.
- **Expected**: each transition is a client-side transition with no full-page reload and no perceptible delay.
- **Note**: both auth pages import the same `AuthCard` and `Brand` components, so the second route does not re-download shared chunks.

### P12 — Collapse animation smoothness (NFR-1.2, risk R1)

- **Steps**:
  1. Sign in and open a chat with a **long thread** (at least 20 messages) so the thread has real text to reflow.
  2. Open DevTools → Performance, record, then click the sidebar toggle to collapse and again to expand.
  3. Repeat with the chat list scrolled far down.
- **Expected**:
  - The transition lasts ~200ms with no visible stutter or dropped frames on the thread text.
  - **No network request** is issued by the toggle (NFR-1.3) — check the Network panel is idle during the animation.
  - The chat list keeps its **scroll position** across a toggle (proof the list was not unmounted and remounted).
- **Note**: `grid-template-columns` transitions force layout on every frame — this is the known R1 risk. The animated column is a single fixed-size track, so only the thread's text layout reflows as the track width changes. If jank is visible on a long thread, the documented fallback is to animate a CSS custom property consumed by `grid-template-columns` instead.

### P13 — Drawer animation smoothness on mobile

- **Steps**:
  1. Resize the browser to below 768px (or use device emulation at 390×844).
  2. Open and close the drawer repeatedly.
- **Expected**: the drawer slides in and out smoothly, the scrim fades, and neither stutters. The animation is composited (`transform` + `opacity`), so it should stay smooth even on a long thread underneath.

---

## Setup performance test environment

```bash
cd frontend
npm run build && npm run preview      # production build — representative timings
```

Use the production preview rather than the dev server: dev-mode React and unminified chunks distort timings.

---

## Analyze performance results

| # | Check | Target | Result |
|---|---|---|---|
| P1 | Artwork size | < 30 KB | ☐ Pass ☐ Fail — actual: ____ |
| P2 | Fixed, non-interactive background layer | Fixed + `pointer-events:none` | ☐ Pass ☐ Fail |
| P3 | Bundle size | ~448 kB JS / ~21 kB CSS | ☐ Pass ☐ Fail |
| P4 | Module transform count | 372 | ☐ Pass ☐ Fail |
| P5 | Scroll smoothness | No stutter in 3 containers | ☐ Pass ☐ Fail |
| P6 | Background interaction cost | No measurable difference | ☐ Pass ☐ Fail |
| P7 | Streaming responsiveness | No regression | ☐ Pass ☐ Fail |
| P8 | Route-split navigation | No reload, no perceptible delay | ☐ Pass ☐ Fail |
| P9 | Collapse animation is CSS-only (NFR-1.1) | No `requestAnimationFrame` / JS loop | ☐ Pass ☐ Fail |
| P10 | Drawer animates on `transform` (NFR-1.4) | `translateX`, not `left`/`width` | ☐ Pass ☐ Fail |
| P11 | No refetch on toggle (NFR-1.3) | No `refreshChats` / `fetchChats` in the feature | ☐ Pass ☐ Fail |
| P12 | Collapse smoothness on a long thread (NFR-1.2) | ~200ms, no stutter, no request, scroll preserved | ☐ Pass ☐ Fail |
| P13 | Drawer smoothness on mobile | Smooth slide + scrim fade | ☐ Pass ☐ Fail |

### Bottleneck analysis

Two bounded-by-construction costs exist:

1. **The background layer** — 4.85 KB of vector, one fixed positioned element, `pointer-events: none`, `opacity` compositing, and **no animation**. It is not repainted during scroll because it is not in the scrolling layer's paint region.
2. **The collapse transition** — a `grid-template-columns` transition forces layout on every frame. This is the known R1 risk and the reason P12 exists. It is bounded because the animated column is a single fixed-size track: only the thread's text layout reflows as the track width changes, and the chat list's DOM is untouched. The fade-and-slide on the text layer is `opacity` + `transform`, both composited.

If P5 or P6 fails, the cause is almost certainly the background being attached to a scrolling element rather than a fixed layer. Re-check P2.

If P12 fails (visible jank on a long thread), the documented fallback from the risk register is to animate a CSS custom property consumed by `grid-template-columns` rather than the track property directly, or to animate `width` on the sidebar with `contain: layout`.

### Performance optimisation

Not required unless a check fails. If it does:
1. Confirm P2 first — 90% of background-performance problems are a positioning mistake, not a size problem.
2. Lower `.shell-bg` opacity (it is already at 0.05) or reduce the artwork's path count.
3. For collapse jank specifically, prefer the custom-property fallback described above over removing the animation — the 200ms transition is a stated requirement (FR-3.1).
4. Re-run P3, P5, and P12.

**Note**: no automated load-testing tool (k6, JMeter, etc.) is configured for this project, and adding one would violate NFR-2.1 (no new dependencies). These checks are therefore manual and the scope is deliberately narrow to the changes this unit actually introduced.
