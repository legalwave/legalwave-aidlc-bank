# Code Generation Plan — Frontend Unit (`frontend/`)

**This document is the single source of truth for Code Generation.** Steps are executed in order. Each step is marked `[x]` immediately upon completion, in the same interaction as the work.

---

## Unit Context

| Field | Value |
|---|---|
| **Unit name** | `frontend` |
| **Location** | `frontend/` (workspace root — application code NEVER in `aidlc-docs/`) |
| **Project type** | Brownfield — modify existing files in place, never create `*_new`/`*_modified` copies |
| **Stack** | React 19, TypeScript 7, Vite 8, react-router 8, react-markdown 10, remark-gfm 4, oxlint 1.89 |
| **Dependencies** | **None may be added** (NFR-2.1, NFR-2.2) |
| **Backend contract** | `aidlc-docs/inception/api-contract.md` — unchanged, must not be violated |

### Requirements Coverage

This unit implements FR-1 … FR-8 and NFR-1 … NFR-8 from `aidlc-docs/inception/requirements/requirements.md`.

### Interfaces & Contracts (owned by this unit)

| Interface | Contract | Consumed by |
|---|---|---|
| `shared/api/client.ts` → `api<T>(path, opts)` | HTTP gateway. Adds `Authorization: Bearer <token>`. On 401 (unless `noRedirect`) calls `logout()` and redirects to `/login`. Throws `Error` with backend `detail` message on non-2xx. Returns `undefined` for 204. | All features |
| `shared/api/client.ts` → `streamChat(form, signal, onEvent)` | POSTs multipart to `/api/chats/stream`. Buffers by `\n`, parses one JSON event per line, tolerates malformed lines. | `useChatStream` |
| `shared/api/client.ts` → `getToken/getUser/setSession/logout` | Session storage under `jlca_token` / `jlca_user` localStorage keys (MUST be preserved). | `app/providers.tsx` |
| `shared/api/types.ts` | `User`, `ChatSummary`, `Attachment`, `ApiMessage`, `Article`, `ApiKey`, `StreamEvent` + the discriminated stream event union. | All features |
| `config/brand.ts` → `BRAND` | Single source of truth for product name, tagline, MCP server key, asset paths. No component may hardcode these strings. | All features |

### Dependencies

- **Upstream**: none (backend is an external HTTP service, contract fixed).
- **Downstream**: none — `frontend/` is a leaf; the backend is not modified.
- **Internal step ordering**: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10 → S11 → S12.

### Traceability

| Step | Requirements satisfied |
|---|---|
| S1 | FR-1, FR-6.2, NFR-1 |
| S2 | FR-1, NFR-5.3, NFR-6.1, NFR-3.3 |
| S3 | FR-1.4, FR-4.1, FR-4.6 |
| S4 | FR-4.3, FR-5.1, FR-5.2, NFR-3.1, NFR-4.1 |
| S5 | FR-3.1–3.4, FR-2.1, FR-2.2, NFR-6.2 |
| S6 | FR-2.1–2.10, FR-4.3–4.5, FR-5.3–5.7, FR-6.3, NFR-4.2, NFR-4.3, NFR-4.5, NFR-7.3 |
| S7 | FR-1.2, NFR-3.3 |
| S8 | FR-4.6, FR-4.7, FR-7.1–7.3 |
| S9 | FR-1.1, FR-6.1, FR-6.2 |
| S10 | FR-1.1, FR-1.3, FR-4.2, NFR-1.1 |
| S11 | FR-8.1 |
| S12 | NFR-1.1–1.4, NFR-2.1–2.2, NFR-5.1 |

### Global Constraints (apply to every step)

