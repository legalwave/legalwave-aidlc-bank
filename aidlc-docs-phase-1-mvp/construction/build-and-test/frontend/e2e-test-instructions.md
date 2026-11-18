# End-to-End Test Instructions — LegalWave Frontend

> **This document covers the `frontend/` unit only.** For the standalone `responsive-auth` design unit (a single self-contained HTML file), see the sibling `responsive-auth-*.md` files in this directory.


**Last updated**: 2026-10-31 — extended with Section J (sidebar collapse, 35 checks) for unit 2, including checks J29–J35 added by the sidebar-collapse defect-fix pass.

## Purpose

Manual end-to-end verification of the complete LegalWave frontend. This is the acceptance checklist for the two units delivered so far:

**Unit 1 — LegalWave rebrand + modular restructure:**
1. The frontend project structure is modular and standard.
2. `/register` is a separate route (previously a toggle on `/login`).
3. The product is named **LegalWave**.
4. An artistic background image matching the design was added.
5. A suitable logo was added.

**Unit 2 — Sidebar collapse with smooth opening and closing animation:**
6. The chat workspace sidebar collapses to an icon rail and expands again, with a smooth 200ms animation.
7. The collapsed state persists across reloads, is reachable by keyboard, and the mobile drawer, reduced-motion path, and text-field guard all behave correctly.

**There is no automated test runner in this project** (no `*.test.*`, `*.spec.*`, or `conftest.py` anywhere) and adding one would violate NFR-2.1. Verification is therefore manual, guided by this checklist.

---

## Setup

```bash
# terminal 1 — backend
cd backend && uvicorn app.main:app --port 8000 --reload
#   (or: cd frontend && node mock-server.mjs)

# terminal 2 — frontend
cd frontend && npm run dev     # http://localhost:5173
```

**Before starting**: sign out and clear the session so you test from a clean slate.
```js
localStorage.clear()   // browser console
```

---

## Section A — Structure (FR-1)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| A1 | Feature-based layout | Inspect `frontend/src/` | `app/`, `config/`, `features/{auth,chat,citations,settings}/`, `shared/`, `styles/`, `assets/` | ☐ Pass ☐ Fail |
| A2 | No legacy files | `ls frontend/src/api.ts frontend/src/styles.css frontend/src/pages frontend/src/components` | All four report "No such file or directory" | ☐ Pass ☐ Fail |
| A3 | No duplicate files | `find frontend/src -name '*_new*' -o -name '*_modified*' -o -name '*_copy*'` | Empty output (brownfield rule: edit in place, never fork) | ☐ Pass ☐ Fail |
| A4 | 34 files in `src/` | `find frontend/src -type f \| wc -l` | 34 | ☐ Pass ☐ Fail |
| A5 | Styles split per area | `ls frontend/src/features/*/styles/` | `auth.css`, `chat.css`, `citation.css`, `settings.css` | ☐ Pass ☐ Fail |
| A6 | No cross-file CSS duplication | `python3 aidlc-docs/scripts/css-selector-check.py` | `selectors defined in more than one file: 0` | ☐ Pass ☐ Fail |
| A7 | Design tokens unchanged | Compare `frontend/src/styles/tokens.css` with the baseline in `aidlc-docs/scripts/css-selector-inventory.txt` | All 20 tokens match | ☐ Pass ☐ Fail |
| A8 | Clean build | `cd frontend && npm run build` | Exit 0, no TS errors | ☐ Pass ☐ Fail |
| A9 | Clean lint | `cd frontend && npm run lint` | 0 errors, 5 warnings (the pre-existing baseline) | ☐ Pass ☐ Fail |

---

