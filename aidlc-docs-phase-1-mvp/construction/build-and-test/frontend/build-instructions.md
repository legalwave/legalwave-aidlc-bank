# Build Instructions — LegalWave Frontend

> **This document covers the `frontend/` unit only.** For the standalone `responsive-auth` design unit (a single self-contained HTML file), see the sibling `responsive-auth-*.md` files in this directory.


**Scope**: the `frontend/` unit of the LegalWave MVP (React SPA). The backend is an external HTTP service and is **not** built or modified by this unit.

**Last updated**: 2026-10-30 — refreshed for the sidebar collapse feature (unit 2).

---

## Prerequisites

| Item | Value |
|---|---|
| **Build tool** | Vite 8.3.5 (bundler) + TypeScript 7.0.2 (`tsc -b`) |
| **Runtime** | Node.js 20.19+ (tested on 24), npm |
| **Package manager** | npm (lockfile `frontend/package-lock.json` committed) |
| **Dependencies** | `react` 19.3.1, `react-dom` 19.3.1, `react-markdown` 10.1.0, `react-router` 8.5.1, `remark-gfm` 4.0.1 |
| **Dev dependencies** | `@types/node` 24.19.2, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `@vitejs/plugin-react` 6.1.2, `oxlint` 1.89.0, `typescript` 7.0.2, `vite` 8.3.5 |
| **Environment variables** | `VITE_BACKEND_URL` — optional. Defaults to `http://localhost:8000`. |
| **System requirements** | Any OS; ~200 MB disk for `node_modules`; ~2 GB RAM for the Vite build |

**No new dependencies may be added.** The dependency set is fixed by NFR-2.1 / NFR-2.2 and was verified unchanged during verification step 12.3.

---

## Build steps

### 1. Install dependencies
```bash
cd frontend
npm install
```
`npm ci` is preferable when `package-lock.json` is present and in sync — it guarantees the exact locked tree.

### 2. Configure environment
```bash
# Default: backend on http://localhost:8000 (no configuration needed)
# Override to a different host/port:
export VITE_BACKEND_URL=http://localhost:8001
```
`frontend/vite.config.ts` proxies both `/api` and `/mcp` to this target. The backend's CORS configuration allows origins `5173`–`5180`.