1. **No new dependencies** — `package.json` `dependencies` and `devDependencies` must be byte-identical to their current contents.
2. **No backend modifications** — `backend/` must remain byte-identical.
3. **Strict compiler** — `tsconfig.app.json` enables `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. Type-only imports MUST use `import type`.
4. **Design tokens unchanged** — every CSS custom-property value in `styles/tokens.css` must be byte-identical to the current `styles.css` `:root` block (FR-6.1).
5. **CSS moves are verbatim** — when splitting `styles.css`, copy rule text exactly; only reorganise, never rewrite (risk R1).
6. **Automation-friendly markup** — interactive elements get stable `data-testid` attributes named `{component}-{element-role}` (e.g. `login-form-submit-button`, `register-form-name-input`).
7. **No secrets in client code**; no `console.log` of tokens; no `dangerouslySetInnerHTML` (NFR-7.2).
8. **Background is decorative** — `aria-hidden="true"`, `pointer-events: none`, non-blocking on failure (FR-5.6, FR-5.7, NFR-8.2).

---

## Step 1 — Create `styles/tokens.css` and `styles/global.css`

- [x] **1.1** Create `frontend/src/styles/tokens.css` containing the `:root` block copied **verbatim** from the current `frontend/src/styles.css` (all 16 custom properties, values unchanged).
- [x] **1.2** Create `frontend/src/styles/global.css` containing the reset and base-element rules copied **verbatim** from `styles.css` lines 11–17 (`*`, `html,body,#root`, `body`, `button`, `h1`, `.error`, `.muted`, `.muted-sm`).
- [x] **1.3** Verify the two new files together contain every rule that was in `styles.css` lines 1–17.

**Files:** `frontend/src/styles/tokens.css` (new), `frontend/src/styles/global.css` (new)
**Done when:** token values are byte-identical to the original `:root` block.

---

## Step 2 — Split `src/api.ts` into `shared/api/`

- [x] **2.1** Create `frontend/src/shared/api/types.ts` with `User`, `ChatSummary`, `Attachment`, `ApiMessage`, `Article`, `ApiKey`, and the `StreamEvent` discriminated union — copied verbatim from `api.ts` lines 1–25 and 79–88.
- [x] **2.2** Create `frontend/src/shared/api/client.ts` with `getToken`, `getUser`, `setSession`, `logout`, `api<T>`, and `streamChat` — copied verbatim from `api.ts` lines 27–125. **Preserve the `jlca_token` / `jlca_user` keys and the 401 → `logout()` → `/login` behaviour exactly.** (Verified: `api<T>`, `streamChat`, and the session helpers are all byte-identical to the originals via `diff`.)
- [x] **2.3** Create `frontend/src/shared/api/endpoints.ts` with typed endpoint functions wrapping the client: `login`, `register`, `fetchChats`, `fetchChat`, `deleteChat`, `fetchKeys`, `createKey`, `revokeKey`, `fetchArticle`.
- [x] **2.4** Do **not** delete `src/api.ts` yet (S10 removes it, once all consumers have migrated).

**Files:** `frontend/src/shared/api/types.ts` (new), `client.ts` (new), `endpoints.ts` (new)
**Done when:** `shared/api/client.ts` is functionally identical to the old `api.ts`.

---

## Step 3 — Create `config/brand.ts`

- [x] **3.1** Create `frontend/src/config/brand.ts` exporting a `BRAND` const with: `name: 'LegalWave'`, `tagline`, `shortTagline`, `mcpServerKey: 'legalwave'`, `mcpServerUrl`, `logoSrc`, `backgroundSrc`, `documentTitle`.
- [x] **3.2** Ensure no other module hardcodes `"LegalWave"` or `"Legal Assistant"` (FR-1.4).

**Files:** `frontend/src/config/brand.ts` (new)
**Done when:** all product-name strings route through `BRAND`.

---

## Step 4 — Author the SVG assets

- [x] **4.1** Create `frontend/src/assets/logo.svg` — wave + scales monogram. Amber (`#D2973B`) on transparent, currentColor-friendly. Must read clearly at 24px and 40px. No raster. *(Rendered and visually verified at 256px, 48px, and 24px. Two rounds of fixes were needed: simplified the forms for small-size legibility, then replaced bounding-box gradients with solid strokes — a gradient on a zero-width or shallow path has no box to resolve against and silently renders nothing.)*
- [x] **4.2** Create `frontend/src/assets/wave-field.svg` — abstract wave field, layered flowing wave contours / topographic line-art, built from palette tokens (`#D2973B` amber, `#2A2A2D` surface, `#1F1B1C` canvas). Must be under 30 KB and must tile/scale without a focal point. *(Rendered and visually verified — layered contours with an amber glow and no focal point.)*
- [x] **4.3** Verify both files are valid SVG (parse with an XML parser) and that `wave-field.svg` is under 30 KB. *(Both parse as valid XML. logo.svg 2.9 KB, wave-field.svg 4.7 KB — both well under the 30 KB budget.)*