## Section B — Separate `/register` route (FR-2, FR-3)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| B1 | `/register` exists | Open `http://localhost:5173/register` | The **register** form renders — name, email, password | ☐ Pass ☐ Fail |
| B2 | `/login` has no register toggle | Open `/login` | Email + password only, **no** register/login toggle | ☐ Pass ☐ Fail |
| B3 | Register submits to the register endpoint | DevTools → Network → submit the form | `POST /api/auth/register` is called | ☐ Pass ☐ Fail |
| B4 | Login submits to the login endpoint | DevTools → Network → submit the login form | `POST /api/auth/login` is called | ☐ Pass ☐ Fail |
| B5 | Register creates an account and signs in | Complete the form with a new email | Navigates to the chat workspace; `jlca_token` and `jlca_user` are set | ☐ Pass ☐ Fail |
| B6 | Duplicate email shows an inline error | Register with an existing email | `register-form-error` appears; still on `/register`; fields not cleared | ☐ Pass ☐ Fail |
| B7 | Bad credentials show an inline error | Log in with a wrong password | `login-form-error` appears; **no redirect**; email field retains its value | ☐ Pass ☐ Fail |
| B8 | Cross-links work | Click `login-form-register-link`, then `register-form-login-link` | Client-side navigation both ways, no page reload | ☐ Pass ☐ Fail |
| B9 | Guard: signed out → `/login` | Open `/settings/api-key` signed out | Redirected to `/login` | ☐ Pass ☐ Fail |
| B10 | Guard: signed out → `/` | Open `/` signed out | Redirected to `/login` | ☐ Pass ☐ Fail |
| B11 | Guard: signed in → `/login` | Sign in, then open `/login` | Redirected to `/` | ☐ Pass ☐ Fail |
| B12 | Guard: signed in → `/register` | Sign in, then open `/register` | Redirected to `/` | ☐ Pass ☐ Fail |
| B13 | `autoComplete` attributes | Inspect the inputs | Login: `email` / `current-password`. Register: `name` / `email` / `new-password` | ☐ Pass ☐ Fail |
| B14 | Labels are associated | Click each label | The correct input receives focus (every `<label>` has a matching `htmlFor`) | ☐ Pass ☐ Fail |

---

## Section C — LegalWave branding (FR-4)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| C1 | Document title | Browser tab | "LegalWave — Japanese Contract Risk Analyzer" | ☐ Pass ☐ Fail |
| C2 | Logo on `/login` | View the auth card | The LegalWave logo is visible above the title | ☐ Pass ☐ Fail |
| C3 | Logo on `/register` | View the auth card | The LegalWave logo is visible above the title | ☐ Pass ☐ Fail |
| C4 | Product name | Inspect both auth pages | "LegalWave" | ☐ Pass ☐ Fail |
| C5 | Sidebar brand lockup | Sign in | The logo + "LegalWave" in the sidebar header | ☐ Pass ☐ Fail |
| C6 | Settings branding | Open `/settings/api-key` | The header shows LegalWave branding | ☐ Pass ☐ Fail |
| C7 | **No old name** | Search the rendered DOM for "Legal Assistant" | **Zero occurrences** | ☐ Pass ☐ Fail |
| C8 | No hardcoded names in source | `grep -rn '"Legal Assistant"\|"LegalWave"' frontend/src/` | "LegalWave" appears only in `config/brand.ts` (and as `BRAND.name` usages) | ☐ Pass ☐ Fail |
| C9 | Favicon | Browser tab icon | The LegalWave logo | ☐ Pass ☐ Fail |

---

## Section D — Logo asset (FR-5, FR-6)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| D1 | Logo renders at 40px | Inspect the auth card logo | The scales-and-wave mark is clearly legible, not blurry or clipped | ☐ Pass ☐ Fail |
| D2 | Logo renders at 24px | Inspect the sidebar brand lockup | Still legible — no strokes vanish, no forms collapse | ☐ Pass ☐ Fail |
| D3 | No invisible strokes | Zoom to 400% on the logo | Every intended stroke is visible (a gradient on a thin path silently renders nothing) | ☐ Pass ☐ Fail |
| D4 | Accessible name | Inspect the SVG in DevTools | It has an `aria-label` or adjacent visually-hidden text — it is not an unlabelled graphic | ☐ Pass ☐ Fail |
| D5 | Vector | `file frontend/src/assets/logo.svg` | SVG, ~2.9 KB, no embedded raster | ☐ Pass ☐ Fail |
| D6 | Bundled | `ls frontend/dist/assets/ \| grep logo` | A fingerprinted `logo-<hash>.svg` is present in the build output | ☐ Pass ☐ Fail |

---

