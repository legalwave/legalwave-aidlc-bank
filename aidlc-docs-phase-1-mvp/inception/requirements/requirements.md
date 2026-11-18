# Requirements — LegalWave Frontend Rebrand & Modular Restructure

## Intent Analysis

| Field | Value |
|---|---|
| **User request** | "excellent work. mvp has been done. Now implement these requirements in frontend. Transform the frontend project structure modular (standard). Currently, single '/login' path handle both login and register. So, include register path as well. I want it to name as LegalWave. Add artistic background image suitable with the current design. Add suitable logo." |
| **Request type** | Enhancement (rebrand + new route) combined with Refactoring (modular restructure) |
| **Scope estimate** | Multiple Components — the entire `frontend/` application surface. Backend untouched. |
| **Complexity estimate** | Moderate — no new backend contracts, no new dependencies, but every route and surface is touched |
| **Requirements depth** | Standard |
| **Workspace** | Brownfield — `frontend/`, React 19 + TypeScript + Vite 8 + react-router 8, MVP already complete against `aidlc-docs/inception/api-contract.md` |

## Summary of Approved Decisions

All 13 clarifying questions were answered with the recommended options (user: "approved").

| # | Topic | Decision |
|---|---|---|
| 1 | Logo style | A — wave + scales monogram, inline SVG |
| 2 | Background scope | B — auth screens + subtle workspace texture |
| 3 | Background motif | A — abstract wave field (layered line-art) |
| 4 | Image production | A — hand-authored SVG committed to repo |
| 5 | Structure depth | B — feature-based, deep (hooks + decomposed Shell) |
| 6 | CSS organization | A — per-area CSS files imported by owning components |
| 7 | Route guards | A — symmetric auto-redirect when already signed in |
| 8 | Rename blast radius | C — rename MCP key to `legalwave` + add change note |
| 9 | Design preservation | B — keep all colour tokens; refine surfaces only |
| 10 | Verification | C — type-check + lint + build + manual verification checklist |
| 11 | Security extension | A — keep prior opt-out (unchanged threat model) |
| 12 | Resiliency extension | A — skip (graceful degradation still applied) |
| 13 | PBT extension | A — skip |

---

## Functional Requirements

### FR-1 — Modular Project Structure

The frontend shall be reorganised from a flat `src/` layout into a feature-based, layered structure.

**Target structure:**

```
frontend/src/
├── app/
│   ├── App.tsx                    # route table
│   ├── routes.tsx                 # route constants + path builders
│   ├── guards.tsx                 # RequireAuth, RedirectIfAuthenticated
│   └── providers.tsx              # session/auth context provider
├── config/
│   └── brand.ts                   # BRAND constants (name, tagline, MCP server key)
├── features/
│   ├── auth/
│   │   ├── components/            # AuthCard, Brand
│   │   ├── hooks/useAuthSession.ts
│   │   ├── pages/LoginPage.tsx
│   │   ├── pages/RegisterPage.tsx
│   │   └── styles/auth.css
│   ├── chat/
│   │   ├── components/            # ChatSidebar, ChatThread, Composer, MessageView, StageProgress
│   │   ├── hooks/useChats.ts
│   │   ├── hooks/useChatStream.ts
│   │   ├── pages/ChatPage.tsx
│   │   └── styles/chat.css
│   ├── citations/
│   │   ├── components/CitationModal.tsx
│   │   └── styles/citation.css
│   └── settings/
│       ├── pages/SettingsPage.tsx
│       └── styles/settings.css
├── shared/
│   ├── api/
│   │   ├── client.ts              # fetch wrapper, auth headers, error handling
│   │   ├── endpoints.ts           # typed endpoint functions
│   │   └── types.ts               # all API/domain types
│   ├── components/                # Markdown renderer, shared primitives
│   ├── hooks/                     # generic hooks
│   └── utils/                     # format, group, parse helpers
├── assets/
│   ├── logo.svg                   # LegalWave wave+scales mark
│   └── wave-field.svg             # abstract wave field background
├── styles/
│   ├── tokens.css                 # all CSS custom properties (palette)
│   └── global.css                 # reset + base element styles
├── main.tsx
└── App.tsx                        # thin re-export for entrypoint
```

