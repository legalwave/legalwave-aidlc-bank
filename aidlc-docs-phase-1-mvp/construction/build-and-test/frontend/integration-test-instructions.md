# Integration Test Instructions — LegalWave Frontend

> **This document covers the `frontend/` unit only.** For the standalone `responsive-auth` design unit (a single self-contained HTML file), see the sibling `responsive-auth-*.md` files in this directory.


**Last updated**: 2026-10-30 — extended with 8 sidebar collapse scenarios (14–21) for unit 2.

## Purpose

Verify that the restructured frontend still integrates correctly with the backend HTTP API and with its own internal modules. The restructure moved every module and split the auth flow into two routes — the integration surfaces that must be re-validated are the **API contract** and the **cross-module wiring**.

Unit 2 (sidebar collapse) adds a second class of integration surface: the sidebar's state must integrate correctly with **the browser's own subsystems** — `localStorage` persistence, the keyboard, the viewport via `matchMedia`, and the CSS cascade. These are integration boundaries, not unit boundaries, because they cross the React tree into browser APIs.

The backend is unchanged and its contract is fixed in `aidlc-docs/inception/api-contract.md`. These tests confirm the frontend still honours it.

---

## Test scenarios

### Scenario 1 — Register → auto sign-in → chat workspace

- **Description**: A brand-new user registers at `/register`, is signed in automatically, and lands in the chat workspace. This is the single most important new path: registration was previously a boolean toggle on `/login` and is now a separate route posting to a different endpoint.
- **Setup**: backend running on `http://localhost:8000` (or `node mock-server.mjs`).
- **Test steps**:
  1. `cd frontend && npm run dev`
  2. Open `http://localhost:5173/register` — you should land on the register form.
  3. Fill `register-form-name-input` = `Test User`, `register-form-email-input` = a **new, unused** email, `register-form-password-input` = a password of 8+ characters.
  4. Click `register-form-submit-button`.
- **Expected results**:
  - The app navigates to the chat workspace (the empty state with the greeting and example chips).
  - `localStorage.jlca_token` is set and `localStorage.jlca_user` contains the user with the name "Test User".
  - The sidebar footer shows the user name.
- **Cleanup**: `localStorage.clear()` in the browser console, or click sign out in the sidebar footer.

### Scenario 2 — Register rejects a duplicate email

- **Description**: The register endpoint must surface the backend's error message inline.
- **Setup**: an email that already exists.
- **Test steps**:
  1. Go to `/register`.
  2. Enter the email of an existing account with any password.
  3. Click `register-form-submit-button`.
- **Expected results**:
  - `register-form-error` appears with the backend's `detail` message.
  - The user is **not** navigated away — still on `/register`.
  - The form fields are **not** cleared.
  - The button re-enables (the busy state clears).

### Scenario 3 — Login at `/login` posts to the login endpoint

- **Description**: The login page must post to `POST /api/auth/login` only — never to the register endpoint.
- **Setup**: an existing account.
- **Test steps**:
  1. Go to `/login`.
  2. Enter the email and password of the account created in Scenario 1.
  3. Click `login-form-submit-button`.
- **Expected results**:
  - Navigates to the chat workspace.
  - The session is stored under `jlca_token` / `jlca_user`.
  - The network tab shows exactly one `POST /api/auth/login` and **no** `POST /api/auth/register`.

### Scenario 4 — Login shows an inline error on bad credentials

- **Description**: A 401 on the login form must not trigger the global 401 → logout → redirect behaviour. It must render inline instead (FR-2.10).
- **Test steps**:
  1. Go to `/login`.
  2. Enter a valid email with a **wrong** password.
  3. Click `login-form-submit-button`.
- **Expected results**:
  - `login-form-error` appears with the backend's message.
  - The URL is still `/login` — **no redirect loop**, and no full-page reload.
  - The email field still holds the typed value.

### Scenario 5 — Route guards

- **Description**: `RequireAuth` and `RedirectIfAuthenticated` must both work in both directions.
- **Test steps**:
  1. **Signed out**, open `http://localhost:5173/settings/api-key` → you are redirected to `/login`.
  2. **Signed out**, open `http://localhost:5173/` → you are redirected to `/login`.
  3. **Signed in**, open `http://localhost:5173/login` → you are redirected to `/` (the chat workspace).
  4. **Signed in**, open `http://localhost:5173/register` → you are redirected to `/`.
