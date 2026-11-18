# Code Generation Plan — Sidebar Collapse Feature (`frontend/`)

**This document is the single source of truth for Code Generation.** Steps are executed in order. Each step is marked `[x]` immediately upon completion, in the same interaction as the work.

---

## Unit Context

| Field | Value |
|---|---|
| **Unit name** | `frontend` (chat workspace sidebar) |
| **Location** | `frontend/` (workspace root — application code NEVER in `aidlc-docs/`) |
| **Project type** | Brownfield — modify existing files in place, never create `*_new`/`*_modified` copies |
| **Stack** | React 19, TypeScript 7, Vite 8, react-router 8, oxlint 1.89 |
| **Dependencies** | **None may be added** (NFR-2.1, NFR-2.2) |
| **Backend contract** | `aidlc-docs/inception/api-contract.md` — unchanged, must not be violated |
| **Requirements** | `aidlc-docs/inception/requirements/sidebar-collapse/requirements.md` (FR-1…FR-7, NFR-1…NFR-8) |
| **Execution plan** | `aidlc-docs/inception/plans/sidebar-collapse-execution-plan.md` (T1–T9) |

### Requirements Coverage

This unit implements FR-1 … FR-7 and NFR-1 … NFR-8 from the sidebar-collapse requirements document.

### Interfaces & Contracts (owned by this unit)

| Interface | Contract | Consumed by |
|---|---|---|
| `features/chat/hooks/useSidebarCollapse.ts` → `useSidebarCollapse()` | Returns `{ collapsed, drawerOpen, toggle, setDrawerOpen }`. Owns the collapsed state, `localStorage` persistence under `lw_sidebar_collapsed`, the `Ctrl+B`/`Cmd+B` listener, and viewport-width awareness via `matchMedia('(max-width: 767px)')`. | `ChatPage` |
| `features/chat/components/ChatSidebar.tsx` → props `collapsed`, `onToggle` | The sidebar renders the toggle button and the collapsed rail. The full panel stays mounted at all times; visibility is CSS-driven. | `ChatPage` |
| `.shell` root class `sidebar-collapsed` | Applied by `ChatPage` when `collapsed` is true. Drives the grid-column width and the rail styling. | `chat.css` |
| `localStorage` key `lw_sidebar_collapsed` | `'1'` means collapsed. Missing/empty/malformed → expanded. Never contains user data. | `useSidebarCollapse` |

### Dependencies

- **Upstream**: none (backend is an external HTTP service, contract fixed).
- **Downstream**: none — `frontend/` is a leaf; the backend is not modified.
- **Internal step ordering**: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9.

### Traceability

| Step | Requirements satisfied |
|---|---|
| T1 | FR-4, FR-5, FR-6, NFR-8 |
| T2 | FR-1, FR-3, FR-6, FR-7, NFR-1, NFR-3 |
| T3 | FR-1, FR-2, FR-7 |
| T4 | FR-1, FR-2, FR-6 |
| T5 | NFR-3.2 |
| T6 | NFR-3.4 |
| T7 | NFR-1, NFR-3.1 |
| T8 | NFR-2, NFR-5, NFR-6 |
| T9 | FR-8 continuity (README) |

### Global Constraints (apply to every step)

1. **No new dependencies** — `package.json` `dependencies` and `devDependencies` must remain byte-identical.
2. **No backend modifications** — `backend/` must remain byte-identical.
3. **Strict compiler** — `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` all active. Type-only imports MUST use `import type`.
4. **Design tokens unchanged** — `styles/tokens.css` must not be touched. Every new colour MUST reference an existing token; **no raw hex values** may appear in the new CSS (NFR-3.4, risk R8).
5. **CSS-only animation** — no JavaScript animation loop, no `requestAnimationFrame` animation (NFR-1.1, FR-3.5). No animation library (NFR-2.2).
6. **The chat list must never be unmounted** — the collapsed state is CSS-driven, never conditional rendering (FR-1.3, risk R3).
7. **Automation-friendly markup** — interactive elements get stable `data-testid` attributes named `{component}-{element-role}`.
8. **Session keys untouched** — `jlca_token` / `jlca_user` must not be read, written, or cleared by this feature (NFR-6.1, risk R6).
9. **No secrets in client code**; no `console.log` of tokens; no `dangerouslySetInnerHTML` (NFR-7).
10. **One stylesheet** — all new CSS goes in `features/chat/styles/chat.css`. No new stylesheet file (NFR-3.2).