**Acceptance criteria:**
- FR-1.1 — No source file remains in the legacy flat locations (`src/pages/`, `src/components/` at root, `src/api.ts`, `src/styles.css`).
- FR-1.2 — `Shell.tsx` no longer exists; its responsibilities are split across `ChatPage` and the `features/chat/components/` set.
- FR-1.3 — Every import path resolves with no aliased or relative-path hacks; no `../../..` chains deeper than two levels.
- FR-1.4 — `config/brand.ts` is the single source of truth for the product name — no hardcoded "LegalWave" or "Legal Assistant" string in any component.
- FR-1.5 — The backend directory is unmodified by this work.

### FR-2 — Separate `/register` Route

- FR-2.1 — A dedicated `RegisterPage` shall be served at `/register`.
- FR-2.2 — A dedicated `LoginPage` shall be served at `/login`.
- FR-2.3 — Neither page shall use a shared boolean toggle to switch modes; each owns its own form and submits to its own endpoint.
- FR-2.4 — `RegisterPage` shall submit `POST /api/auth/register` with `{ email, password, name? }`.
- FR-2.5 — `LoginPage` shall submit `POST /api/auth/login` with `{ email, password }`.
- FR-2.6 — On success, both pages shall store the session (`access_token` + `user`) and navigate to `/`, replacing history.
- FR-2.7 — `LoginPage` shall contain a link to `/register`; `RegisterPage` shall contain a link to `/login`.
- FR-2.8 — The `name` field shall appear on the register form only, with `autoComplete="name"`. The login form shall use `autoComplete="current-password"`; register shall use `"new-password"`.
- FR-2.9 — Server-side errors (e.g. 409 "Email already registered") shall be displayed inline in the form without clearing the user's typed input.
- FR-2.10 — Auth failures shall use `noRedirect` semantics so a 401 on `/api/auth/login` does not trigger the global logout-and-redirect handler.

### FR-3 — Route Guards

- FR-3.1 — A `RequireAuth` guard shall wrap all protected routes; unauthenticated access redirects to `/login`.
- FR-3.2 — A `RedirectIfAuthenticated` guard shall wrap both `/login` and `/register`; a signed-in user is redirected to `/`.
- FR-3.3 — Both guards shall read session state from a single shared source (the auth session context), not from separate `localStorage` reads.
- FR-3.4 — `logout()` shall clear the session and redirect to `/login`.

### FR-4 — LegalWave Branding

- FR-4.1 — The product shall be named **LegalWave** in all user-visible surfaces.
- FR-4.2 — `index.html` `<title>` shall be "LegalWave — Japanese Contract Risk Analyzer".
- FR-4.3 — A **wave + scales monogram logo** shall be authored as inline SVG, used at two sizes: 40px (auth screens) and 24px (app chrome). It shall render crisply at both and use the existing amber accent.
- FR-4.4 — The logo shall be exposed as a reusable React component (`features/auth/components/Brand.tsx` or `shared/components/Logo.tsx`) rather than duplicated markup.
- FR-4.5 — The former `律` kanji mark shall be removed entirely.
- FR-4.6 — The MCP server key in the settings snippet shall be renamed `legal-assistant` → `legalwave`.
- FR-4.7 — The settings UI shall display a note explaining that the MCP server key changed and existing client configurations must be updated to use `legalwave`.
- FR-4.8 — The frontend `README.md` shall be updated to reflect the LegalWave name and the new project structure.

### FR-5 — Artistic Background Image