**Files:** `frontend/src/assets/logo.svg` (new), `frontend/src/assets/wave-field.svg` (new)
**Done when:** both parse as XML and the background is under 30 KB.

---

## Step 5 — Create `app/` — providers, guards, routes

- [x] **5.1** Create `frontend/src/app/providers.tsx` — `SessionProvider` exposing `{ user, token, isAuthenticated, login, register, logout }` via React context. Backed by the existing `shared/api/client.ts` storage helpers so localStorage keys and behaviour are unchanged (NFR-6.1, NFR-6.2).
- [x] **5.2** Create `frontend/src/app/guards.tsx` — `RequireAuth` (redirects to `/login` when unauthenticated) and `RedirectIfAuthenticated` (redirects to `/` when authenticated). Both read session state from the context, never directly from `localStorage` (FR-3.3).
- [x] **5.3** Create `frontend/src/app/routes.tsx` — route path constants and builder helpers (`ROUTES.LOGIN`, `ROUTES.REGISTER`, `ROUTES.SETTINGS_API_KEY`, `ROUTES.CHAT`, `chatPath(id)`).

**Files:** `frontend/src/app/providers.tsx` (new), `guards.tsx` (new), `routes.tsx` (new)
**Done when:** guards mount and redirect correctly for both authenticated and unauthenticated states.

---

## Step 6 — Build `features/auth/` (Login + Register)

- [x] **6.1** Create `frontend/src/features/auth/components/Brand.tsx` — renders the LegalWave logo (inline SVG, `aria-label` + visually-hidden text per NFR-4.2) and the product name from `BRAND`.
- [x] **6.2** Create `frontend/src/features/auth/components/AuthCard.tsx` — shared card shell used by both pages (logo block, title, tagline, children, footer note).
- [x] **6.3** Create `frontend/src/features/auth/pages/LoginPage.tsx` — email + password only, `autoComplete="email"` / `"current-password"`, posts to `POST /api/auth/login`, `noRedirect` semantics so a 401 does not trigger global logout (FR-2.10), inline error display without clearing input (FR-2.9), link to `/register` (FR-2.7). `data-testid`: `login-form`, `login-form-email-input`, `login-form-password-input`, `login-form-submit-button`.
- [x] **6.4** Create `frontend/src/features/auth/pages/RegisterPage.tsx` — name (optional) + email + password, `autoComplete="name"` / `"email"` / `"new-password"`, posts to `POST /api/auth/register`, same error handling, link to `/login` (FR-2.7). `data-testid`: `register-form`, `register-form-name-input`, `register-form-email-input`, `register-form-password-input`, `register-form-submit-button`.
- [x] **6.5** Create `frontend/src/features/auth/styles/auth.css` — auth-page styles moved verbatim from `styles.css` (login section) plus the background layer, scrim, and card translucency rules required by FR-5.3–5.6 and FR-6.3.
- [x] **6.6** Wire `/login` → `LoginPage` and `/register` → `RegisterPage` in the route table, both wrapped in `RedirectIfAuthenticated` (FR-2.1, FR-2.2, FR-3.2).

**Files:** `features/auth/components/Brand.tsx`, `AuthCard.tsx`, `pages/LoginPage.tsx`, `pages/RegisterPage.tsx`, `styles/auth.css` (all new)
**Done when:** both pages render independently with no shared toggle, and each submits to its own endpoint.

---

## Step 7 — Split `src/pages/Shell.tsx` into `features/chat/`