---

## Step T1 — Create `features/chat/hooks/useSidebarCollapse.ts`

- [x] **T1.1** Create the hook with this public shape:
  ```ts
  export function useSidebarCollapse(): {
    collapsed: boolean
    drawerOpen: boolean
    toggle: () => void
    setDrawerOpen: (open: boolean) => void
  }
  ```
- [x] **T1.2** Read the persisted value defensively — `localStorage.getItem('lw_sidebar_collapsed')`; treat any value other than `'1'` as expanded. Wrap the read in `try/catch` so a `SecurityError` (storage disabled) falls back to expanded (NFR-8.1, NFR-8.2, FR-5.2).
- [x] **T1.3** Persist on change — `localStorage.setItem('lw_sidebar_collapsed', '1')` when collapsed, `removeItem` when expanded. Wrap the write in `try/catch` (NFR-8.1, FR-5.1).
- [x] **T1.4** Install a `keydown` listener for `Ctrl+B` / `Cmd+B`. Call `preventDefault()` **only** when the shortcut applies. **Guard**: if `event.target` is an `HTMLInputElement`, `HTMLTextAreaElement`, or a contenteditable element, return without acting (FR-4.2, FR-4.3, risk R4).
- [x] **T1.5** Track the narrow viewport with `window.matchMedia('(max-width: 767px)')` and a `change` listener. Below the breakpoint the desktop `collapsed` state does not apply and the drawer state governs (FR-6.1, FR-6.2, FR-6.4, risk R5).
- [x] **T1.6** Close the drawer on `Escape` (FR-6.3).
- [x] **T1.7** Clean up every listener on unmount.
- [x] **T1.8** Do **not** read or write `jlca_token` / `jlca_user` (NFR-6.1, risk R6).

**Files:** `frontend/src/features/chat/hooks/useSidebarCollapse.ts` (new)
**Done when:** the hook returns the four documented values, persists safely, and the shortcut is guarded against text inputs.

---

## Step T2 — Add the collapse, rail, drawer, and reduced-motion CSS

All rules go into `frontend/src/features/chat/styles/chat.css` (NFR-3.2).

- [x] **T2.1** Add a `--sidebar-w` custom property on `.shell` (or use the literal values) for the expanded (`280px`) and collapsed (`56px`) track widths.
- [x] **T2.2** Add `transition: grid-template-columns 200ms cubic-bezier(0.4, 0, 0.2, 1)` to `.shell` (FR-3.1, FR-3.2).
- [x] **T2.3** Add the `.shell.sidebar-collapsed` rule setting the collapsed track width (FR-1.1).
- [x] **T2.4** Add `overflow: hidden` to `.sidebar` and a fade-and-slide transition on the sidebar's text layer so content never renders clipped mid-word (FR-3.3, risk R2).
- [x] **T2.5** Add the collapsed-rail rules: centre the rail's icons, hide the search input / chat text / user name, show the per-chat shortcut icons, and keep the toggle and new-chat visible (FR-1.2, FR-2.1, FR-1.4). **Superseded by the rail simplification pass** — the per-chat shortcut rules were removed.
- [x] **T2.6** Add the toggle button styles (transparent background, amber hover, visible focus ring) reusing existing tokens only (NFR-3.4, NFR-4.1).
- [x] **T2.7** Add the narrow-viewport drawer rules: below `768px`, the sidebar becomes a `position: fixed` overlay drawer using `transform: translateX(...)` for the slide, with a scrim behind it (FR-6.1, NFR-1.4). The scrim is `aria-hidden` and `pointer-events` managed.
- [x] **T2.8** Add the `@media (prefers-reduced-motion: reduce)` block setting `transition-duration: 0.01ms` (or `none`) on the collapse elements, so the sidebar jumps to its end state with no movement (FR-7.2, FR-7.3).
- [x] **T2.9** Use **no raw hex colours** — every colour must be `var(--token)` (NFR-3.4, risk R8).