## Section E — Artistic background (FR-5, FR-6)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| E1 | Auth background visible | Open `/login` | The wave-field artwork is visible behind the card | ☐ Pass ☐ Fail |
| E2 | Register background visible | Open `/register` | Same artwork on the register page | ☐ Pass ☐ Fail |
| E3 | Contrast (AA) | Inspect the form text against the background | All text and input borders meet WCAG AA contrast | ☐ Pass ☐ Fail |
| E4 | Workspace texture | Sign in | The background is present at low opacity (4–6%) — visible as texture, not a competing surface | ☐ Pass ☐ Fail |
| E5 | Decorative only | Inspect `.auth-bg` and `.shell-bg` | `aria-hidden="true"` and `pointer-events: none` | ☐ Pass ☐ Fail |
| E6 | Non-blocking | Click and drag across the background, and scroll | Clicks reach the elements beneath; scrolling is unaffected | ☐ Pass ☐ Fail |
| E7 | Fixed layer | Inspect the computed style | `position: fixed` — the artwork does not scroll with the content | ☐ Pass ☐ Fail |
| E8 | No scroll jank | Scroll the thread, the sidebar list, and the settings pane | Smooth, no flicker or jitter | ☐ Pass ☐ Fail |
| E9 | Asset size | `ls -l frontend/src/assets/wave-field.svg` | Under 30 KB (actual: 4,856 bytes) | ☐ Pass ☐ Fail |
| E10 | Scales to any viewport | Resize the window from 1920px to 360px | The artwork scales cleanly with no focal point or stretching artefact | ☐ Pass ☐ Fail |
| E11 | **Graceful degradation** | DevTools → Network → block `wave-field-*.svg`, then reload | The page renders normally on the plain canvas colour; the form still works; **no error state shown to the user** | ☐ Pass ☐ Fail |

---

## Section F — MCP server key rename (FR-4.6, FR-4.7, FR-7)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| F1 | New key in the snippet | Open `/settings/api-key` | The snippet's server key reads **`legalwave`** | ☐ Pass ☐ Fail |
| F2 | Old key absent | Search the snippet | The string `legal-assistant` does **not** appear as the active key | ☐ Pass ☐ Fail |
| F3 | Change note visible | Look below the snippet | A note explains that the key changed from `legal-assistant` to `legalwave` and that existing MCP client configurations must be updated | ☐ Pass ☐ Fail |
| F4 | MCP URL unchanged | Inspect the snippet | Still `http://localhost:8000/mcp` with `Authorization: Bearer` | ☐ Pass ☐ Fail |

---

## Section G — No regressions in existing behaviour (FR-6, NFR-3.3, NFR-5)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| G1 | Chat streaming | Sign in, send a message | The stage list advances, tool lines appear, markdown renders progressively | ☐ Pass ☐ Fail |
| G2 | Stop button | Click Stop mid-stream | The stream aborts cleanly; the UI returns to an idle state | ☐ Pass ☐ Fail |
| G3 | Example chips | Click an example chip | The text **populates the composer** (it does not send immediately) | ☐ Pass ☐ Fail |
| G4 | Attach a file | Attach a `.txt` or `.pdf` | The attachment chip appears and can be removed | ☐ Pass ☐ Fail |
| G5 | Chat history grouping | Create 2–3 chats | The sidebar groups them under Today / Yesterday / Earlier | ☐ Pass ☐ Fail |
| G6 | History search | Type in the sidebar search | The list filters by title and preview | ☐ Pass ☐ Fail |
| G7 | Delete a chat | Hover a chat, click delete | It disappears from the list and stays deleted after a reload | ☐ Pass ☐ Fail |
| G8 | Deep link to a chat | Open `/c/<id>` | That conversation loads | ☐ Pass ☐ Fail |
| G9 | Citation modal | Click a citation pill | The statute article opens in a modal; `Esc` closes it | ☐ Pass ☐ Fail |
| G10 | Severity badges | Read a verdict report | RED / YELLOW / GREEN badges and clause quotes render correctly | ☐ Pass ☐ Fail |
| G11 | API key management | Open `/settings/api-key` | List, generate (shown once, copyable), and revoke all work | ☐ Pass ☐ Fail |
| G12 | Sign out | Click sign out | The session is cleared and you return to `/login` | ☐ Pass ☐ Fail |
| G13 | Global 401 | Corrupt `jlca_token` in localStorage, then trigger a request | The session clears and you are redirected to `/login` | ☐ Pass ☐ Fail |
| G14 | Session storage keys | `localStorage.getItem('jlca_token')` | The key is still `jlca_token` (and `jlca_user`) — unchanged from the MVP | ☐ Pass ☐ Fail |

---

