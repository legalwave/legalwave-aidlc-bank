# Build and Test Summary — LegalWave Frontend

> **This document covers the `frontend/` unit only.** For the standalone `responsive-auth` design unit (a single self-contained HTML file), see the sibling `responsive-auth-*.md` files in this directory.


**Unit**: `frontend/` — LegalWave rebrand + modular restructure (unit 1) and sidebar collapse feature (unit 2)
**Date**: 2026-10-30
**Scope**: the frontend unit only. The backend was not built, modified, or tested by this unit.

---

## Build status

| Field | Value |
|---|---|
| **Build tool** | Vite 8.3.5 + TypeScript 7.0.2 (`tsc -b && vite build`) |
| **Build status** | ✅ **Success** |
| **Build time** | 338 ms (dev machine) |
| **Modules transformed** | 372 (371 after unit 1, +1 for the new `useSidebarCollapse.ts`) |
| **Type-check** | ✅ Clean — 0 diagnostics under `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` |
| **Lint** | ✅ 0 errors, 5 warnings (the pre-existing baseline) |

### Build artifacts

| Artifact | Size | Gzip | Δ from unit 1 |
|---|---|---|---|
| `dist/index.html` | 0.64 kB | 0.38 kB | — |
| `dist/assets/index-<hash>.js` | 447.65 kB | 139.04 kB | +2.48 kB / +0.69 kB |
| `dist/assets/index-<hash>.css` | 20.37 kB | 4.46 kB | +3.11 kB / +0.57 kB |
| `dist/assets/logo-<hash>.svg` | 2.94 kB | 1.11 kB | — |
| `dist/assets/wave-field-<hash>.svg` | 4.85 kB | 1.55 kB | — |

Both SVG assets are fingerprinted and present in the output — confirming `config/brand.ts` resolves them correctly through `import.meta.url`. The CSS growth is the collapse / rail / drawer / reduced-motion rules; the JS growth is the new hook.

> The figures above are from the **post-defect-fix build** (2026-10-31). The pre-fix build was 447.65 kB JS / 21.26 kB CSS; the defect-fix pass traded the five per-child collapse selectors for a single `.sidebar-panel` wrapper and added a second toggle, and the rail-simplification pass removed the per-chat shortcut markup and its CSS — so the CSS is smaller than the original build and the JS is back to its original size.

---

## Test execution summary

### Unit tests

- **Automated unit tests**: **N/A** — the project has no test runner (no `*.test.*`, `*.spec.*`, `conftest.py`, or `pytest.ini` anywhere in the repo). Adding one would require new dependencies, which NFR-2.1/NFR-2.2 forbid and the user explicitly opted out of via the `property-based-testing` extension.
- **Static verification (the substitute)**: **12 / 12 passed**

| Check | Result | Detail |
|---|---|---|
| A1 — Type-check (`tsc -b --force`) | ✅ Pass | 0 diagnostics |
| A2 — Lint (`oxlint`) | ✅ Pass | 0 errors, 5 warnings (baseline) |
| A3 — CSS selector integrity | ✅ Pass | 204 selectors, **0** defined in more than one file |
| A4 — CSS regression (no selector lost) | ✅ Pass | **184** pre-change selectors, **0 lost**, 20 added |
| A5 — Design-token preservation | ✅ Pass | **20 / 20** tokens match; `tokens.css` byte-identical |
| A6 — Raw hex in the new rules | ✅ Pass | **0** hex values in any sidebar rule; the file's single hex (`#1A1208` on `.send-btn`) is pre-existing and unrelated |
| A7 — Legacy paths removed | ✅ Pass | `src/api.ts`, `src/styles.css`, `src/pages`, `src/components` all absent |
| A8 — Backend untouched | ✅ Pass | 0 files under `backend/` modified |
| A9 — `shared/api/` untouched | ✅ Pass | 0 files modified — no endpoint added, removed, or reshaped |
| A10 — Dependencies unchanged | ✅ Pass | `dependencies` and `devDependencies` byte-unchanged |
| A11 — Session keys untouched | ✅ Pass | `jlca_token` / `jlca_user` appear only in a JSDoc comment; no executable access |
| A12 — No duplicate files | ✅ Pass | `find frontend/src -name '*_new*' -o -name '*_modified*'` → empty |

### Integration tests

- **Scenarios defined**: 21 (13 from unit 1, 8 new for the sidebar collapse)
- **Automated execution**: N/A (no test runner) — executed manually via the checklist
- **Status**: ⏳ Awaiting manual execution