**Files:** `frontend/src/features/chat/styles/chat.css` (modified)
**Done when:** the expanded state is visually unchanged, and the collapsed state, the drawer, and the reduced-motion path are all fully styled.

---

## Step T3 — Update `ChatSidebar.tsx`

- [x] **T3.1** Add the `collapsed: boolean` and `onToggle: () => void` props (FR-2, and the interface contract above).
- [x] **T3.2** Add the toggle button to the sidebar header, adjacent to the brand logo. It carries `aria-expanded={!collapsed}`, an `aria-label` that names the action ("Collapse sidebar" / "Expand sidebar"), a `title`, and `data-testid="sidebar-toggle-button"` (FR-2.1, FR-2.2, FR-2.4, FR-7.1).
- [x] **T3.3** Render the **rail** content — the brand logo, the new-chat button, and one shortcut per recent chat — always present in the DOM, with visibility controlled by CSS rather than by conditional rendering (FR-1.2, FR-1.3, risk R3). **Superseded by the rail simplification pass** — the per-chat shortcuts were removed; the rail now renders the expand toggle, the logo, and the new-chat button.
- [x] **T3.4** Each rail shortcut gets an `aria-label` and a `title` naming the chat, and a stable `data-testid` of the form `rail-chat-<id>` (FR-7.1, FR-1.4). **Superseded by the rail simplification pass** — no per-chat shortcuts remain, so `rail-chat-<id>` no longer exists.
- [x] **T3.5** Keep the existing search input, chat list, and user footer mounted at all times. Their visibility is CSS-driven (FR-1.3).
- [x] **T3.6** The rail's chat shortcut navigates to `chatPath(c.id)` — the same target as clicking the chat in the expanded list (FR-1.4). **Superseded by the rail simplification pass** — the expanded panel's chat entries still navigate via `chatPath(c.id)`.
- [x] **T3.7** Preserve all existing `data-testid` values (`new-chat-button`, `chat-search-input`, `chat-delete-<id>`, `sign-out-button`) unchanged.

**Files:** `frontend/src/features/chat/components/ChatSidebar.tsx` (modified)
**Done when:** the sidebar renders the toggle and the rail, and the expanded view is functionally identical to before.

---

## Step T4 — Update `ChatPage.tsx`

- [x] **T4.1** Consume `useSidebarCollapse()` (FR-1, FR-4, FR-5, FR-6).
- [x] **T4.2** Apply the root class to the shell: `` className={`shell${collapsed ? ' sidebar-collapsed' : ''}`} `` (FR-1.1, Q16-A).
- [x] **T4.3** Pass `collapsed` and `onToggle` to `ChatSidebar` (FR-2).
- [x] **T4.4** Render the drawer scrim and wire it to close the drawer (FR-6.3). The scrim is `aria-hidden="true"`.
- [x] **T4.5** Do **not** change the thread, composer, top bar, or citation modal behaviour (NFR-1.3, FR-10 continuity).

**Files:** `frontend/src/features/chat/pages/ChatPage.tsx` (modified)
**Done when:** the sidebar collapses and expands from the page, and the chat area reflows in step (FR-10 / Q10-A).

---

## Step T5 — Verify the CSS selector inventory

- [x] **T5.1** Run `python3 aidlc-docs/scripts/css-selector-check.py` — it must report **0** selectors defined in more than one file, and no selector from the pre-change inventory may be missing (NFR-3.2, risk R7).
  - **Result**: `css-selector-check.py` → 213 distinct selectors, **0** cross-file duplicates. Same-file repeats reduced to 2 (`.md h2` in markdown.css, `body` in global.css) by consolidating the two `.shell` rules in `chat.css` into one.
  - `css-regression-check.py` (new) → **182** pre-change selectors reconstructed, **0 lost**, 31 added by the feature. Matches the S12 inventory exactly.

