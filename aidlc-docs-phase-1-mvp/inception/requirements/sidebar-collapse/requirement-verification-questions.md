# Requirement Verification Questions — Sidebar Collapse Feature

**Feature**: collapsible sidebar with a smooth open/close animation in the LegalWave chat workspace.
**Date**: 2026-10-30
**Depth**: Standard (the request is clear in intent but has several implementation-shaping ambiguities — animation technique, collapsed representation, persistence, and control placement all change the design materially)

Please answer each question by filling in the letter choice after the `[Answer]:` tag. If none of the options match your needs, choose the last option (Other) and describe your preference.

Each question below has a **⭐ Recommended** option — the one I judge best for this codebase — with the reasoning given after it.

---

## Question 1
**What should the sidebar look like when collapsed?**

A) Fully hidden — the sidebar slides completely off-screen and the chat expands to full width. A small floating button remains to reopen it.

B) Collapsed to a narrow rail (icon-only) — the brand logo, a new-chat icon, and a menu toggle stay visible in a ~56px column; the search box, chat titles/previews, and user name are hidden. Clicking a rail icon opens a flyout/popover with the full content.

C) Hidden, but the collapsed state leaves a narrow vertical strip on the left edge that is still clickable to expand.

D) Fully hidden with no visible affordance — reopen via a keyboard shortcut only.

X) Other (please describe after [Answer]: tag below)

[Answer]: B

**Recommendation rationale**: A fully-hidden sidebar (option A) removes the chat history from view entirely, which for a chat-history-driven workspace is a usability regression — the user loses the ability to see recent conversations at a glance. The icon-only rail (option B) is the pattern used by ChatGPT, Linear, and Notion: it keeps the logo and primary actions one click away, preserves the visual rhythm of the layout, and the flyout gives full access to search and history without permanently sacrificing width. Option C is fragile (a 4px click target) and D is undiscoverable.

---

## Question 2
**How should the open/close animation be implemented?**

A) CSS transition on the grid column width — the shell's column animates from `280px` to `56px` with a `cubic-bezier` easing over ~200–250ms. Content inside fades and slides independently.

B) CSS transition on the sidebar's own `width`/`transform` only — the sidebar slides out over the content (overlay style) and the chat area does not resize; the main area gets a margin/padding shift instead.

C) View Transitions API (`document.startViewTransition`) — a modern, browser-native snapshot-based animation that cross-fades old and new layout states smoothly.

D) React-driven animation with requestAnimationFrame — compute the width per frame in JS.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: Option A is the right fit because the shell is already `display:grid` with `grid-template-columns:280px 1fr`, and a grid-template-columns transition animates both the sidebar and the chat area resizing in one compositor-friendly property — no JS per frame. It matches the existing layout model and requires no new dependency (NFR-2.1 forbids one). Option B (overlay) leaves a permanent gap or requires the main area to shift anyway, so it is more code for a worse result. Option C is elegant but the View Transitions API is still not universally available and React 19 does not wrap it — it would need progressive-enhancement fallbacks, adding complexity for a marginal gain here. Option D puts animation work on the main thread, which risks jank — exactly what NFR-3.2 warns against.

---

## Question 3
**What animation duration and easing should be used?**

A) 200ms with `cubic-bezier(0.4, 0, 0.2, 1)` — a standard, snappy "material"-style ease-in-out.

B) 250ms with `cubic-bezier(0.4, 0, 0.2, 1)` — slightly more relaxed, still responsive.

C) 300ms with `ease-in-out` — noticeably smooth, a touch cinematic.

D) Match a value already present in the codebase (e.g. the existing `pulse 1.6s` / `blink 1s` keyframes) for consistency.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: 200ms is the industry-standard duration for a layout transition of this size — long enough to read as smooth and intentional, short enough that it never feels like the UI is waiting on you. The `cubic-bezier(0.4, 0, 0.2, 1)` curve is the standard decelerate curve used across Material Design and is what makes the motion feel natural. The existing `pulse`/`blink` keyframes are looping ambient animations, not transitions, so option D would not be a meaningful consistency reference.

---

## Question 4
**Should the collapsed/expanded state persist across page reloads?**

A) Yes — persist to `localStorage` under a new key (e.g. `lw_sidebar_collapsed`) and restore on load.

B) No — always start expanded on every page load.

C) Yes, but only within the session — use `sessionStorage` so it survives navigation but resets on a new browser session.

D) Yes, and also remember it per user account (server-side preference).

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: Persisting to `localStorage` is what users almost always expect from a layout preference — a sidebar that resets every reload feels broken and becomes something users toggle on every visit. A new, namespaced key (`lw_sidebar_collapsed`) keeps the change fully backward-compatible: the existing `jlca_token` / `jlca_user` keys are untouched (NFR-6.1), and a missing key simply defaults to expanded, so existing users see no change on upgrade. Option D would require a backend change, which NFR-5.1 forbids for this unit.

