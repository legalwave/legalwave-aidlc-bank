# Requirements — Sidebar Collapse Feature

**Project**: LegalWave (Japanese contract risk analyzer)
**Unit**: `frontend/` — chat workspace sidebar
**Date**: 2026-10-30
**Source**: `aidlc-docs/inception/requirements/sidebar-collapse/requirement-verification-questions.md`

---

## Intent Analysis

| Field | Value |
|---|---|
| **User request** | "now add sidebar collapse with smooth opening and closing animation" |
| **Request type** | New Feature (enhancement to an existing component) |
| **Scope estimate** | Single Component — `ChatSidebar` + `ChatPage` + `features/chat/styles/chat.css` |
| **Complexity estimate** | Simple–Moderate — the animation technique, the collapsed representation, and the responsive behaviour each carry a design decision, but no new data model, API, or service is involved |

### Existing context

The chat workspace is a CSS grid shell:

```
.shell { display: grid; grid-template-columns: 280px 1fr; height: 100vh; }
```

`ChatSidebar` renders the brand lockup, new-chat button, search input, grouped chat list, and user footer. `ChatPage` composes `ChatSidebar` with the thread and composer. **No collapse-related code exists today** — this is an additive change to an already-mapped area, and the backend contract is untouched.

### Resolved decisions (from the approved answers)

| # | Decision |
|---|---|
| Q1 | Collapsed = icon-only rail, ~56px wide (not fully hidden) |
| Q2 | CSS transition on the grid column width |
| Q3 | 200ms, `cubic-bezier(0.4, 0, 0.2, 1)` |
| Q4 | Persist to `localStorage` under `lw_sidebar_collapsed` |
| Q5 | Toggle button in the sidebar header / rail |
| Q6 | `Ctrl+B` / `Cmd+B` keyboard shortcut |
| Q7 | Synchronised fade-and-slide of contents during the transition |
| Q8 | Honour `prefers-reduced-motion` |
| Q9 | Below 768px the sidebar becomes an overlay drawer with a scrim |
| Q10 | The chat area reflows in step with the animation |
| Q11 | Rail icons carry `title` and `aria-label` |
| Q12 | The rail shows a per-chat shortcut to open a chat directly — **superseded 2026-10-31**; the rail no longer renders per-chat shortcuts |
| Q13 | Security baseline — skipped |
| Q14 | Resiliency baseline — skipped |
| Q15 | Property-based testing — skipped |
| Q16 | Root class on the shell + `aria-expanded` on the toggle |

### Contradiction & ambiguity analysis

No contradictions were found across the 16 answers. The decisions compose consistently:

- The icon-rail (Q1-B) is what makes the in-sidebar toggle (Q5-A) viable as the sole reopen affordance — the toggle remains visible in the rail.
- The grid-column transition (Q2-A) directly implements the in-step chat-area reflow (Q10-A) — no separate mechanism is needed.
- Persistence (Q4-A) is independent of the DOM representation (Q16-A) and of the reduced-motion path (Q8-A); reduced motion affects only the transition duration, never the end state.
- The drawer behaviour (Q9-A) supersedes the rail at narrow widths, so Q1, Q5, and Q12 apply at desktop widths only.

No clarification file was required.

---

## Functional Requirements

### FR-1 — Collapsed representation

- **FR-1.1** — The sidebar shall collapse to an icon-only rail approximately **56px** wide. The chat area shall expand to occupy the reclaimed space.
- **FR-1.2** — In the collapsed state the rail shall retain, in order: the toggle button, the brand logo, and the new-chat button. The search input, chat titles and previews, and the user name shall be hidden. **Amended 2026-10-31** — the per-chat shortcut list originally mandated by Q12-A was removed: a column of identical chat-bubble glyphs at 56px carries no information (no room for a title, no way to tell the chats apart) and was reported as visual noise by the user. The chat list is reached by expanding the sidebar.
- **FR-1.3** — The collapse shall not unmount the chat list from the React tree. The collapsed state shall be driven by CSS so that the exit animation is possible and the chat list's scroll position and effects are preserved across toggles (Q16-C rejection).
- **FR-1.4** — The rail shall not alter the backend contract or the data available to the chat list. **Amended 2026-10-31** — the clause requiring per-chat shortcuts to draw on `ChatSummary` (`title`, `preview`, `id`) no longer applies, because the rail no longer renders per-chat shortcuts. The rail reads no chat data at all.

### FR-2 — Toggle control

- **FR-2.1** — A toggle button shall be rendered in the sidebar header, adjacent to the brand logo. It shall remain visible in both the expanded and collapsed states (Q5-A).
- **FR-2.2** — The button shall carry `aria-expanded` reflecting the current state (`true` when expanded, `false` when collapsed) and an accessible name that describes the action (Q16-A).
- **FR-2.3** — The toggle shall be reachable and operable by keyboard, with a visible focus state (NFR-4.4).
- **FR-2.4** — The toggle button shall carry a stable `data-testid` (e.g. `sidebar-toggle-button`).

### FR-3 — Animation