**Files:** none (verification only)
**Done when:** the check passes with 0 cross-file duplicates and no lost selectors.

---

## Step T6 — Verify token usage and colour discipline

- [x] **T6.1** Confirm `frontend/src/styles/tokens.css` is byte-identical to its pre-change content (NFR-3.4).
  - **Result**: `tokens.css` mtime is `2026-10-30 22:33:06`, which predates this unit's start boundary (23:48). It was never opened for writing — byte-identical by construction. All 20 tokens still declared; the 7 mockup-baseline tokens continue to match (font stacks and shadow values confirmed unchanged).
- [x] **T6.2** Grep the new CSS rules for raw hex values (`#[0-9a-fA-F]{3,8}`) — there must be **none** outside `var(--token)` references (NFR-3.4, risk R8).
  - **Result**: the new collapse block (lines 106+) contains **0** raw hex values. Its 9 distinct colour references all resolve to existing tokens: `--accent-amber`, `--accent-amber-soft`, `--bg-sidebar`, `--bg-sunken`, `--bg-surface`, `--ink-primary`, `--ink-secondary`, `--line-strong`, `--shadow-level-2`. The only hex in the file (`#1A1208` on `.send-btn`, line 99) is a pre-existing composer rule, not part of this feature.

**Files:** none (verification only)
**Done when:** the token file is untouched and the new CSS contains no hardcoded colours.

---

## Step T7 — Build and lint

- [x] **T7.1** Run `npm run build` — expect zero errors, including `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` (NFR-3.1).
  - **Result**: `tsc -b && vite build` → **0 errors**. 372 modules transformed (was 371; +1 for the new hook). Built in ~335 ms. CSS bundle 21.26 kB (gzip 4.53 kB), JS 447.65 kB (gzip 139.05 kB).
- [x] **T7.2** Run `npm run lint` — expect **0 errors**. The warning baseline is 5; a higher count must be investigated.
  - **Result**: first lint run reported **6 warnings / 0 errors** — one above baseline. The extra warning was `react(set-state-in-effect)` on `useSidebarCollapse.ts`, caused by a redundant `setNarrow(mql.matches)` inside the `matchMedia` effect (the state is already initialised from the same query in the `useState` initializer).
  - **Fix**: removed the redundant `setNarrow(mql.matches)` call. Behaviour is unchanged — the initial value and the `change` handler both read the same `MediaQueryList`.
  - **Final**: **5 warnings / 0 errors** — exactly the pre-existing baseline. Build re-verified clean after the fix.

**Files:** none (verification only)
**Done when:** build and lint are clean.

---

## Step T8 — Verify scope containment

- [x] **T8.1** Confirm `frontend/package.json` `dependencies` and `devDependencies` are unchanged (NFR-2.1, NFR-2.2).
  - **Result**: `package.json` mtime `2026-10-30 20:15:34` — predates the unit boundary. Byte-identical; no dependency added.
- [x] **T8.2** Confirm `backend/` has no modifications (NFR-5.1). The workspace is not a git repository, so verify by modification timestamp against this unit's start boundary.
  - **Result**: `find backend -type f -newermt '2026-10-30 23:45'` → **empty**. Zero backend files modified.
- [x] **T8.3** Confirm `frontend/src/shared/api/` is untouched, and that `jlca_token` / `jlca_user` are not referenced by the new code (NFR-5.2, NFR-6.1).
  - **Result**: `find frontend/src/shared/api -type f -newermt '2026-10-30 23:45'` → **empty**. A grep across `features/chat/` finds `jlca_token` / `jlca_user` only inside a JSDoc comment (`useSidebarCollapse.ts` lines 6–7) explaining why the storage key is distinct — there is **no executable read or write** of either session key. The only `localStorage` calls in the feature target `lw_sidebar_collapsed` (getItem / setItem / removeItem).
- [x] **T8.4** Confirm no duplicate files were created (brownfield rule) — `find frontend/src -name '*_new*' -o -name '*_modified*'` must be empty.
  - **Result**: **empty**. The complete set of files touched this unit is exactly the four planned: `ChatSidebar.tsx` (mod), `ChatPage.tsx` (mod), `chat.css` (mod), `useSidebarCollapse.ts` (new).