| # | Scenario | Status |
|---|---|---|
| 1 | Register → auto sign-in → workspace | ☐ |
| 2 | Register rejects a duplicate email | ☐ |
| 3 | Login posts to `/api/auth/login` only | ☐ |
| 4 | Login shows an inline error on bad credentials | ☐ |
| 5 | Route guards (4 cases) | ☐ |
| 6 | Cross-module navigation between auth pages | ☐ |
| 7 | Session expiry → global 401 | ☐ |
| 8 | Chat streaming end to end | ☐ |
| 9 | Chat history, search, delete | ☐ |
| 10 | Settings: API keys + MCP snippet = `legalwave` | ☐ |
| 11 | LegalWave branding throughout | ☐ |
| 12 | Background on auth screens and in the workspace | ☐ |
| 13 | App usable if the artwork fails to load | ☐ |
| 14 | Collapse and expand via the toggle button | ☐ |
| 15 | The collapsed state survives a reload | ☐ |
| 16 | `Ctrl+B` / `Cmd+B` toggles the sidebar | ☐ |
| 17 | The chat list is not remounted by a toggle | ☐ |
| 18 | Mobile drawer below 768px | ☐ |
| 19 | The desktop preference and the drawer are independent | ☐ |
| 20 | Reduced motion | ☐ |
| 21 | `localStorage` unavailable | ☐ |

### Performance tests

| Check | Target | Actual | Status |
|---|---|---|---|
| P1 — Artwork size (NFR-3.1) | < 30 KB | `wave-field.svg` 4,856 B; `logo.svg` 2,942 B | ✅ Pass |
| P2 — Fixed, non-interactive background (NFR-3.2, NFR-4.1) | `position:fixed` + `pointer-events:none` | `.shell-bg` fixed at `opacity:.05`; `.auth-bg` fixed at `opacity:.55` | ✅ Pass |
| P3 — Bundle size | Within noise of unit 1 | 447.65 kB JS / 20.37 kB CSS | ✅ Pass |
| P4 — Module transform count | 372 | 372 | ✅ Pass |
| P5 — Scroll smoothness (3 containers) | No stutter | Manual | ☐ |
| P6 — Background interaction cost | No measurable difference | Manual | ☐ |
| P7 — Streaming responsiveness (NFR-3.3) | No regression | NDJSON buffering diff-verified byte-identical | ✅ Pass |
| P8 — Route-split navigation latency | No reload, no perceptible delay | Manual | ☐ |
| **P9 — Collapse animation is CSS-only (NFR-1.1)** | No `requestAnimationFrame` / JS animation loop | `grep` over `features/chat/` → **no hits** | ✅ Pass |
| **P10 — Drawer animates on `transform` (NFR-1.4)** | `translateX`, not `left`/`width` | `transform:translateX(-100%)` → `translateX(0)` | ✅ Pass |
| **P11 — No refetch on toggle (NFR-1.3)** | No `refreshChats` / `fetchChats` in the feature | `grep` → **no hits** | ✅ Pass |
| **P12 — Collapse smoothness on a long thread (NFR-1.2)** | ~200ms, no stutter, no request, scroll preserved | Manual (risk R1) | ☐ |
| **P13 — Drawer smoothness on mobile** | Smooth slide + scrim fade | Manual | ☐ |

### Additional tests

| Category | Status | Note |
|---|---|---|
| **Contract tests** | ✅ Pass (static) | No endpoint added, removed, or reshaped. `shared/api/client.ts` — including `api<T>`, `streamChat`, and the session helpers — is **byte-identical** to the original `src/api.ts`. The `jlca_token` / `jlca_user` localStorage keys are unchanged. The new `lw_sidebar_collapsed` key is a **client-side device preference** and is never transmitted to the backend. |
| **Security tests** | N/A | The `security-baseline` extension was opted out at Requirements Analysis; the threat model is unchanged by either unit. NFR-7.2 (no secrets in client code, no `dangerouslySetInnerHTML`) is satisfied by inspection — the new code contains neither. |
| **E2E tests** | ⏳ Awaiting manual execution | 85 checks across 10 sections — see `e2e-test-instructions.md` |
| **Accessibility tests** | ⏳ Awaiting manual execution | 5 checks in Section H, plus 6 new collapse-specific checks (J23–J27, and J25 for the rail) in Section J |

---

## Requirement verification