- **FR-3.1** — Opening and closing shall be animated with a CSS transition of **200ms** using the easing curve `cubic-bezier(0.4, 0, 0.2, 1)` (Q3-A).
- **FR-3.2** — The animation shall be implemented as a transition on the shell's grid column width (Q2-A), so the sidebar and the chat area resize as one coherent motion.
- **FR-3.3** — The sidebar's text contents shall fade and translate in synchronisation with the width transition (Q7-A), so no text is left clipped mid-word or left dangling outside the collapsing panel.
- **FR-3.4** — The chat thread, composer, and top bar shall reflow in step with the animation, re-centring as the available width changes (Q10-A).
- **FR-3.5** — The animation shall be driven entirely by CSS. No per-frame JavaScript animation loop shall be used (Q2-D rejection).

### FR-4 — Keyboard shortcut

- **FR-4.1** — `Ctrl+B` (Windows/Linux) and `Cmd+B` (macOS) shall toggle the sidebar (Q6-A).
- **FR-4.2** — The shortcut shall call `preventDefault()` so the browser does not apply bold formatting to focused text.
- **FR-4.3** — The shortcut shall be scoped to the chat workspace only. It shall not fire on the login or register pages, and it shall not fire while the user is typing in a text field where bold formatting might be intended.
- **FR-4.4** — The shortcut shall toggle the same state as the button (FR-2), producing identical persisted results.

### FR-5 — State persistence

- **FR-5.1** — The collapsed state shall persist across page reloads using `localStorage` key `lw_sidebar_collapsed` (Q4-A).
- **FR-5.2** — A missing, empty, or malformed value shall be treated as "expanded". The feature shall degrade silently to the default state and shall never throw (NFR-8.2).
- **FR-5.3** — The `jlca_token` and `jlca_user` localStorage keys shall be left untouched by this feature (NFR-6.1).
- **FR-5.4** — The persistence layer shall be namespaced and isolated to this feature so it cannot affect unrelated storage.

### FR-6 — Responsive behaviour

- **FR-6.1** — At viewport widths below **768px**, the sidebar shall become a full-height overlay drawer that slides in from the left, with a scrim behind it (Q9-A).
- **FR-6.2** — At narrow widths the collapse/expand state shall not apply. The drawer is either open or closed; there is no icon-rail intermediate state (Q9-A).
- **FR-6.3** — The drawer shall be closable by the toggle button, by clicking the scrim, and by pressing `Escape`.
- **FR-6.4** — The desktop collapse state and the mobile drawer state shall be independent — a user's persisted desktop preference shall not force the drawer open on a phone.

### FR-7 — Accessibility

- **FR-7.1** — Every interactive element in the rail shall have both an `aria-label` and a `title` attribute (Q11-A).
- **FR-7.2** — The `prefers-reduced-motion: reduce` media query shall disable the transition; the sidebar shall switch to its end state immediately with no movement (Q8-A).
- **FR-7.3** — Under reduced motion, the end state must still be correct — the sidebar must be collapsed or expanded, never stuck mid-transition.
- **FR-7.4** — The collapse state shall not be conveyed by colour alone. The toggle's `aria-expanded` and its icon change provide a non-visual signal (NFR-4.5).

---

## Non-Functional Requirements

### NFR-1 — Performance

- **NFR-1.1** — The animation shall run on compositor-friendly properties only. Width transitions on grid columns are acceptable; no layout-thrashing JavaScript animation loop shall be used (Q2-D rejection).
- **NFR-1.2** — The collapse shall not cause visible scroll jank in the chat thread, the sidebar's chat list, or the settings pane (NFR-3.2 from the previous unit, extended to this feature).
- **NFR-1.3** — The collapse shall not trigger a network request, a React re-render of the chat list's data, or a re-fetch of the chat history. Toggling shall be a pure presentation change.
- **NFR-1.4** — The drawer at narrow widths shall use `transform` for its slide so the motion stays off the layout path.

### NFR-2 — Dependencies