---

## Question 5
**Where should the collapse/expand control live?**

A) A dedicated toggle button in the sidebar header, next to the brand logo (always visible in both states — it becomes the primary way to reopen).

B) A toggle button in the chat top bar (`<header>`), to the left of the model pill — outside the sidebar, so it is reachable even when the sidebar is hidden.

C) Both — a button in the sidebar header and a keyboard shortcut.

D) Only a keyboard shortcut (e.g. `Ctrl+B`), with no visible button.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: A visible control inside the sidebar header is discoverable and keeps the control next to the thing it controls. If the sidebar collapses to an icon rail (Question 1, option B), the toggle naturally stays in the rail as the leftmost icon — so the user always has a one-click path back, and the "no visible affordance" failure mode of option D is avoided. Option B's top-bar button would sit oddly far from the sidebar it controls. Option C is good but I would recommend adding a keyboard shortcut as a bonus in either case.

---

## Question 6
**Should there be a keyboard shortcut to toggle the sidebar?**

A) Yes — `Ctrl+B` / `Cmd+B` (the VS Code / Gmail convention), with the browser's own bold-text shortcut suppressed while the chat workspace is focused.

B) Yes — but a different key combination, e.g. `Ctrl+\` or `[`.

C) No — pointer/tap interaction only.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: `Ctrl+B` is the near-universal convention for sidebar toggling (VS Code, GitHub, Gmail, Linear). It is a genuine power-user convenience for a workspace where the sidebar holds chat history. The implementation must call `preventDefault()` so the browser does not apply bold formatting to focused text, and it should be scoped to the chat workspace so it does not interfere with the login/register forms or any text input where the user might genuinely want bold.

---

## Question 7
**How should the sidebar's contents behave during the collapse animation?**

A) Fade out and slide with the sidebar — the text content fades and shifts left in sync with the width animation, so nothing is left dangling.

B) Hide immediately when collapsing starts, animate only the width — simplest, but content snaps out of view abruptly.

C) Fade out with a slight delay so the user can see what is collapsing, then shrink.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: A synchronized fade-and-slide reads as a single coherent motion rather than "content vanished, then a panel shrank." It also avoids the awkward moment where text is clipped mid-word by a narrowing container. Option B produces a visible pop. Option C's delay makes the total interaction feel sluggish — the user waits for the fade before the shrink even starts.

---

## Question 8
**Should the animation respect the user's `prefers-reduced-motion` setting?**

A) Yes — when the OS reports reduced motion, the sidebar should transition instantly (or over a very short duration) with no easing. This is a WCAG 2.3.3 / accessibility best practice.

B) No — always animate regardless of the setting.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: `prefers-reduced-motion` exists precisely for users who find large motion transitions disorienting or harmful — for some users, a sliding panel triggers vestibular discomfort. Honouring it costs one CSS media query and is the expected behaviour of any polished modern app. Note that the project currently handles `prefers-reduced-motion` nowhere, so this would be the first such rule — which is a good precedent to set. The reduced-motion path should still show the *end state* correctly (collapsed or expanded), just without the movement.

---

## Question 9
**On narrow viewports (mobile), how should the sidebar behave?**

A) Below a breakpoint (e.g. 768px), the sidebar becomes a full-height overlay drawer that slides in from the left, with a scrim behind it — the collapsed/expanded state does not apply. The toggle button opens and closes it.

B) Apply the same collapse behaviour at all widths.

C) On narrow viewports the sidebar is always hidden and the toggle reveals it as an overlay drawer, with no "collapsed rail" concept at all.

D) Do not add any responsive behaviour — the feature applies only at desktop widths.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: The current layout is a fixed 280px grid column with no responsive handling at all — on a 375px phone the sidebar already occupies 75% of the screen, which is a pre-existing problem that this feature is a natural opportunity to fix. A drawer overlay at narrow widths is the standard responsive pattern, and it keeps the collapse feature meaningful rather than pointless on mobile. Option D would leave the existing mobile layout broken.

---

## Question 10
**Should the chat area's content reflow smoothly as the sidebar collapses?**

A) Yes — the thread, composer, and top bar all resize in step with the sidebar animation, since they live in the second grid column. Nothing special is needed beyond animating the column width.

B) No — the chat area should keep its current width and the sidebar should overlay it.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: Because the layout is a CSS grid with `280px 1fr`, animating the first column automatically reflows the second. This is the simplest correct behaviour and avoids the layout shift that an overlay would cause. The composer is centred with `max-width:824px` and the thread with `max-width:760px`, so both will re-centre smoothly as the available width changes.

---

## Question 11
**Should the collapsed rail show tooltips on hover for its icons?**

A) Yes — show a tooltip or `title` attribute on each rail icon (brand logo, new chat, toggle) identifying it.

B) No — the icons should be self-explanatory.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: Icon-only rails are ambiguous by nature. A `title` attribute gives a native browser tooltip at zero cost and zero dependency, and adding `aria-label` to each control satisfies NFR-4.1 (accessible names for interactive elements). This is a small addition with a large usability payoff.

---

## Question 12
**Should the collapsed rail include a way to jump straight to a chat without expanding first?**

A) Yes — clicking a chat's icon in the rail opens that chat directly. This requires showing chat icons in the rail (e.g. initials or a generic document icon per recent chat).

B) No — the rail only holds the logo, new-chat, and toggle; selecting a chat requires expanding the sidebar first.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: Showing per-chat shortcuts in the rail makes the collapsed state genuinely useful rather than merely decorative — the user can continue a conversation without a round trip through the expanded panel. A generic document/initial icon per chat is unobtrusive and needs no extra data (the chat list already carries title and preview).

> **Superseded 2026-10-31 — answer changed to B.** The original recommendation did not survive contact with the shipped UI. A column of per-chat icons at 56px shows no title and no preview, so every icon is identical and the user cannot tell the chats apart; the rail was reported as visual noise and the shortcuts were removed. The rail now holds only the logo, the new-chat button, and the expand toggle, and selecting a chat requires expanding the sidebar first. See finding 17 in `aidlc-docs/construction/build-and-test/frontend/build-and-test-summary.md`.

---

## Question 13
**Extension opt-in — Security Baseline**

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

**Recommendation rationale**: This is a small, self-contained UI feature with no new data flow, no new API surface, and no change to the existing authentication or session model. The prior opt-out remains appropriate; a UI collapse toggle introduces no new attack surface worth a formal security discipline.

---

## Question 14
**Extension opt-in — Resiliency Baseline**

Should the resiliency baseline be applied to this project?

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

**Recommendation rationale**: This is a single-process local SPA with an unchanged backend contract. There is no distributed system, no failover domain, and no new infrastructure. The resiliency baseline would add review ceremony without changing a single design decision here.

---

## Question 15
**Extension opt-in — Property-Based Testing**

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

**Recommendation rationale**: This is a UI-only feature with no new pure business logic and no serialization round-trips beyond reading one boolean out of `localStorage`. PBT would have nothing meaningful to exercise. The opt-out also avoids adding a test runner, which would violate NFR-2.1 (no new dependencies).

---

## Question 16
**How should the collapsed state be represented in the DOM?**

A) A class on the shell root (e.g. `shell sidebar-collapsed`) that drives all the CSS, with `aria-expanded` on the toggle button reflecting the state.

B) A `data-collapsed="true|false"` attribute on the shell root.

C) Conditional rendering — unmount the collapsed-away content entirely and render a different component tree for the rail.

D) A CSS custom property (e.g. `--sidebar-w`) set inline from React.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**Recommendation rationale**: A root class is the most conventional and readable approach: it keeps all the styling in the stylesheet (where the rest of the design lives) and makes the collapsed state trivially inspectable in DevTools. It also composes cleanly with the grid-template-columns transition. `aria-expanded` on the toggle button is the correct ARIA pattern for a disclosure control and satisfies NFR-4.1. Option C would cause React to unmount and remount the chat list on every toggle, losing scroll position and re-running effects — and would make the exit animation impossible.

---

## Summary

| # | Topic | Recommended |
|---|---|---|
| 1 | Collapsed appearance | B — icon-only rail, ~56px |
| 2 | Animation technique | A — CSS transition on the grid column width |
| 3 | Duration & easing | A — 200ms, `cubic-bezier(0.4, 0, 0.2, 1)` |
| 4 | State persistence | A — `localStorage`, new `lw_sidebar_collapsed` key |
| 5 | Toggle control placement | A — in the sidebar header / rail |
| 6 | Keyboard shortcut | A — `Ctrl+B` / `Cmd+B` |
| 7 | Content behaviour during animation | A — synchronized fade-and-slide |
| 8 | `prefers-reduced-motion` | A — honour it, transition instantly |
| 9 | Narrow-viewport behaviour | A — overlay drawer below 768px |
| 10 | Chat area reflow | A — resize in step with the animation |
| 11 | Rail icon tooltips | A — `title` + `aria-label` |
| 12 | Chat shortcuts in the rail | ~~A — show a per-chat icon to open it directly~~ → **B — no shortcuts; expand first** (changed 2026-10-31) |
| 13 | Security baseline | B — skip |
| 14 | Resiliency baseline | B — skip |
| 15 | Property-based testing | C — skip |
| 16 | DOM representation | A — root class + `aria-expanded` |

---

**Please fill in every `[Answer]:` tag above and reply when done.**