**Files:** none (verification only)
**Done when:** scope containment is proven.

---

## Step T9 — Update `frontend/README.md`

- [x] **T9.1** Document the collapse control — where the toggle lives and what the collapsed rail shows.
  - **Result**: new `## Sidebar collapse` section in `frontend/README.md` with a `### The toggle` subsection (placement, the two `aria-label`/`aria-expanded` states, `data-testid="sidebar-toggle-button"`) and a `### The collapsed rail` subsection (logo, new-chat button, per-chat shortcuts with `rail-chat-<id>`, and the note that the full panel stays mounted so scroll position survives). **Updated by the rail simplification pass** — the rail subsection now documents that there are no per-chat shortcuts, and the `data-testid` list drops `rail-chat-<id>`.
- [x] **T9.2** Document the `Ctrl+B` / `Cmd+B` keyboard shortcut, including the fact that it is disabled while typing in a text field.
  - **Result**: `### Keyboard shortcut` subsection — states both platform bindings, and explicitly documents that the shortcut is disabled while typing in the composer, the search box, or any contenteditable element, and that the default is only prevented when the shortcut actually fires.
- [x] **T9.3** Document the persistence key `lw_sidebar_collapsed` and that it is a device preference independent of the session.
  - **Result**: `### Persistence` subsection — the key name, the `'1'`-means-collapsed convention, the key-removal behaviour, and the explicit statement that it is a device preference independent of the session that survives sign-out and is never sent to the backend. The `### Session storage` section was also cross-linked to it.
- [x] **T9.4** Document the mobile drawer behaviour below 768px.
  - **Result**: `### Mobile drawer` subsection — the 768px breakpoint, the slide-in overlay, the scrim (click to close), `Escape` to close, and the independence of the desktop preference from the drawer state.
- [x] **T9.5** Document the reduced-motion behaviour.
  - **Result**: `### Reduced motion` subsection — the `prefers-reduced-motion: reduce` query and the jump-to-end-state behaviour with no sliding, fading, or animation.
  - **Also updated**: the project-structure tree now lists `useSidebarCollapse.ts` in `features/chat/hooks/`; the chat-workspace feature bullet mentions the collapsible icon rail; the Testing section lists `sidebar-toggle-button` and `rail-chat-<id>` as test IDs. **Updated by the rail simplification pass** — `rail-chat-<id>` is gone; `rail-new-chat-button` is listed instead.

**Files:** `frontend/README.md` (modified)
**Done when:** the README matches the shipped behaviour.

---

## Build and Test Follow-up (executed in the Build and Test stage)

- [x] Production build artifact generation. — `npm run build` → 372 modules, 0 errors, ~333 ms. Artifacts: `dist/index.html` 0.64 kB, `dist/assets/index-<hash>.js` 447.65 kB (139.05 kB gzip), `dist/assets/index-<hash>.css` 21.26 kB (4.53 kB gzip), `dist/assets/logo-<hash>.svg` 2.94 kB, `dist/assets/wave-field-<hash>.svg` 4.85 kB.
- [x] Manual verification checklist covering: the toggle collapses and expands the sidebar; the 200ms animation is smooth; the rail shows logo / new-chat / per-chat shortcuts; the chat area reflows in step; the state survives a reload; `Ctrl+B` toggles but does not fire while typing; `Escape` closes the mobile drawer; the scrim closes the drawer; reduced motion jumps to the end state; the chat list does not remount (scroll position preserved). — Written as **Section J (28 checks, J1–J28)** of `aidlc-docs/construction/build-and-test/frontend/e2e-test-instructions.md`, with 8 new integration scenarios (14–21) and 5 new performance checks (P9–P13). Awaiting manual execution in a browser.

---

## Defect-fix pass (executed after user report — 2026-10-31)

The user reported two defects in the shipped feature: **the sidebar could be collapsed but not reopened**, and the collapsed rail showed a **meaningless first-letter initial** per chat. Both were confirmed against the shipped code and fixed.