- **Expected results**: each case redirects as described, with no flash of the protected content and no redirect loop.

### Scenario 6 — Cross-module navigation between auth pages

- **Description**: the two auth pages must link to each other correctly.
- **Test steps**:
  1. On `/login`, click `login-form-register-link` → you land on `/register`.
  2. On `/register`, click `register-form-login-link` → you land on `/login`.
- **Expected results**: client-side navigation (no full page reload), the correct page in each direction.

### Scenario 7 — Session expiry mid-session (global 401)

- **Description**: The central 401 handler must still clear the session and redirect — this is the behaviour that was **not** changed by the refactor but sits in the moved `shared/api/client.ts`.
- **Test steps**:
  1. Sign in.
  2. In the browser console, corrupt the token: `localStorage.setItem('jlca_token','invalid')`.
  3. Trigger any authenticated request (e.g. open the chat history, or type a message).
- **Expected results**: the session is cleared and you are redirected to `/login`.

### Scenario 8 — Chat streaming still works end to end

- **Description**: The NDJSON streaming path is the most safety-critical piece of moved code. It was required to be preserved byte-identically.
- **Setup**: backend with the agent wired up, or `mock-server.mjs` (which streams a canned verdict report).
- **Test steps**:
  1. Sign in and open `/`.
  2. Click one of the example chips — the text should **populate the composer** (not send immediately).
  3. Click send.
  4. Observe the progress block, tool lines, and the streamed markdown.
- **Expected results**:
  - The stage list advances and ticks off as stages complete.
  - Tool calls render as collapsible `<details>` lines.
  - The markdown renders progressively.
  - The response contains severity badges, clause quotes, and citation pills.
  - Clicking a citation pill opens the statute modal with the article text; `Esc` closes it.

### Scenario 9 — Chat history, search, and delete

- **Description**: `useChats` was rewritten during the split (it now returns grouped `ChatGroup[]` objects). Verify grouping, search, and deletion.
- **Test steps**:
  1. Create 2–3 chats.
  2. Inspect the sidebar — chats should be grouped under **Today** / **Yesterday** / **Earlier** headings (only non-empty groups appear).
  3. Type into the sidebar search box — the list filters by title and preview text.
  4. Hover a chat and click its delete control — it disappears from the list and from the server.
  5. Reload the page — the deletion persists.
- **Expected results**: grouping, filtering, and deletion all behave as described.

### Scenario 10 — Settings: API keys and the MCP snippet

- **Description**: The settings page moved to `features/settings/`, and the MCP server key was renamed.
- **Test steps**:
  1. Navigate to `/settings/api-key`.
  2. Generate a key — it is shown once and can be copied.
  3. Inspect the MCP snippet: the server key must read **`legalwave`**.
  4. Confirm `mcp-key-change-note` is visible and explains that the key changed from `legal-assistant`.
  5. Revoke the key — it is marked revoked in the list.
- **Expected results**: all of the above. The snippet must **not** contain the string `legal-assistant` as the active key.

### Scenario 11 — LegalWave branding throughout

- **Description**: the product name must appear as "LegalWave" everywhere and nowhere as the old name.
- **Test steps**:
  1. Open `/login` — the card shows the LegalWave logo and the name "LegalWave".
  2. Open `/register` — same.
  3. Sign in — the sidebar brand lockup shows the logo and "LegalWave".
  4. Open `/settings/api-key` — the header shows LegalWave branding.
  5. Check the browser tab title: "LegalWave — Japanese Contract Risk Analyzer".
- **Expected results**: "LegalWave" everywhere. **No occurrence of "Legal Assistant"** in any visible string.

### Scenario 12 — Background artwork on the auth screens and in the workspace

- **Description**: The new artistic background must render on the auth screens at full strength and in the workspace as a subtle texture.
- **Test steps**:
  1. Open `/login` — the wave-field artwork is visible behind the card.
  2. Inspect the computed `opacity` of `.auth-bg` — it should be `0.55`, with a scrim gradient over it.
  3. Sign in — `.shell-bg` is present in the workspace with `opacity: 0.05`, reading as texture rather than a competing surface.
  4. Click and scroll across the background — it must never intercept a click or block scrolling.
- **Expected results**: the artwork renders at both intensities, is purely decorative, and never interferes with interaction.