## Section H — Accessibility spot-check (NFR-4)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| H1 | Keyboard navigation | Tab through `/login` | Every field and the submit button are reachable; the focus ring is visible at each stop | ☐ Pass ☐ Fail |
| H2 | Labels | Click each label | The matching input focuses | ☐ Pass ☐ Fail |
| H3 | Errors are text | Trigger a failed login | The error is readable text, not conveyed by colour alone | ☐ Pass ☐ Fail |
| H4 | Background hidden from AT | Inspect with a screen reader | The background layer is not announced | ☐ Pass ☐ Fail |
| H5 | Logo labelled | Inspect the logo's accessible name | It has a meaningful name, not an empty graphic | ☐ Pass ☐ Fail |

---

## Section I — Scope containment (NFR-2, NFR-5)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| I1 | No new dependencies | `cat frontend/package.json` | `dependencies` and `devDependencies` are unchanged from the MVP | ☐ Pass ☐ Fail |
| I2 | Backend untouched | `find backend -type f -not -path '*/__pycache__/*' -newermt '2026-10-30 22:00'` | Empty output | ☐ Pass ☐ Fail |
| I3 | API contract honoured | Compare the Network panel against `aidlc-docs/inception/api-contract.md` | No endpoint was added, removed, or reshaped | ☐ Pass ☐ Fail |

---

