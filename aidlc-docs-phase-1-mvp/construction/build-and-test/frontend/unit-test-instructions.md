# Unit Test Execution — LegalWave Frontend

> **This document covers the `frontend/` unit only.** For the standalone `responsive-auth` design unit (a single self-contained HTML file), see the sibling `responsive-auth-*.md` files in this directory.


**Last updated**: 2026-10-30 — refreshed for the sidebar collapse feature (unit 2).

## Context: there is no automated test suite in this project

A repository-wide search (`*.test.*`, `*.spec.*`, `test_*`, `conftest.py`, `pytest.ini`) returns **no test files** in either `frontend/` or `backend/`. The MVP shipped without a test runner.

This unit did **not** add one. Doing so would require introducing a test runner plus a DOM environment — new dependencies, which NFR-2.1 / NFR-2.2 forbid, and which the user explicitly opted out of via the `property-based-testing` extension.

Consequently, "unit-level" verification for this unit is performed by **static verification** — the compiler, the linter, and purpose-built structural checks — rather than by executing unit tests. The behavioural verification is the manual end-to-end checklist in `e2e-test-instructions.md`.

This document specifies both.

---

## Part A — Static verification (the unit-test substitute)

### A1. Type-check every module

```bash
cd frontend
npx tsc -b --force
```

- **Expected**: exit 0, no diagnostics. This is the strongest unit-level guarantee available: `tsc` proves every module imports resolve, every exported symbol exists with the expected type, and every hook/component contract is internally consistent.
- **Report location**: stdout.

### A2. Lint the whole source tree

```bash
cd frontend
npm run lint
```

- **Expected**: `Found 5 warnings and 0 errors` on 28 files, 116 rules.
- The 5 warnings are pre-existing React-compiler style advisories and are the accepted baseline:
  1. `react(only-export-components)` — `shared/components/Markdown.tsx` exports `parseCite` alongside a component (fast-refresh advisory).
  2. `react(set-state-in-effect)` — `features/chat/hooks/useChatStream.ts` resets message state when the route changes.
  3–5. The remaining advisories in the same two files.
- **A regression is any count above 5 warnings, or any error.** The build fails on errors; warnings must be triaged against the baseline of 5.
- **Unit-2 note**: the sidebar collapse feature initially produced a 6th warning — `react(set-state-in-effect)` on `features/chat/hooks/useSidebarCollapse.ts`, from a redundant `setNarrow(mql.matches)` call inside the `matchMedia` effect. The `narrow` state is already initialised from the same query in the `useState` initializer, so the call was removed and the count returned to 5. If this warning reappears, delete that line — do not suppress it.

### A3. Structural check — CSS selector integrity

```bash
python3 aidlc-docs/scripts/css-selector-check.py
```

- **Expected**:
  ```
  distinct selectors across all files: 213
  selectors defined in more than one file: 0
  ```
- This guards the riskiest part of the refactor (R1): that splitting one 167-selector stylesheet into 7 files dropped or duplicated a rule. Run it from the `final-project-mvp` directory.
- The count is now **213** (was 182 before the sidebar collapse feature). The 31 extra selectors are all newly introduced by the collapse, rail, drawer, and reduced-motion rules.

### A4. Structural check — no pre-existing selector was dropped

```bash
python3 aidlc-docs/scripts/css-regression-check.py
```

- **Expected**:
  ```
  current distinct selectors : 213
  pre-change selectors        : 182
  pre-change selectors LOST   : 0
  ```
- This is the R7 mitigation for the sidebar collapse feature. The script reconstructs the pre-collapse selector universe by subtracting the feature's 31 new selectors from `features/chat/styles/chat.css` and unioning with the untouched stylesheets, then reports any pre-change selector absent from the current source.
- A non-zero `LOST` count is a hard failure — restore the selector in the file that owns that area.

### A5. Structural check — design-token preservation

```bash
python3 aidlc-docs/scripts/css-selector-check.py   # see inventory doc
```
Token values are verified against the pre-refactor palette in `context-docs/mockups/*.html`. The expected result is recorded in `aidlc-docs/scripts/css-selector-inventory.txt`: **all 20 tokens match**; the two shadow tokens differ only in leading-zero notation (`.32` vs `0.32`), which is numerically identical.

The sidebar collapse feature added **no new tokens and no raw hex**. `frontend/src/styles/tokens.css` must remain byte-identical, and the new CSS block must reference only existing tokens:

```bash
# tokens.css must be untouched
stat -c '%y' frontend/src/styles/tokens.css     # must predate the feature's start

# the new collapse block must contain no raw hex
awk 'NR>=106' frontend/src/features/chat/styles/chat.css | grep -nE '#[0-9a-fA-F]{3,8}'
# expected: no output
```

### A6. Structural check — no legacy paths remain

```bash
cd frontend
ls src/api.ts src/styles.css src/pages src/components 2>&1   # all four must be "No such file"
```

Also confirm the final tree is exactly the 34 expected files:
```bash
find src -type f | sort
```