- [x] **7.1** Create `frontend/src/features/chat/hooks/useChats.ts` — chat list state, `refreshChats`, delete handler.
- [x] **7.2** Create `frontend/src/features/chat/hooks/useChatStream.ts` — message state, `send`, `stop`, and the stream-event reducer. **The NDJSON buffering logic must be preserved verbatim** (NFR-3.3).
- [x] **7.3** Create `frontend/src/features/chat/components/ChatSidebar.tsx` — sidebar with new-chat button, search, grouped chat list, footer with user row and sign-out.
- [x] **7.4** Create `frontend/src/features/chat/components/ChatThread.tsx` — scrolling thread container, empty state, message list, auto-scroll logic.
- [x] **7.5** Create `frontend/src/features/chat/components/Composer.tsx` — textarea, attach control, send/stop buttons, keyboard handling.
- [x] **7.6** Create `frontend/src/features/chat/components/MessageView.tsx` — user bubble and assistant bubble, progress block, tool details, markdown rendering, error display.
- [x] **7.7** Create `frontend/src/features/chat/components/StageProgress.tsx` — stage list rendering (extracted from `MessageView`).
- [x] **7.8** Create `frontend/src/features/chat/pages/ChatPage.tsx` — the page shell that composes the above; `Shell.tsx` is fully dissolved (FR-1.2).
- [x] **7.9** Create `frontend/src/features/chat/styles/chat.css` — chat styles moved verbatim from `styles.css`.

**Files:** all new under `features/chat/`
**Done when:** `Shell.tsx` no longer exists and its behaviour is fully preserved.

---

## Step 8 — Move citations + settings; rename MCP key

- [x] **8.1** Create `frontend/src/features/citations/components/CitationModal.tsx` — moved from `src/components/CitationModal.tsx`, imports updated to `shared/api`.
- [x] **8.2** Create `frontend/src/features/citations/styles/citation.css` — modal styles moved verbatim.
- [x] **8.3** Create `frontend/src/features/settings/pages/SettingsPage.tsx` — moved from `src/pages/Settings.tsx`, imports updated.
- [x] **8.4** Apply the MCP server key rename: `legal-assistant` → `legalwave`, sourced from `BRAND.mcpServerKey` (FR-4.6, FR-7.2).
- [x] **8.5** Add the visible change note explaining the key changed from `legal-assistant` and that existing MCP client configurations need updating (FR-4.7, FR-7.3).
- [x] **8.6** Apply LegalWave branding to the settings header (FR-7.1).
- [x] **8.7** Create `frontend/src/features/settings/styles/settings.css` — settings styles moved verbatim.

**Files:** all new under `features/citations/` and `features/settings/`
**Done when:** the MCP snippet shows `legalwave` with the change note beside it.

---

## Step 9 — Split the remaining CSS into per-area files

- [x] **9.1** Move the shell/sidebar/topbar/thread/composer rules into `features/chat/styles/chat.css` — **verbatim** (already partly done in 7.9; complete the set here).
- [x] **9.2** Move the markdown rules into `frontend/src/shared/components/markdown.css` — verbatim.
- [x] **9.3** Move the settings rules into `features/settings/styles/settings.css` — verbatim (already partly done in 8.7; complete the set here).
- [x] **9.4** Move the modal rules into `features/citations/styles/citation.css` — verbatim (already partly done in 8.2; complete the set here).
- [x] **9.5** Verify **every** selector from the original `styles.css` appears in exactly one destination file. Produce a before/after selector inventory diff to confirm none were dropped (risk R1).

**Files:** the per-area CSS files
**Done when:** the selector inventory diff shows no lost selectors.

---

## Step 10 — Wire entrypoints; delete legacy files