### Scenario 13 — The app remains usable if the artwork fails to load

- **Description**: FR-5.7 / NFR-8.2 — the background must be non-blocking on failure.
- **Test steps**:
  1. In DevTools → Network, block the request for `wave-field-*.svg` (or rename the file temporarily).
  2. Reload `/login` and `/register`.
- **Expected results**: the page renders normally on the plain canvas colour. All text remains legible, the form still works, and no error state is surfaced to the user.

---

## Sidebar collapse scenarios (unit 2)

### Scenario 14 — Collapse and expand via the toggle button

- **Description**: FR-1, FR-2 — the sidebar collapses to a 56px rail and expands again. The chat area must reflow in step (FR-3.4, NFR-1.4).
- **Setup**: signed in, at least one existing chat.
- **Test steps**:
  1. Sign in and land in the chat workspace.
  2. Click `sidebar-toggle-button`.
  3. Observe the sidebar and the chat area during and after the transition.
  4. Click `sidebar-toggle-button` again.
- **Expected results**:
  - Collapsed: the sidebar is **56px** wide, the rail shows only the expand toggle, the logo, and the new-chat button — no per-chat shortcuts; the search box, chat text, and user name are hidden.
  - The toggle remains visible in the rail and is labelled "Expand sidebar" with `aria-expanded="false"`.
  - Expanded: the sidebar returns to **280px**, `aria-expanded="true"`, label "Collapse sidebar".
  - The chat area reflows **in step** with the sidebar, not before or after it.
  - The transition lasts ~200ms with a smooth `cubic-bezier(.4,0,.2,1)` curve.

### Scenario 15 — The collapsed state survives a reload

- **Description**: FR-5 — the collapsed preference is persisted in `localStorage` under `lw_sidebar_collapsed`.
- **Test steps**:
  1. Collapse the sidebar.
  2. Check the console: `localStorage.getItem('lw_sidebar_collapsed')` → `"1"`.
  3. Reload the page (`F5`).
  4. Expand the sidebar and check again: `localStorage.getItem('lw_sidebar_collapsed')` → `null`.
- **Expected results**:
  - After the reload the sidebar is **still collapsed** — the state is restored before first paint, with no flash of the expanded sidebar.
  - Expanding removes the key entirely rather than storing a falsy value.
  - The session keys `jlca_token` / `jlca_user` are **unaffected** by both operations.

### Scenario 16 — `Ctrl+B` / `Cmd+B` toggles the sidebar

- **Description**: FR-4 — the keyboard shortcut works from anywhere in the chat workspace, but **never while typing**.
- **Test steps**:
  1. Click on an empty area of the chat thread (not an input), then press `Ctrl+B` (or `Cmd+B`).
  2. Press it again to expand.
  3. Click into the composer textarea, type `hello`, then press `Ctrl+B`.
  4. Clear the composer. Click into `chat-search-input`, type `a`, then press `Ctrl+B`.
- **Expected results**:
  - Steps 1–2: the sidebar toggles. The browser's own bold behaviour does **not** apply (the default was prevented).
  - Step 3: the sidebar does **not** toggle, and the text `hello` is unchanged (no bold formatting was applied). The browser's default bold behaviour may apply — that is correct, because the shortcut does not apply there.
  - Step 4: the sidebar does **not** toggle, and the search text is unchanged.
  - The shortcut does nothing on the auth pages (`/login`, `/register`) — it is scoped to the chat workspace.

### Scenario 17 — The chat list is not remounted by a toggle

- **Description**: FR-1.3 / NFR-1.3 — the collapsed state is CSS-driven, so the chat list keeps its scroll position and no data is refetched.
- **Test steps**:
  1. Sign in with enough chats to make the list scrollable.
  2. Scroll the chat list to the bottom.
  3. Open DevTools → Network and filter by Fetch/XHR.
  4. Collapse, then expand, the sidebar.
- **Expected results**:
  - The chat list's **scroll position is preserved** across both toggles — proof the list was never unmounted.
  - **No new network request** is issued by the toggle.
  - The chat search query is preserved.

### Scenario 18 — Mobile drawer below 768px