- FR-5.1 — An **abstract wave field** background shall be authored as SVG (layered flowing wave contours / topographic line-art) and committed to the repo.
- FR-5.2 — The artwork shall be drawn from the existing palette tokens — amber `#D2973B`, surface `#2A2A2D`, canvas `#1F1B1C` — so it integrates with the design system rather than approximating it.
- FR-5.3 — The background shall appear **full-bleed on `/login` and `/register`**, behind the auth card.
- FR-5.4 — A dark gradient scrim shall be layered over the artwork so the auth card and its text maintain WCAG AA contrast (≥4.5:1 for body text, ≥3:1 for large text).
- FR-5.5 — The same artwork shall appear in the app shell at **low opacity (approximately 4–6%)** so branding is consistent without impairing chat readability.
- FR-5.6 — The background shall be decorative only: it shall carry `aria-hidden="true"` and shall never intercept pointer events.
- FR-5.7 — The background shall degrade gracefully — if the SVG fails to load, the underlying solid `--bg-canvas` shall remain and the app shall be fully functional.

### FR-6 — Design Preservation & Surface Refinement

- FR-6.1 — All existing colour tokens, the serif/sans type stacks, spacing rhythm, and severity colours (`RED`/`YELLOW`/`GREEN` → `#C97064`/`#D2973B`/`#6FA08A`) shall remain **unchanged in value**.
- FR-6.2 — Token definitions shall move to `styles/tokens.css` without altering any value.
- FR-6.3 — Surface refinements are permitted **only** on surfaces the new background directly touches:
  - Auth card: semi-transparent surface with a backdrop blur, so the background reads through it.
  - App shell: the background layer beneath existing flat surfaces.
  - Logo placement: sized and spaced consistently across auth and app chrome.
- FR-6.4 — No layout, component, or spacing change shall be made to the chat thread, message bubbles, composer, sidebar, modal, or settings content beyond what FR-6.3 explicitly permits.

### FR-7 — Settings Page Update

- FR-7.1 — The settings page shall use the LegalWave branding in its header.
- FR-7.2 — The MCP quick-start snippet shall use the `legalwave` server key.
- FR-7.3 — A visible note shall accompany the snippet stating the key changed from `legal-assistant` and that existing MCP client configurations need updating.

### FR-8 — Documentation

- FR-8.1 — `frontend/README.md` shall describe the new project structure, the `/login` and `/register` routes, and the LegalWave branding.
- FR-8.2 — `aidlc-docs/inception/requirements/mvp-requirements.md` (the MVP requirements) shall remain untouched; this document is additive.

---

## Non-Functional Requirements

### NFR-1 — Build & Type Integrity
- NFR-1.1 — `npm run build` (`tsc -b && vite build`) shall complete with zero errors.
- NFR-1.2 — `npm run lint` (`oxlint`) shall report zero errors.
- NFR-1.3 — `tsconfig.app.json`'s `noUnusedLocals` and `noUnusedParameters` shall remain enabled and shall pass — unused imports left behind by the restructure are errors, not warnings.
- NFR-1.4 — `verbatimModuleSyntax` compliance shall be maintained — type-only imports must use `import type`.

### NFR-2 — No New Runtime Dependencies
- NFR-2.1 — No new `dependencies` shall be added to `frontend/package.json`.
- NFR-2.2 — No new `devDependencies` shall be added (Question 10 chose build + checklist, not a test runner).
- NFR-2.3 — The logo and background shall be SVG assets and inline SVG components — no image-processing libraries.

### NFR-3 — Performance
- NFR-3.1 — The background artwork shall be vector-based and under 30 KB uncompressed.
- NFR-3.2 — The workspace background layer shall not cause visible scroll jank — it shall be a fixed-position, `pointer-events: none` layer, not a repeating tiled background on a scrolling element.
- NFR-3.3 — The rebrand shall not regress streaming responsiveness in the chat thread. The existing NDJSON buffering logic shall be preserved verbatim in its extracted hook.