### A7. Structural check — backend untouched

The workspace is not a git repository, so verification uses modification timestamps:
```bash
find backend -type f -not -path '*/__pycache__/*' -not -path '*/.venv/*' -newermt '2026-10-30 22:00'
```
- **Expected**: empty output. Zero backend files were modified during this unit.
- For the sidebar collapse feature specifically, the boundary is `2026-10-30 23:45` (the feature's start). The same command with that timestamp also returns empty.

### A8. Structural check — dependencies unchanged

```bash
cd frontend
cat package.json
```
- **Expected**: `dependencies` = react, react-dom, react-markdown, react-router, remark-gfm. `devDependencies` = @types/node, @types/react, @types/react-dom, @vitejs/plugin-react, oxlint, typescript, vite. Nothing added, nothing upgraded, nothing removed.

### A9. Structural check — session keys untouched

```bash
cd frontend
grep -rn "jlca_token\|jlca_user" src/features/chat/
```
- **Expected**: the only matches are inside a JSDoc comment in `features/chat/hooks/useSidebarCollapse.ts` explaining that `lw_sidebar_collapsed` is deliberately distinct from the session keys. There must be **no executable read or write** of either session key anywhere in the feature.
- The feature's own storage calls must target only `lw_sidebar_collapsed`:
  ```bash
  grep -rn "localStorage" src/features/chat/
  # expected: 3 hits, all in useSidebarCollapse.ts, all using STORAGE_KEY ('lw_sidebar_collapsed')
  ```

### A10. Structural check — no duplicate files (brownfield rule)

```bash
find frontend/src -name '*_new*' -o -name '*_modified*'
```
- **Expected**: empty. Brownfield changes are made in place; no `*_new` / `*_modified` copies may exist.

---

## Part B — Reviewing results

| Check | Command | Pass criteria |
|---|---|---|
| Type-check | `npx tsc -b --force` | exit 0, zero diagnostics |
| Lint | `npm run lint` | 0 errors, ≤ 5 warnings |
| Bundle | `npm run build` | exit 0; both SVGs in `dist/assets/`; 372 modules |
| CSS selectors | `css-selector-check.py` | 213 distinct; 0 cross-file duplicates |
| CSS regression | `css-regression-check.py` | 182 pre-change selectors; 0 LOST |
| Design tokens | inventory doc | 20/20 match; `tokens.css` untouched |
| Raw hex | `grep -E '#[0-9a-fA-F]{3,8}'` on the new block | no output |
| Legacy paths | `ls src/api.ts …` | all absent |
| Backend | `find backend -newermt …` | empty |
| Shared API | `find frontend/src/shared/api -newermt …` | empty |
| Dependencies | `cat package.json` | unchanged |
| Session keys | `grep -rn "jlca_token\|jlca_user" src/features/chat/` | comments only; no executable access |
| Duplicate files | `find frontend/src -name '*_new*' -o -name '*_modified*'` | empty |

### Fixing a failure

1. Re-read the failing output — `tsc` diagnostics carry a file:line:column and a specific reason.
2. Fix the code (never suppress with a cast or a `// @ts-ignore` — `erasableSyntaxOnly` and the strict flags are the point of the check).
3. Re-run from the top: A1 → A2 → the bundle.
4. If a CSS selector was dropped, restore it in the destination file that owns that area, then re-run A3 and A4.
5. If the lint count rises above 5, find the new advisory and fix the cause — do not raise the baseline.

---

## Part C — If an automated suite is added later

This project has no test runner and adding one is out of scope for this unit. If a runner is introduced in a later phase, the highest-value first targets — in priority order — are:

| Target | Module | Why |
|---|---|---|
| `groupChats` | `features/chat/hooks/useChats.ts` | Pure function with clear Today/Yesterday/Earlier boundaries; the only exported non-component in the codebase and therefore trivially testable in isolation. |
| `parseCite` | `shared/components/Markdown.tsx` | Pure regex parse of `cite://law_id/article`; a regression here silently breaks every statute link. |
| `useChatStream.handleEvent` | `features/chat/hooks/useChatStream.ts` | The NDJSON event reducer. **Highest risk, highest value** — every stream event type must map to the correct state update. |
| `useSidebarCollapse` | `features/chat/hooks/useSidebarCollapse.ts` | **Added by the sidebar collapse feature.** The highest-value target in the new code: the storage read/write contract (only `'1'` means collapsed; a malformed value or a `SecurityError` falls back to expanded), the `Ctrl+B`/`Cmd+B` text-field guard, and the independence of the desktop `collapsed` state from the mobile `drawerOpen` state. Each of these is a pure decision that a test can pin down without a browser. |
| `api<T>` / `streamChat` | `shared/api/client.ts` | Byte-identical to the original and untouched by this refactor, but it carries the 401-logout behaviour and the newline-buffered stream parsing. Must not regress. |
| `LoginPage` / `RegisterPage` | `features/auth/pages/` | Form validation, error display, and the correct endpoint per page. Both already carry `data-testid` attributes. |