- **NFR-2.1** — **No new dependencies** shall be added. `package.json` `dependencies` and `devDependencies` must remain byte-identical (carried forward from the previous unit's NFR-2.1 / NFR-2.2).
- **NFR-2.2** — The animation shall use only CSS transitions and the Web Animations / CSSOM APIs already available in the browser. No animation library.

### NFR-3 — Code quality & consistency

- **NFR-3.1** — The strict TypeScript settings already in force shall continue to hold: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. Type-only imports must use `import type`.
- **NFR-3.2** — New styles shall be added to `features/chat/styles/chat.css`, the file that already owns the shell and sidebar rules. No new stylesheet file shall be created.
- **NFR-3.3** — The change shall preserve the feature-based module structure established in the previous unit. The collapse state shall live in the `features/chat/` boundary; it shall not leak into `app/` or `shared/`.
- **NFR-3.4** — The design tokens in `styles/tokens.css` shall not be modified. Any new colour shall reuse an existing token (`--accent-amber`, `--line-strong`, `--ink-secondary`, etc.).
- **NFR-3.5** — The existing `api-contract.md` and the `shared/api/` layer shall not be modified.

### NFR-4 — Accessibility (extended)

- **NFR-4.1** — Focus states shall remain visible on all interactive elements, including the toggle and the rail shortcuts (carried forward).
- **NFR-4.2** — The drawer, when open at narrow widths, shall trap or appropriately manage focus, and `Escape` shall close it (FR-6.3).
- **NFR-4.3** — The scrim shall be `aria-hidden="true"` and shall not be a focus trap target.
- **NFR-4.4** — The collapse shall not cause a scroll-position jump in the chat thread. The thread's scroll container shall keep its position.

### NFR-5 — Backend contract stability

- **NFR-5.1** — No file under `backend/` shall be modified (carried forward).
- **NFR-5.2** — No new API endpoint shall be introduced. The collapsed state is a purely client-side presentation concern.

### NFR-6 — Session management

- **NFR-6.1** — The `jlca_token` / `jlca_user` session mechanism shall be untouched. The new `lw_sidebar_collapsed` key shall be independent of authentication state and shall survive sign-out (it is a device preference, not user data).

### NFR-7 — Security posture

- **NFR-7.1** — No secrets in client code; no token logging. The new localStorage value is a boolean UI preference and shall never contain user data.
- **NFR-7.2** — No `dangerouslySetInnerHTML` shall be introduced.

### NFR-8 — Resiliency

- **NFR-8.1** — If `localStorage` is unavailable (private mode, disabled storage, quota exceeded), the feature shall degrade to the default expanded state without throwing.
- **NFR-8.2** — The persisted value shall be read defensively — `JSON.parse` failures and unexpected types shall be caught.

---

## Scope Boundaries

### In scope
- `frontend/src/features/chat/components/ChatSidebar.tsx` — toggle button, rail rendering
- `frontend/src/features/chat/pages/ChatPage.tsx` — collapsed state ownership, keyboard shortcut, drawer state
- `frontend/src/features/chat/styles/chat.css` — grid transition, rail styling, fade-and-slide, drawer, reduced-motion
- A small persistence helper for the `lw_sidebar_collapsed` key

### Out of scope
- The backend, the API contract, and `shared/api/`
- The auth pages (`/login`, `/register`) — the drawer/collapse applies to the chat workspace only
- The settings page — it has its own single-column layout and no sidebar
- Any redesign of the sidebar's visual appearance beyond the collapsed rail
- Persisting the preference server-side per user account (Q4-D rejection)

---

## Traceability Matrix

| Requirement | Verified by |
|---|---|
| FR-1.1–1.2 — Icon rail, ~56px | E2E A (rail rendering) |
| FR-1.3 — No unmount | E2E B (chat list scroll position + selection preserved) |
| FR-1.4 — Uses existing `ChatSummary` data | Code inspection — no API change |
| FR-2.1–2.4 — Toggle button, `aria-expanded`, `data-testid` | E2E C |
| FR-3.1–3.5 — 200ms transition, fade-and-slide, CSS-only | E2E D + Performance P9 |
| FR-4.1–4.4 — `Ctrl+B` / `Cmd+B` | E2E E |
| FR-5.1–5.4 — `localStorage` persistence | E2E F |
| FR-6.1–6.4 — Mobile drawer | E2E G |
| FR-7.1–7.4 — A11y names, reduced motion | E2E H |
| NFR-1.1–1.4 — No jank, no refetch, no new deps | Performance P9–P12 |
| NFR-2.1–2.2 — No new dependencies | Static check — `package.json` unchanged |
| NFR-3.1–3.5 — Strict TS, one stylesheet, tokens untouched | `npm run build`, `npm run lint`, selector + token checks |
| NFR-4.1–4.4 — Focus, drawer focus management | E2E H |
| NFR-5.1–5.2 — Backend untouched | Static check — `backend/` unmodified |
| NFR-6.1 — Session keys untouched | Code inspection |
| NFR-7.1–7.2 — No secrets, no `dangerouslySetInnerHTML` | Code inspection |
| NFR-8.1–8.2 — Storage failure degrades safely | E2E F (private-mode case) |

---

## Key Requirements Summary

1. **The sidebar collapses to a 56px icon rail**, not to nothing — the logo, toggle, and new-chat button stay reachable. The full panel is restored by the toggle or a `Ctrl+B` shortcut.
2. **The animation is a single CSS transition** on the shell's grid column width, running 200ms on `cubic-bezier(0.4, 0, 0.2, 1)`, with the sidebar's text contents fading and sliding in synchronisation. No JavaScript animation loop, no new dependency.
3. **The state persists** to a new `lw_sidebar_collapsed` localStorage key, defaulting to expanded when absent or malformed, and degrading silently if storage is unavailable.
4. **Below 768px the sidebar becomes an overlay drawer** with a scrim, closable by the toggle, the scrim, or `Escape` — the desktop collapse preference does not apply there.
5. **Reduced motion is honoured** — the sidebar jumps to its end state with no movement, and the end state is always correct.
6. **The change is additive and contained** — three files in `features/chat/`, no new dependencies, no backend change, no design-token change.