### NFR-4 — Accessibility
- NFR-4.1 — The background shall be `aria-hidden` and non-interactive.
- NFR-4.2 — The logo shall have accessible text (via `aria-label` on the SVG or visually-hidden text), not be an unlabelled graphic.
- NFR-4.3 — Auth form fields shall retain their `<label htmlFor>` associations and `autoComplete` attributes.
- NFR-4.4 — Keyboard focus states shall remain visible on all interactive elements.
- NFR-4.5 — Error messages shall be conveyed as text, not colour alone.

### NFR-5 — Backend Contract Stability
- NFR-5.1 — No backend file shall be modified.
- NFR-5.2 — The frontend shall continue to consume the endpoints exactly as specified in `aidlc-docs/inception/api-contract.md`.
- NFR-5.3 — All API calls shall continue to route through the single `shared/api/client.ts` wrapper, preserving the existing 401 → logout → `/login` behaviour.

### NFR-6 — Session Management
- NFR-6.1 — The `localStorage` keys `jlca_token` and `jlca_user` shall be preserved, so existing sessions survive the upgrade.
- NFR-6.2 — Session state shall be exposed through a React context so guards and pages share one source of truth.

### NFR-7 — Security Posture (unchanged)
- NFR-7.1 — The security baseline extension remains opted out (unchanged threat model — no new endpoints, no new data handling, no new dependencies).
- NFR-7.2 — The restructure shall not weaken existing protections: no secrets introduced into client code, no console logging of tokens, no `dangerouslySetInnerHTML` introduced.
- NFR-7.3 — The register endpoint's 409 response shall be surfaced to the user as a friendly message, not a raw stack trace.

### NFR-8 — Resiliency Posture (limited)
- NFR-8.1 — The resiliency baseline extension is skipped as a formal discipline.
- NFR-8.2 — Graceful degradation is nevertheless applied to the decorative background per FR-5.7 — background failure must never block the app.

---

## Constraints & Out of Scope

**In scope:** everything under `frontend/`, plus `aidlc-docs/` documentation updates.

**Out of scope:**
- Backend changes of any kind.
- New features beyond branding, routing, and structure.
- A test framework or automated test suite.
- Dependency upgrades (React, Vite, react-router, etc. remain at current versions).
- A general visual redesign — the palette, type scale, and layout are frozen per FR-6.
- CI/CD pipeline changes.
- Mobile-native layouts (the app remains responsive web).

---

## Traceability

| Requirement | Source | Verified by |
|---|---|---|
| FR-1 | Q5, Q6 — modular structure | Build + lint pass; directory listing |
| FR-2 | User request — separate register path | Manual checklist: both routes render and submit |
| FR-3 | Q7 — route guards | Manual checklist: signed-in user redirected from `/login` and `/register` |
| FR-4 | User request — LegalWave name + logo | Manual checklist: no "Legal Assistant" string remains |
| FR-5 | User request — artistic background | Manual checklist: background on auth screens + workspace |
| FR-6 | Q9 — design preservation | Manual checklist + unchanged token values |
| FR-7 | Q8 — MCP key rename | Manual checklist: snippet shows `legalwave` + note |
| FR-8 | Q8 — documentation | README review |
| NFR-1 | Q10 — verification | `tsc -b`, `oxlint`, `vite build` |
| NFR-2 | Q10 — no test runner | `package.json` diff shows no dependency change |
| NFR-3 | Q2 — background integration | Manual checklist: scroll remains smooth |
| NFR-4 | Implied by Q2/Q9 | Manual checklist: contrast + focus states |
| NFR-5 | Contract in `api-contract.md` | No backend diff |
| NFR-6 | Q7 — guard redesign | Manual checklist: existing session survives upgrade |
| NFR-7 | Q11 — security opt-out | Code review: no secrets logged, no `dangerouslySetInnerHTML` |
| NFR-8 | Q12 — resiliency skip | Manual checklist: app usable if background fails to load |