### Unit 1 — LegalWave rebrand + modular restructure

| Requirement | Verification method | Status |
|---|---|---|
| FR-1 — Modular project structure | 34 files in the target tree; 0 legacy paths; 0 duplicates; 0 cross-file CSS duplication | ✅ |
| FR-2 — Separate `/register` route | Two independent pages, two endpoints, no toggle | ✅ (code) / ☐ (manual) |
| FR-3 — Route guards | `RequireAuth` + `RedirectIfAuthenticated`, reading session state from context | ✅ (code) / ☐ (manual) |
| FR-4 — LegalWave branding | "LegalWave" appears only in `config/brand.ts`, SVG metadata, and `index.html` — no component hardcodes it; zero occurrences of "Legal Assistant" | ✅ |
| FR-5 — Artistic background | `wave-field.svg` 4,856 B, vector, renders on both auth screens and the workspace | ✅ (code) / ☐ (manual) |
| FR-6 — Design preservation | 20 / 20 design tokens match; 182 selectors, 0 dropped, 0 cross-file duplicated | ✅ |
| FR-7 — Settings update | MCP snippet reads `legalwave`, with the visible change note | ✅ (code) / ☐ (manual) |
| FR-8 — Documentation | `frontend/README.md` rewritten with the structure tree, routes/guards, branding, the MCP key rename, and the asset inventory | ✅ |

### Unit 2 — Sidebar collapse

| Requirement | Verification method | Status |
|---|---|---|
| FR-1 — Collapsed representation | 56px rail carrying the expand toggle, the brand logo, and the new-chat button — no per-chat shortcuts; the full panel stays mounted so the chat list keeps its scroll position | ✅ (code) / ☐ (manual) |
| FR-2 — Toggle control | Two toggles — one in the sidebar header (`«`), one in the rail (`»`) — with exactly one visible at a time; both carry `aria-expanded`, a dynamic `aria-label`/`title`, and `data-testid="sidebar-toggle-button"`, so the sidebar can always be reopened | ✅ (code) / ☐ (manual) |
| FR-3 — Animation | `transition: grid-template-columns 200ms cubic-bezier(.4,0,.2,1)`; synchronised 160ms fade-and-slide prevents clipped text; the chat area reflows in step | ✅ (code) / ☐ (manual) |
| FR-4 — Keyboard shortcut | `Ctrl+B` / `Cmd+B` with an input/textarea/contenteditable guard; `preventDefault()` only when the shortcut applies; toggles the drawer below 768px and the rail above it | ✅ (code) / ☐ (manual) |
| FR-5 — Persistence | `localStorage` key `lw_sidebar_collapsed`; only `'1'` means collapsed; `jlca_token` / `jlca_user` untouched | ✅ (code) / ☐ (manual) |
| FR-6 — Responsive behaviour | Below 768px → overlay drawer + scrim; `Escape` closes it; the desktop preference and the drawer state are independent | ✅ (code) / ☐ (manual) |
| FR-7 — Accessibility | `aria-expanded`, dynamic labels, rail `title` + `aria-label`, the collapsed panel marked `aria-hidden` + `inert` (out of the tab order), `prefers-reduced-motion` honoured | ✅ (code) / ☐ (manual) |
| NFR-1 — Performance | CSS-only animation (P9); 200ms curve (P10/P12); no refetch on toggle (P11); drawer animates on `transform` | ✅ (structural) / ☐ (manual) |
| NFR-2 — No new dependencies | `package.json` unchanged | ✅ |
| NFR-3 — Code quality | Strict compiler clean; lint at baseline; 204 selectors with 0 cross-file duplicates; 0 selectors lost; 0 raw hex in the new rules | ✅ |
| NFR-4 — Accessibility | `aria-expanded`, `aria-label`, `title`, focus-visible rings on the toggle and every rail button | ✅ (code) / ☐ (manual) |
| NFR-5 — Backend contract stability | Zero backend files modified; `shared/api/` untouched; no endpoint reshaped | ✅ |
| NFR-6 — Session management | `jlca_token` / `jlca_user` not read, written, or cleared by the feature; the preference survives sign-out | ✅ |
| NFR-7 — Security posture | No secrets in client code; no `dangerouslySetInnerHTML`; no `console.log` of tokens | ✅ |
| NFR-8 — Resiliency posture | Storage failures caught and swallowed → in-memory state still works; `matchMedia` absence handled | ✅ (code) / ☐ (manual) |