- **Description**: FR-6 — below 768px the sidebar becomes an overlay drawer rather than a collapsed rail.
- **Test steps**:
  1. Resize the browser to below 768px (e.g. 390×844) or use device emulation.
  2. Click `sidebar-toggle-button`.
  3. Click the scrim.
  4. Press `Escape`.
- **Expected results**:
  - The drawer slides in from the left over the chat area, with a scrim behind it dimming the workspace.
  - Clicking the scrim closes the drawer.
  - `Escape` closes the drawer.
  - The **rail does not appear** at this width — the full panel is shown inside the drawer.
  - The desktop collapsed preference does **not** force the drawer open on load: with `lw_sidebar_collapsed = "1"` set, the drawer still starts closed.

### Scenario 19 — The desktop preference and the drawer are independent

- **Description**: FR-6.4 / risk R5 — the two responsive states must not interfere.
- **Test steps**:
  1. At a desktop width, collapse the sidebar (this writes `lw_sidebar_collapsed = "1"`).
  2. Resize the window down below 768px.
  3. Resize it back above 768px.
- **Expected results**:
  - Below 768px the drawer governs and is closed; the desktop rail state is not applied.
  - Back above 768px the sidebar is collapsed again — the preference survived the round trip.
  - Resizing up out of the narrow range leaves no invisible open drawer behind the desktop layout.

### Scenario 20 — Reduced motion

- **Description**: FR-7 — the `prefers-reduced-motion` preference is honoured.
- **Setup**: macOS — System Settings → Accessibility → Display → Reduce motion → **On**. On Linux/Chrome — DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. On Windows — DevTools → Rendering → same setting.
- **Test steps**:
  1. Enable reduced motion.
  2. Reload the workspace.
  3. Collapse and expand the sidebar.
- **Expected results**: the sidebar jumps **directly** to its end state with no sliding, fading, or animation. The final layout is identical to the non-reduced-motion end state.

### Scenario 21 — `localStorage` unavailable

- **Description**: FR-5.2 / NFR-8.1, NFR-8.2 — the feature must degrade gracefully when storage is blocked.
- **Test steps**:
  1. In DevTools → Application → Storage, block all cookies and site data, or use a browser profile with storage disabled.
  2. Load the workspace and collapse the sidebar.
- **Expected results**: the sidebar still collapses and expands for the current page session. No error is thrown, no error boundary is shown, and nothing is logged to the console. The state simply does not persist across a reload.

---

## Setup integration test environment

### 1. Start the backend
```bash
# Real backend (from backend/)
uvicorn app.main:app --port 8000 --reload

# Or the frontend mock (from frontend/)
node mock-server.mjs
```

### 2. Start the frontend
```bash
cd frontend
npm run dev
```

### 3. Configure the endpoint (only if not the default)
```bash
export VITE_BACKEND_URL=http://localhost:8001
```

---

## Run integration tests

### Execution
Automated execution is not available — there is no test runner in this project and adding one would violate NFR-2.1. Execute Scenarios 1–21 manually, in order, using the checklist in `e2e-test-instructions.md`.

### Verify service interactions
| # | Scenario | Result |
|---|---|---|
| 1 | Register → auto sign-in → workspace | ☐ Pass ☐ Fail |
| 2 | Register rejects a duplicate email | ☐ Pass ☐ Fail |
| 3 | Login posts to `/api/auth/login` only | ☐ Pass ☐ Fail |
| 4 | Login shows an inline error on bad credentials | ☐ Pass ☐ Fail |
| 5 | Route guards (4 cases) | ☐ Pass ☐ Fail |
| 6 | Auth pages link to each other | ☐ Pass ☐ Fail |
| 7 | Global 401 clears the session | ☐ Pass ☐ Fail |
| 8 | Chat streaming end to end | ☐ Pass ☐ Fail |
| 9 | Chat history, search, delete | ☐ Pass ☐ Fail |
| 10 | Settings: keys + MCP snippet = `legalwave` | ☐ Pass ☐ Fail |
| 11 | LegalWave branding throughout | ☐ Pass ☐ Fail |
| 12 | Background on auth screens and in the workspace | ☐ Pass ☐ Fail |
| 13 | App usable if the artwork fails to load | ☐ Pass ☐ Fail |

### Logs location
Browser DevTools console and Network panel; backend logs in the terminal running uvicorn.

### Cleanup
```bash
# stop the dev server and the backend
# clear the session:
#   localStorage.clear()   in the browser console
```