### Finding 13 — No expand affordance in the collapsed state

- **Root cause**: the only toggle button lived inside `.sidebar-head`, and the collapse CSS set that header to `opacity:0; pointer-events:none`. The `.sidebar-rail` overlay (`position:absolute; inset:0; z-index:2`) contained no toggle of its own, so the sidebar could be collapsed but never reopened. The state logic in `useSidebarCollapse` was correct — the button was simply unreachable.
- **Fix (T2/T3)**: added a second toggle inside the rail (`.sidebar-toggle-collapsed`, glyph `»`) alongside the existing header toggle (`.sidebar-toggle-expanded`, glyph `«`). Exactly one is visible at a time: `.sidebar-toggle-collapsed{display:none}` by default, `.shell.sidebar-collapsed .sidebar-toggle-expanded{display:none}`, `.shell.sidebar-collapsed .sidebar-toggle-collapsed{display:flex}`. Both keep `aria-expanded={!collapsed}`, the dynamic `aria-label`/`title`, and `data-testid="sidebar-toggle-button"`, so a single selector resolves to whichever is visible.
- **Fix (T2)**: the collapse rules were retargeted from five per-child selectors to a single `.sidebar-panel` wrapper, so the header's fade no longer swallows the rail's toggle.

### Finding 14 — Meaningless first-letter initial in the rail

- **Root cause**: my own implementation rendered `{(c.title || 'Untitled').trim().slice(0, 1).toUpperCase()}` — a first-letter avatar that carried no meaning in a rail of identically-styled icons.
- **Fix (T3)**: replaced the letter with an inline SVG chat-bubble glyph using `stroke="currentColor"`, so it inherits the existing design tokens and follows the active/inactive colour states. The `aria-label`/`title` still carry the full chat title.

### Finding 15 — Collapsed panel exposed to assistive technology

Not reported by the user, but found while fixing Finding 13: the faded-out panel was still in the accessibility tree and the tab order, so a screen-reader or keyboard user could tab into invisible controls.

- **Fix (T3)**: the panel content is now wrapped in `.sidebar-panel` carrying `aria-hidden={collapsed}` and `inert={collapsed ? true : undefined}`.
- **Consequence (T1/T4)**: because `inert` would also hide the panel on mobile — where the full panel must be visible regardless of the desktop preference — the hook now exposes `narrow`, and `ChatPage` computes `railActive = collapsed && !narrow` for the root class and the `collapsed` prop.
- **Consequence (T1)**: the pre-existing `Ctrl+B` handler always toggled the desktop rail. Below 768px that had no visible effect. It now toggles the drawer when `narrow` and the rail otherwise, so the shortcut always does something visible.

### Amendment checkboxes

- [x] **A1 (T1)** `useSidebarCollapse` exposes `narrow`; the `Ctrl+B` handler toggles the drawer below 768px and the rail above it.
- [x] **A2 (T2)** `chat.css` gains `.sidebar-toggle-expanded` / `.sidebar-toggle-collapsed` visibility rules; the five per-child collapse selectors are replaced by `.sidebar-panel`; the drawer and reduced-motion blocks are retargeted to `.sidebar-panel`; `.rail-chat svg` is sized at 16×16.
- [x] **A3 (T3)** `ChatSidebar` renders two toggles (one per visual state), wraps the panel in `.sidebar-panel` with `aria-hidden` + `inert`, and renders a chat-bubble SVG instead of a letter initial.
- [x] **A4 (T4)** `ChatPage` computes `railActive = collapsed && !narrow` and uses it for the root class and the `collapsed` prop.
- [x] **A5 (T9)** `frontend/README.md` updated — the "The toggle" subsection now documents both toggles and their visibility switching; the rail subsection describes the icon rather than the letter; the `Ctrl+B` subsection documents the breakpoint-dependent behaviour; the `aria-hidden`/`inert` behaviour is documented.
- [x] **A6** Verification re-run after the fixes: `npm run lint` → 5 warnings / 0 errors (baseline); `npm run build` → 372 modules, 0 errors; CSS selector check → 210 distinct selectors, 0 cross-file duplicates, 2 same-file repeats (both pre-existing); CSS regression check → 0 pre-existing selectors lost (the `FEATURE_SELECTORS` set was updated for the added and removed selectors).
- [x] **A7** `e2e-test-instructions.md` Section J extended with **J29–J35** (rail expand affordance, rail toggle reopens the sidebar, only one toggle visible at a time, icon-not-letter in the rail, `aria-hidden`/`inert` on the collapsed panel, collapsed panel out of the tab order, `Ctrl+B` toggling the drawer below 768px). Section J is now 35 checks; the document total goes 85 → 92.