---

## Findings and fixes during verification

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | The markdown rules (`.md …` through `.citation-pill:hover`) were present in **both** `features/chat/styles/chat.css` and `shared/components/markdown.css` — 24 selectors duplicated across two files. | Medium — risks conflicting cascade if either file is edited | **Fixed.** Removed the `chat.css` copy; the canonical home is `shared/components/markdown.css` per plan step 9.2. Cross-file duplication went from **27 → 0**. The check script now distinguishes cross-file duplication (illegal) from same-file repetition (legal CSS). |
| 2 | The logo's fulcrum post and balance beam rendered **invisibly**. | High — a broken logo | **Fixed.** Root cause: `objectBoundingBox` gradients on a zero-width or shallow path have no bounding box to resolve against and silently render nothing. Replaced with solid strokes and removed the unused `<defs>`. Verified visually by rasterising to PNG at 256 / 48 / 24 px. |
| 3 | The example chips **sent** the message instead of seeding the composer — a behaviour regression against the original. | Medium | **Fixed.** Added a `ComposerHandle` exposing `prefill()` via `forwardRef` + `useImperativeHandle`, wired through `ChatPage`. |
| 4 | The sidebar used `window.location.href`, causing a full page reload on chat navigation. | Medium | **Fixed.** Replaced with `useNavigate()`. |
| 5 | `fetchChat` was loaded via a dynamic `import()` inside `useChatStream`. | Low | **Fixed.** Converted to a static import — removes a needless round-trip. |
| 6 | `App.tsx` contained **two** `<Route path="*">` entries; the first always matched, making the second dead code. | Low | **Fixed.** Removed the duplicate and the now-unused `Navigate` import. |
| 7 | `.btn-primary:hover` was dropped when it was rewritten as `.btn-primary:hover:not(:disabled)`. | Medium — a lost selector, caught by the R1 inventory check | **Fixed.** Restored `.btn-primary:hover`. |
| 8 | `RegisterPage.tsx` imported `BRAND` without using it (`TS6133`). | Low | **Fixed.** Removed the import. |
| 9 | `useChats.ts` returned `[string, ChatSummary[]][]` where `ChatGroup[]` was expected (`TS2322`). | Low | **Fixed.** Added `.map(([label, items]) => ({ label, items }))`. |
| 10 | `LoginPage.tsx` hardcoded the string "LegalWave" instead of `BRAND.name` — a violation of FR-1.4. | Low | **Fixed.** Now uses `BRAND.name`. |
| **11** | **The lint count rose to 6 warnings — one above the baseline.** `react(set-state-in-effect)` on `useSidebarCollapse.ts`, caused by a redundant `setNarrow(mql.matches)` inside the `matchMedia` effect. The `narrow` state is already initialised from the same query in the `useState` initializer, so the call was pure duplication. | Low — but a baseline regression the plan requires investigating | **Fixed.** Removed the redundant call. The initial value and the `change` handler both read the same `MediaQueryList`, so behaviour is unchanged. Re-verified: **5 warnings / 0 errors**, build clean. |
| **12** | **`.shell` was declared twice in `features/chat/styles/chat.css`** after the collapse rules were added — the original `position:relative;isolation:isolate` rule and the new grid rule. Legal CSS (the later rule wins), but it splits the shell's layout definition across two blocks and risks a future edit landing in the wrong one. | Low — a maintainability trap, caught by the same-file repeat report | **Fixed.** Consolidated into a single `.shell` declaration carrying `position`, `isolation`, `display:grid`, `grid-template-columns`, `height`, and the transition. Same-file repeats went from 3 to 2 (the remaining two are in untouched files). |
| **13** | **The sidebar could be collapsed but never reopened.** The only toggle lived inside `.sidebar-head`, which the collapse CSS sets to `opacity:0; pointer-events:none`; the `.sidebar-rail` overlay had no toggle of its own. Reported by the user. | **High** — the feature was half-implemented | **Fixed.** Added a second toggle inside the rail (`.sidebar-toggle-collapsed`, glyph `»`) alongside the header toggle (`.sidebar-toggle-expanded`, glyph `«`). Exactly one is visible at a time; both keep `aria-expanded`, the dynamic `aria-label`/`title`, and `data-testid="sidebar-toggle-button"`. The collapse rules were retargeted from five per-child selectors to a single `.sidebar-panel` wrapper so the header's fade no longer swallows the rail's toggle. |
| **14** | **The collapsed rail showed a meaningless first-letter initial** per chat (`{(c.title \|\| 'Untitled').trim().slice(0, 1).toUpperCase()}`). Reported by the user. | Medium — a broken affordance | **Fixed.** Replaced the letter with an inline SVG chat-bubble glyph using `stroke="currentColor"`, so it inherits the existing design tokens and follows the active/inactive colour states. The `aria-label`/`title` still carry the full chat title. |
| **15** | **The collapsed panel stayed in the accessibility tree and the tab order.** The faded-out search box, chat entries, and sign-out button were still reachable by keyboard and screen readers. Found while fixing Finding 13. | Medium — an accessibility defect | **Fixed.** The panel content is wrapped in `.sidebar-panel` carrying `aria-hidden={collapsed}` and `inert={collapsed ? true : undefined}`. Because `inert` would also hide the panel on mobile — where the full panel must be visible regardless of the desktop preference — the hook now exposes `narrow` and `ChatPage` computes `railActive = collapsed && !narrow`. |
| **16** | **`Ctrl+B` did nothing below 768px.** The handler always toggled the desktop rail, but the rail does not exist at that width — the mobile drawer governs instead. Pre-existing, amplified by Finding 15's fix. | Low | **Fixed.** The handler now toggles the drawer when `narrow` and the rail otherwise, so the shortcut always does something visible. |
| **17** | **The rail's per-chat shortcuts carried no information.** Even with the chat-bubble icon replacing the letter initial, the rail rendered one identical glyph per recent chat. At 56px there is no room for a title, so the icons were indistinguishable and gave the user no way to tell the chats apart. Reported by the user: *"In collapsed mode no need to show chat icons."* | Medium — visual noise in the collapsed state | **Fixed.** The per-chat shortcut list was removed from the rail. It now carries only the controls that stay meaningful at 56px: the expand toggle (`»`), the brand logo, and the new-chat button (`+`). The dead `.rail-chats` / `.rail-chat*` CSS rules were removed too, and `rail-chat-<id>` no longer exists as a `data-testid`. The chat list is reached by expanding the sidebar. |