## Section J — Sidebar collapse (FR-1 … FR-7, NFR-1, NFR-4, NFR-6, NFR-8)

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| J1 | Toggle collapses the sidebar | Click `sidebar-toggle-button` | The sidebar narrows to 56px and shows the icon rail | ☐ Pass ☐ Fail |
| J2 | Toggle expands the sidebar | Click it again | The sidebar returns to 280px with the full panel | ☐ Pass ☐ Fail |
| J3 | Rail contents | Inspect the collapsed rail | The expand toggle, the logo, and the new-chat button are present | ☐ Pass ☐ Fail |
| J4 | Rail hides the text layer | Inspect the collapsed sidebar | The search box, chat titles/previews, and the user name are hidden | ☐ Pass ☐ Fail |
| J5 | Animation is smooth | Watch the collapse and expand | ~200ms, `cubic-bezier(.4,0,.2,1)`, no stutter, no text clipped mid-word | ☐ Pass ☐ Fail |
| J6 | Chat area reflows in step | Watch the thread while collapsing | The thread resizes together with the sidebar, not before or after | ☐ Pass ☐ Fail |
| J7 | State survives a reload | Collapse, then reload | The sidebar is still collapsed after the reload | ☐ Pass ☐ Fail |
| J8 | Persistence key | `localStorage.getItem('lw_sidebar_collapsed')` | `"1"` when collapsed; `null` when expanded | ☐ Pass ☐ Fail |
| J9 | Session keys untouched | `localStorage.getItem('jlca_token')` | Still present and unchanged after collapsing/expanding | ☐ Pass ☐ Fail |
| J10 | `Ctrl+B` toggles | Focus the thread body, press `Ctrl+B` | The sidebar toggles; the browser's bold shortcut does not apply | ☐ Pass ☐ Fail |
| J11 | `Cmd+B` on macOS | Repeat with `Cmd+B` | Same behaviour | ☐ Pass ☐ Fail |
| J12 | Shortcut disabled while typing | Focus the composer, type, press `Ctrl+B` | The sidebar does **not** toggle and the text is unchanged | ☐ Pass ☐ Fail |
| J13 | Shortcut disabled in the search box | Focus `chat-search-input`, press `Ctrl+B` | The sidebar does **not** toggle | ☐ Pass ☐ Fail |
| J14 | Chat list is not remounted | Scroll the list down, then toggle | The scroll position is preserved | ☐ Pass ☐ Fail |
| J15 | No refetch on toggle | Watch the Network panel while toggling | No new request is issued | ☐ Pass ☐ Fail |
| J16 | The rail has no chat shortcuts | Collapse the sidebar, inspect the rail | No per-chat icons are rendered — the rail holds only the expand toggle, the logo, and the new-chat button | ☐ Pass ☐ Fail |
| J17 | Mobile drawer opens | Resize below 768px, click the toggle | The sidebar slides in as an overlay with a scrim behind it | ☐ Pass ☐ Fail |
| J18 | Scrim closes the drawer | Click the scrim | The drawer closes | ☐ Pass ☐ Fail |
| J19 | `Escape` closes the drawer | Press `Escape` with the drawer open | The drawer closes | ☐ Pass ☐ Fail |
| J20 | No rail on mobile | With the drawer open below 768px | The full panel is shown — not the collapsed rail | ☐ Pass ☐ Fail |
| J21 | Desktop preference ≠ drawer | Set `lw_sidebar_collapsed = "1"`, reload below 768px | The drawer still starts closed | ☐ Pass ☐ Fail |
| J22 | Reduced motion | Enable `prefers-reduced-motion: reduce`, toggle | The sidebar jumps straight to its end state — no sliding or fading | ☐ Pass ☐ Fail |
| J23 | Toggle is labelled | Inspect the toggle's accessible name | "Collapse sidebar" when expanded, "Expand sidebar" when collapsed | ☐ Pass ☐ Fail |
| J24 | `aria-expanded` is correct | Inspect the toggle's `aria-expanded` | `true` when expanded, `false` when collapsed | ☐ Pass ☐ Fail |
| J25 | Rail controls are labelled | Hover the new-chat button / inspect with a screen reader | "New chat" is exposed as the accessible name and the tooltip | ☐ Pass ☐ Fail |
| J26 | Toggle is keyboard reachable | Tab to the toggle, press Enter | The sidebar toggles | ☐ Pass ☐ Fail |
| J27 | Focus ring is visible | Tab to the toggle | A clearly visible focus ring appears | ☐ Pass ☐ Fail |
| J28 | Storage unavailable | Block site data in DevTools, then toggle | The sidebar still toggles for the session; no error is surfaced | ☐ Pass ☐ Fail |
| J29 | **Expand affordance exists in the rail** | Collapse the sidebar, inspect the rail | The rail shows a `»` expand toggle at the top, labelled "Expand sidebar", with `aria-expanded="false"` | ☐ Pass ☐ Fail |
| J30 | **The rail toggle reopens the sidebar** | With the sidebar collapsed, click the rail's `»` toggle | The sidebar expands back to 280px with the full panel | ☐ Pass ☐ Fail |
| J31 | **Only one toggle is visible at a time** | Inspect the DOM in both states | Expanded → the header `«` toggle is visible and the rail `»` toggle is hidden; collapsed → the reverse | ☐ Pass ☐ Fail |
| J32 | **The rail shows no chat icons at all** | Collapse the sidebar and inspect the rail | The rail contains only the expand toggle, the logo, and the new-chat button — no per-chat icons and no letter initials | ☐ Pass ☐ Fail |
| J33 | **Collapsed panel is hidden from assistive tech** | With the sidebar collapsed, inspect `.sidebar-panel` | It carries `aria-hidden="true"` and `inert` | ☐ Pass ☐ Fail |
| J34 | **Collapsed panel is out of the tab order** | With the sidebar collapsed, press `Tab` repeatedly | The search box, chat entries, and sign-out button are **not** reachable; only the rail controls are | ☐ Pass ☐ Fail |
| J35 | **`Ctrl+B` below 768px toggles the drawer** | Resize below 768px, focus the thread body, press `Ctrl+B` | The drawer opens and closes (it does not try to toggle the desktop rail) | ☐ Pass ☐ Fail |

---

## Result

**Passed:** ____ / 92
**Failed:** ____

| Section | Checks | Result |
|---|---|---|
| A — Structure | 9 | ☐ Pass ☐ Fail |
| B — Register route | 14 | ☐ Pass ☐ Fail |
| C — Branding | 9 | ☐ Pass ☐ Fail |
| D — Logo | 6 | ☐ Pass ☐ Fail |
| E — Background | 11 | ☐ Pass ☐ Fail |
| F — MCP key | 4 | ☐ Pass ☐ Fail |
| G — No regressions | 14 | ☐ Pass ☐ Fail |
| H — Accessibility | 5 | ☐ Pass ☐ Fail |
| I — Scope containment | 3 | ☐ Pass ☐ Fail |
| J — Sidebar collapse | 28 | ☐ Pass ☐ Fail |

**Overall:** ☐ Pass ☐ Fail

### On failure

Record the check ID, what happened, and what was expected. Then:
1. Identify the responsible module.
2. Fix it (never by reverting the whole refactor — the structure is the deliverable).
3. Re-run the affected section in full, plus Section A (structure) if the fix touched a shared file.
4. Re-run `npm run build` and `npm run lint`.