### 3. Build the frontend
```bash
cd frontend
npm run build
```
This runs `tsc -b && vite build`:
1. `tsc -b` — TypeScript project build. `tsconfig.app.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. Any unused import, a value import used only as a type, or an unerasable TS syntax is a **build error**.
2. `vite build` — bundles to `frontend/dist/`.

### 4. Verify build success

**Expected output**
```
vite v8.3.5 building client environment for production...
transforming...
✓ 372 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                        0.64 kB │ gzip:   0.38 kB
dist/assets/logo-<hash>.svg            2.94 kB │ gzip:   1.11 kB
dist/assets/wave-field-<hash>.svg      4.85 kB │ gzip:   1.55 kB
dist/assets/index-<hash>.css           21.26 kB │ gzip:   4.53 kB
dist/assets/index-<hash>.js           447.65 kB │ gzip: 139.05 kB
✓ built in ~340ms
```

> **Module count note**: 372 modules, not the 371 of the previous unit. The sidebar collapse feature added one new module — `features/chat/hooks/useSidebarCollapse.ts`. The CSS bundle grew from 17.26 kB to 21.26 kB (gzip 3.89 → 4.53 kB) for the collapse, rail, drawer, and reduced-motion rules; the JS bundle grew by ~2.5 kB raw / ~0.7 kB gzip for the hook.

**Build artifacts** (all under `frontend/dist/`)
| Artifact | Purpose |
|---|---|
| `index.html` | SPA entry point; `<title>` is "LegalWave — Japanese Contract Risk Analyzer" |
| `assets/index-<hash>.js` | Application bundle |
| `assets/index-<hash>.css` | Concatenated stylesheet (all 7 CSS modules) |
| `assets/logo-<hash>.svg` | Fingerprinted LegalWave logo |
| `assets/wave-field-<hash>.svg` | Fingerprinted background artwork |

Both SVGs must appear in `dist/assets/`. If they are missing, `config/brand.ts` is not resolving them through `import.meta.url`.

**Common warnings (acceptable)**
- `oxlint` reports 5 React-compiler style advisories (`react(only-export-components)` on `Markdown.tsx`, `react(set-state-in-effect)` in `useChatStream.ts`). These are **warnings, not errors**, and are pre-existing — they do not fail the build.
- The baseline is **exactly 5 warnings / 0 errors**. The sidebar collapse feature initially added a 6th (`react(set-state-in-effect)` on `useSidebarCollapse.ts`, from a redundant `setNarrow()` call inside the `matchMedia` effect). It was removed — the state is already initialised from the same query — bringing the count back to 5. See `unit-test-instructions.md` check A2.

### 5. Serve the production build
```bash
cd frontend
npm run preview     # serves dist/ on the Vite preview port
```

### 6. Run the development server
```bash
cd frontend
npm run dev         # http://localhost:5173 (next free port if 5173 is taken)
```

---

## Verification commands

| Check | Command | Expected |
|---|---|---|
| Type-check + bundle | `npm run build` | exit 0, no TS errors |
| Lint | `npm run lint` | `Found 5 warnings and 0 errors` |
| CSS selector integrity | `python3 aidlc-docs/scripts/css-selector-check.py` | `selectors defined in more than one file: 0` |
| CSS regression (no selector lost) | `python3 aidlc-docs/scripts/css-regression-check.py` | `pre-change selectors LOST : 0` |

> **Note on paths**: the two Python checks glob `frontend/src/**/*.css` relative to the **repository root**, so run them from there. `css-selector-check.py` prints its per-file byte sizes and selector counts; `css-regression-check.py` reconstructs the pre-collapse selector universe by subtracting the feature's 31 new selectors and reports any pre-change selector that has disappeared.

---

## Troubleshooting

### Build fails with "Cannot find module './api'" or similar
A legacy import survived the S10 deletion of `src/api.ts`, `src/styles.css`, `src/pages/`, and `src/components/`.
**Fix**: update the import to the new location — `shared/api/endpoints.ts` for API calls, `shared/api/types.ts` for types, and the per-feature `styles/*.css` for styles.

### Build fails with `TS6133: 'X' is declared but its value is never read`
`noUnusedLocals` is on. A leftover import after the restructure.
**Fix**: delete the import. If it is a type used only in type position, change it to `import type { X } from '...'`.

### Build fails with `TS2322` on a tuple/array type
Usually a `useMemo` returning a tuple where an object type is expected.
**Fix**: map the tuple to an object — e.g. `.map(([label, items]) => ({ label, items }))` (this exact pattern is used in `features/chat/hooks/useChats.ts`).

### Build fails with `TS1287` or "not allowed with `erasableSyntaxOnly`"
TypeScript-only runtime syntax (enums, parameter properties, namespaces) was introduced.
**Fix**: rewrite using plain objects, `const` objects, or type aliases.

### The logo or background does not render
**Cause**: an SVG uses a `objectBoundingBox` gradient on a zero-width or shallow path. Such a path has no bounding box to resolve the gradient against, so the stroke silently renders nothing.
**Fix**: use a solid `stroke` colour instead of `stroke="url(#id)"` for thin geometry. Both shipped SVGs already comply.

### `npm run lint` reports more than 5 warnings
**Cause**: new code introduced a lint advisory.
**Fix**: address it, or confirm it is a pre-existing advisory — the baseline for this unit is exactly 5 warnings / 0 errors.

### `npm run lint` reports a `react(set-state-in-effect)` warning on `useSidebarCollapse.ts`
**Cause**: calling `setState()` synchronously inside the `matchMedia` effect. The `narrow` state is already initialised from the same query in the `useState` initializer, so a second `setNarrow(mql.matches)` call inside the effect is redundant — the initial value and the `change` handler both read the same `MediaQueryList`.
**Fix**: delete the redundant `setNarrow(mql.matches)` line. The effect then only subscribes to the `change` event.

### The collapsed sidebar is not 56px wide
**Cause**: the `--sidebar-w` custom property is overridden elsewhere, or `.shell.sidebar-collapsed` is missing.
**Fix**: the collapsed width is set by `.shell.sidebar-collapsed{--sidebar-w:56px}` in `features/chat/styles/chat.css`. The `.shell` rule itself declares `grid-template-columns:var(--sidebar-w,280px) 1fr` — if the custom property is missing, the fallback `280px` applies.

### The rail does not appear when collapsed
**Cause**: the rail is `display:none` by default and only becomes `display:flex` under `.shell.sidebar-collapsed`. If the root class is missing, the expanded panel stays visible instead.
**Fix**: confirm `ChatPage` applies `shell sidebar-collapsed` when `collapsed` is true — it is applied via `className={`shell${collapsed ? ' sidebar-collapsed' : ''}${drawerOpen ? ' drawer-open' : ''}`}`.

### `Ctrl+B` toggles the sidebar while typing in the composer
**Cause**: the keyboard guard is not in place.
**Fix**: the handler in `features/chat/hooks/useSidebarCollapse.ts` must return early when the event target is an `HTMLInputElement`, `HTMLTextAreaElement`, or a contenteditable element — and must call `preventDefault()` **only** when the shortcut actually applies.

### The mobile drawer is open on a phone even though the desktop preference says collapsed
**Cause**: the two states were conflated.
**Fix**: they are deliberately separate. `collapsed` is the persisted desktop state; `drawerOpen` is the transient drawer state, always initialised to `false`. The `matchMedia` change handler closes the drawer when the viewport leaves the narrow range.

### The backend is not running
```bash
cd frontend
node mock-server.mjs        # port 8000; any credentials work
```
Use `PORT=8001 node mock-server.mjs` with `VITE_BACKEND_URL=http://localhost:8001` to run beside the real backend.