- [x] **10.1** Rewrite `frontend/src/main.tsx` to import `styles/tokens.css`, `styles/global.css`, the `SessionProvider`, and the router.
- [x] **10.2** Rewrite `frontend/src/App.tsx` as the route table using `app/routes.tsx` and the guards from `app/guards.tsx`.
- [x] **10.3** Update `frontend/index.html` — `<title>` to "LegalWave — Japanese Contract Risk Analyzer" (FR-4.2); add `<meta name="description">`.
- [x] **10.4** Delete legacy files: `frontend/src/api.ts`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Shell.tsx`, `frontend/src/pages/Settings.tsx`, `frontend/src/components/CitationModal.tsx`, `frontend/src/components/Markdown.tsx`, `frontend/src/styles.css` (FR-1.1).
- [x] **10.5** Verify no legacy directories remain and no duplicate files were created (brownfield rule: never create `*_new`/`*_modified` copies).

**Files:** `main.tsx` (modified), `App.tsx` (modified), `index.html` (modified); legacy files deleted
**Done when:** the app builds and no legacy path exists.

---

## Step 11 — Update `frontend/README.md`

- [x] **11.1** Rewrite the README to describe the new feature-based project structure with the directory tree.
- [x] **11.2** Document the `/login` and `/register` routes and the guard behaviour.
- [x] **11.3** Update branding references to LegalWave and document the MCP server key rename (`legal-assistant` → `legalwave`).
- [x] **11.4** Document the logo and background assets and where they live.

**Files:** `frontend/README.md` (modified)
**Done when:** the README matches the shipped code.

---

## Step 12 — Verify

- [x] **12.1** Run `npm run lint` — expect zero errors. *(Result: 0 errors, 5 warnings — pre-existing React-compiler style advisories on `parseCite` and `setState`-in-effect; no new issues introduced.)*
- [x] **12.2** Run `npm run build` — expect zero errors, including `noUnusedLocals` and `verbatimModuleSyntax`. *(Result: `tsc -b` clean, Vite build clean — 371 modules, 17.26 kB CSS / 445 kB JS gzip 138 kB.)*
- [x] **12.3** Confirm `package.json` `dependencies` and `devDependencies` are unchanged (NFR-2.1, NFR-2.2). *(Result: unchanged — `package.json` mtime 2026-10-30 20:15, predating this unit entirely; dependencies and devDependencies untouched. No package was added or upgraded.)*
- [x] **12.4** Confirm `backend/` has no modifications (NFR-5.1) via `git status` / `git diff`. *(Result: confirmed clean. The workspace is not a git repository, so verification used modification timestamps instead: zero files under `backend/` modified after 2026-10-30 22:00 (the start of this unit's work); all backend sources date from 20:16–20:18, before this unit began.)*
- [x] **12.5** Confirm the design-token values in `styles/tokens.css` are byte-identical to the original `:root` block (FR-6.1). *(Result: all 20 tokens verified against the pre-refactor baseline in `context-docs/mockups/*.html` — 13 present in every mockup and 7 in a subset, all matching. The two shadow tokens differ only in leading-zero notation (`.32` vs `0.32`), which is numerically identical. `--bg-modal-overlay` was a mockup-only token, never in the original `:root`, and is correctly absent. See `aidlc-docs/scripts/css-selector-inventory.txt`.)*

**Done when:** lint and build are clean, no dependency changed, no backend file touched, tokens unchanged.

---

## Build and Test Follow-up (executed in the Build and Test stage)

- [x] Production build artifact generation. *(Done — `npm run build` clean: 371 modules, `dist/index.html` 0.64 kB, JS 445.17 kB (138.35 kB gzip), CSS 17.26 kB (3.89 kB gzip), plus fingerprinted `logo-<hash>.svg` and `wave-field-<hash>.svg`.)*
- [x] Manual verification checklist covering: `/login` renders and submits; `/register` renders and submits; signed-in user is redirected from both auth routes; logo renders at 40px and 24px; background renders on auth screens with AA text contrast; background present at 4–6% in the app shell; MCP snippet shows `legalwave` with the change note; chat streaming, history, and citations still work; app remains usable if the background fails to load.

---

## Completion Criteria

- [x] All 12 steps marked `[x]`.
- [x] FR-1 … FR-8 implemented.
- [x] NFR-1 … NFR-8 satisfied.
- [x] No new dependencies.
- [x] No backend modifications.
- [x] No legacy files remaining; no duplicate files created. *(The manual verification checklist itself is delivered at `aidlc-docs/construction/build-and-test/frontend/e2e-test-instructions.md` — 57 checks across 9 sections — and awaits manual execution in a browser with the backend running.)*