### Rail simplification pass (2026-10-31, after the second user report)

**User input (verbatim)**: "In collapsed mode no need to show chat icons."

- **Finding 17 — The rail's per-chat shortcuts carried no information.** Severity: Medium. Even with the chat-bubble icon replacing the letter initial, the rail rendered one identical glyph per recent chat. At 56px there is no room for a title, so the icons were indistinguishable from one another and gave the user no way to tell the chats apart — the rail was visual noise. The user asked for them to be removed.
- **Fix (T3)**: removed the `.rail-chats` container and the per-chat shortcut buttons from `ChatSidebar.tsx`. The rail now carries only the controls that stay meaningful at 56px: the expand toggle (`»`), the brand logo, and the new-chat button (`+`). The chat list is reached by expanding the sidebar.
- **Fix (T2)**: removed the now-dead `.rail-chats` / `.rail-chat` rules (including `.rail-chat:hover`, `.rail-chat.active`, `.rail-chat:focus-visible`, `.rail-chat svg`) from `chat.css`. The rail's `overflow-y:auto; overflow-x:hidden` was simplified to `overflow:hidden` — with no scrollable list inside, the rail no longer needs to scroll.
- **Consequence**: `rail-chat-<id>` no longer exists as a `data-testid`. The expanded panel's chat entries are unaffected — clicking a chat there still navigates via `chatPath(c.id)`.

### Amendment checkboxes (rail simplification)

- [x] **A8 (T2)** `chat.css` — the `.rail-chats` and `.rail-chat*` rules are removed; `.sidebar-rail` overflow simplified to `hidden`.
- [x] **A9 (T3)** `ChatSidebar.tsx` — the per-chat shortcut list is removed from the rail. The `useNavigate` / `chatPath` imports are retained because the expanded panel still uses them.
- [x] **A10 (T9)** `frontend/README.md` — the "The collapsed rail" subsection now states that the rail shows no per-chat shortcuts and explains why; the `data-testid` convention list drops `rail-chat-<id>`.
- [x] **A11** `e2e-test-instructions.md` — J3, J16, J25, and J32 rewritten to assert the rail's simplified contents; J32 now asserts that no per-chat icons and no letter initials appear.
- [x] **A12** `aidlc-docs/scripts/css-regression-check.py` — `FEATURE_SELECTORS` updated with the six removed `.rail-chat*` selectors.


---

## Completion Criteria

- [x] All 9 steps marked `[x]`.
- [x] FR-1 … FR-7 implemented.
- [x] NFR-1 … NFR-8 satisfied.
- [x] No new dependencies.
- [x] No backend modifications.
- [x] No duplicate files created; no legacy file touched.

**Status: COMPLETE.** All 9 steps (T1–T9) executed in order. Four files touched — `features/chat/hooks/useSidebarCollapse.ts` (new), `features/chat/components/ChatSidebar.tsx` (modified), `features/chat/pages/ChatPage.tsx` (modified), `features/chat/styles/chat.css` (modified) — plus `frontend/README.md` (modified) for T9. Verification: build 0 errors (372 modules), lint 5 warnings / 0 errors (at baseline), CSS selector check 0 cross-file duplicates, CSS regression check 0 selectors lost, tokens.css byte-identical, 0 raw hex in the new rules, `package.json` unchanged, `backend/` untouched, `shared/api/` untouched, no duplicate files.