---

## Overall status

| Field | Value |
|---|---|
| **Build** | ✅ Success |
| **Static verification** | ✅ Pass — 12 / 12 |
| **Contract verification** | ✅ Pass |
| **Automated unit tests** | N/A — no test runner in the project (and adding one is forbidden by NFR-2.1) |
| **Manual integration / E2E** | ⏳ Awaiting execution — 21 scenarios, 92 checks |
| **Ready for Operations** | **Yes**, conditional on the manual checklist passing |

The code is complete, builds cleanly, and has passed every automated check available without a test runner. The remaining verification is inherently manual — it requires a browser and a running backend.

---

## Generated instruction files

| File | Contents |
|---|---|
| `build-instructions.md` | Prerequisites, build steps, expected output, artifact inventory, and troubleshooting for every failure mode encountered — including 5 new sidebar-collapse failure modes |
| `unit-test-instructions.md` | 10 static-verification checks (the unit-test substitute), pass criteria, and the highest-value targets if a test runner is added later |
| `integration-test-instructions.md` | 21 integration scenarios — 13 spanning the API contract, route guards, streaming, and graceful degradation; 8 new for the sidebar collapse |
| `performance-test-instructions.md` | 13 performance checks (8 automated, 5 manual) mapped to NFR-1.1–1.4 and NFR-3.1–3.3 |
| `e2e-test-instructions.md` | 92-check manual acceptance checklist across 10 sections (A–J) |
| `build-and-test-summary.md` | This document |

## Supporting artifacts

| File | Contents |
|---|---|
| `aidlc-docs/scripts/css-selector-inventory.txt` | The R1 mitigation record — the selector inventory diff and the 20-token verification, including the finding and fix for the cross-file duplication |
| `aidlc-docs/scripts/css-selector-check.py` | The re-runnable structural check script |
| `aidlc-docs/scripts/css-regression-check.py` | The R7 mitigation script — reconstructs the pre-collapse selector universe and proves no pre-existing selector was dropped |
| `aidlc-docs/construction/plans/frontend-code-generation-plan.md` | Unit 1's 12 steps, all marked `[x]`, with verification results annotated inline |
| `aidlc-docs/construction/plans/sidebar-collapse-code-generation-plan.md` | Unit 2's 9 steps (T1–T9), all marked `[x]`, with verification results annotated inline |
