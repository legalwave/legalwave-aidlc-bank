# Requirements — `chat-streaming` enhancement unit

**Unit**: `chat-streaming`
**Depth**: Minimal — two narrow, fully-diagnosed frontend defects with no ambiguity, no architectural choice and no business-logic change.
**Date**: 2026-11-01

---

## 1. Intent Analysis

| Field | Value |
|---|---|
| **User request** | A newly created chat must appear in the sidebar without a browser refresh. Separately, after sending a query only the "fetching statutes" event is colour-highlighted — the "analyzing" and "grounding" events are never coloured. |
| **Request type** | Enhancement + bug fix (both frontend-only, both presentational/state-plumbing) |
| **Scope estimate** | Multiple components within one application — `legalwave-frontend/` only. 3 files changed, 0 new files, 0 dependencies added. |
| **Complexity estimate** | Simple — both root causes are single-expression, fully localised, and both fixes follow patterns already present in the codebase. |
| **Stated intent** | "Since it's a small enhancement and fix, do it fast." → scope is deliberately narrow; no refactoring, no new abstractions, no speculative work. |

### 1.1 User-facing problem statement

A user opens the chat screen, starts a **new chat**, sends a message, and watches the answer stream in. Two things are wrong:

1. The chat they just created **does not appear in the left sidebar**. The sidebar still shows the chat list as it was when the page loaded. The user must reload the browser to see their own new chat. The chat is *there* — it is saved, it is routed to, the conversation is visible in the thread — it is simply absent from the list beside it, which makes the app feel broken and makes a just-created chat easy to lose.
2. The streaming progress indicator shows one amber "active" dot on **"Fetching statutes from e-Gov…"** and then, at the moment the first token of the answer appears, the entire progress block **vanishes**. The user never sees the indicator advance to **"Analyzing against Japanese law"** and never sees **"Grounding claims in citations…"** at all. The three-stage progression the backend already computes is invisible for two of its three stages.

### 1.2 Why this happens

Both defects are **rendering/refresh-timing** defects, not data defects. The backend already does the right thing in both cases:

- The chat row is created and committed (`routes.py:155-163`) **before** the first byte of the stream is yielded, so the new chat is persisted and is returned by `GET /chats` at any later moment.
- The backend emits the complete stage progression (`agent.py:97` → `119-120` → `141-142` → `144`): fetching active, fetching complete, analyzing active, analyzing complete, grounding active, grounding complete.

The frontend receives both correctly and then throws them away at the last moment. Full analysis in `audit.md` § Workspace Detection and repeated here in § 4.

---

## 2. Functional Requirements

### FR-1 — A newly created chat appears in the sidebar without a page refresh
When a chat is created by the user's own action in the chat screen (sending the first message of a new conversation), that chat **must** appear in the sidebar chat list **without any browser reload**, and **without** the user navigating away and back.

- The sidebar entry must be present in the same rendering pass in which the chat is created.
- The entry must show the chat's title (the backend-derived title from the first message) — not a placeholder such as "New chat", and not an empty row.
- The entry must be grouped correctly by recency. A chat created now belongs to the **Today** group.
- The entry must become the **active/selected** chat in the sidebar, because the app navigates to `/c/{id}` at that moment. The selected state and the routed id must agree.
- The same requirement applies when the new chat is created **with a file attachment** (the `uploaded` / `reading_file` stages precede the rest of the stream) and when it is created **without** one.

### FR-2 — The sidebar list stays correct after the initial load
The sidebar chat list must not become stale in either direction:

- A chat created in this session **must** appear (FR-1).
- A chat deleted in this session **must** disappear without a reload.
- The list must not be re-fetched in a way that clobbers the user's in-progress search filter or collapses the scroll position of the list.
- The list must not be re-fetched on every render, and must not introduce a render loop.

### FR-3 — The streaming stage indicator advances through all three stages
The progress indicator must visibly advance through the full backend-defined progression, and the **currently running** stage must be the one that is highlighted:

| Order | Stage key | Label shown | Highlight while running |
|---|---|---|---|
| 1 | `fetching_statutes` | Fetching statutes from e-Gov… | active (amber, pulsing) |
| 2 | `analyzing` | Analyzing against Japanese law | active (amber, pulsing) |
| 3 | `grounding` | Grounding claims in citations… | active (amber, pulsing) |

- Exactly **one** stage is `active` at any moment; the stages before it are `complete` and the stages after it are `pending`.
- A stage that has finished shows the `complete` treatment (green filled dot with a checkmark).
- A stage that has not started shows the `pending` treatment (dimmed dot).
- When a stage transitions from `active` to `complete`, the **next** stage becomes `active` — the highlight moves down the list.

### FR-4 — The stage indicator stays visible for the whole stream
The progress indicator must remain rendered from the moment the first stage event arrives until the stream ends. It must **not** disappear part-way through a response.

- The indicator must remain visible while answer text is streaming in — this is precisely the window in which `analyzing` and `grounding` are active, and it is the window in which the indicator currently vanishes.
- The indicator must remain visible after the final stage completes, for as long as the message is still streaming.
- The indicator is removed when the message stops streaming (the `done` event, an `error` event, or the abort/stop path), which is the existing behaviour and is unchanged.
- The indicator must not be shown for a message that is not streaming.

### FR-5 — The indicator reflects the backend's stage events, not a local timer or guess
The highlighted stage is driven by the `stage` stream events emitted by the backend, and by nothing else.

- The frontend must not hard-code a stage progression, and must not advance the highlight on a timer, on `text_delta`, or on any locally-inferred signal.
- A stage event that arrives for a stage not in the known order must still be rendered (the existing `extras` behaviour is preserved).
- A stage event must update the existing entry for that stage rather than appending a duplicate row.
- The label supplied by the backend wins; the frontend's fallback label is used only when the backend supplies none.

### FR-6 — Both defects are fixed without changing the backend or the API contract
- No file under `legalwave-backend/` is modified.
- No endpoint, request shape, response shape or event type changes. The `StreamEvent` union in `legalwave-frontend/src/shared/api/types.ts` is unchanged.
- No new dependency is added to `legalwave-frontend/`.
- No new file is added to `legalwave-frontend/` — the fixes are edits to existing files.

---

## 3. Non-Functional Requirements

| ID | Requirement | Rationale |
|---|---|---|
| **NFR-1** | The frontend must still pass `tsc -b` with zero errors. | The existing type contract is the primary safety net for a change of this kind. |
| **NFR-2** | The frontend must still build successfully (`vite build`) with no new runtime dependency. | The change must not alter the shipped bundle's dependency surface. |
| **NFR-3** | `npm run lint` must report zero errors. Pre-existing warnings are acceptable and must not increase in count. | Matches the state recorded for the previously delivered units. |
| **NFR-4** | The sidebar refresh must be a **single** targeted re-fetch triggered by the creation event — not a poll, not a timer, not a re-fetch on every render. | A poll would add load on the backend and can mask the actual defect; a render-driven fetch would loop. |
| **NFR-5** | The re-fetch must not clear the user's search filter or reset the sidebar's scroll position. | Refreshing the browser loses this state too — a fix that reintroduces it is not a fix. |
| **NFR-6** | No visual/CSS change is introduced. The existing `.stage.active`, `.stage.complete` and `.stage.pending` rules in `chat.css` are reused as-is. | The CSS was already correct; only the render condition was wrong. |
| **NFR-7** | The fix must not regress the existing sidebar-collapse feature, the chat routing, the abort/stop path, or the file-upload path. | All four are adjacent to the changed code and share state with it. |

---

## 4. Root Cause Analysis

### 4.1 Defect 1 — new chat absent from the sidebar

| # | Location | Behaviour |
|---|---|---|
| 1 | `useChats.ts:31-38` | `refreshChats()` runs inside `useEffect(() => { refreshChats() }, [refreshChats])`. The dependency is a stable `useCallback`, so the effect runs **once on mount** and never again. The sidebar list is a mount-time snapshot. |
| 2 | `useChatStream.ts:31-37` | On the `chat` event the hook calls `onChatCreated(ev.chat_id)`. |
| 3 | `ChatPage.tsx:29-32` | `onChatCreated` calls `nav(chatPath(id), { replace: true })` — and nothing else. `refreshChats` is never invoked. |
| 4 | `routes.py:155-163` | The backend creates and commits the `Chat` row **before** streaming. `GET /chats` would return it. |

**Conclusion**: the data is correct and persisted; the frontend simply never invalidates its snapshot. Fix = call the existing `refreshChats()` when a chat is created.

### 4.2 Defect 2 — only "fetching statutes" is coloured

| # | Location | Behaviour |
|---|---|---|
| 1 | `agent.py:97,119-120,141-142,144` | The backend emits the **full and correct** progression: fetching active → fetching complete + analyzing active → analyzing complete + grounding active → grounding complete. |
| 2 | `useChatStream.ts:38-52` | The `stage` handler upserts each stage by key with its `status` and `label`. The hook's state is correct. |
| 3 | `agent.py:122` | The first `text_delta` is emitted **while `analyzing` is active**. |
| 4 | `MessageView.tsx:28` | `showProgress = m.streaming && !m.content && stages.length > 0` — from the first token onward `m.content` is truthy, so `showProgress` is `false`. |
| 5 | `MessageView.tsx:33` | `{showProgress && <StageProgress .../>}` — the component **unmounts**. |
| 6 | `chat.css:72-75` | `.stage.complete` and `.stage.active` are already styled correctly. No CSS defect. |

**Conclusion**: the stage data is correct and complete; the component that renders it is hidden at precisely the moment `analyzing` and `grounding` begin. The `!m.content` clause is what makes the indicator visible only during the `fetching_statutes` window. Fix = decouple the indicator's visibility from the presence of answer text.

---

## 5. Proposed Implementation Approach

Both fixes are confined to `legalwave-frontend/` and reuse existing patterns.

### 5.1 Sidebar live-refresh
- `ChatPage.tsx` — extend the existing `onChatCreated` callback to call the already-available `refreshChats()` in addition to the existing navigation. `refreshChats` is already returned by `useChats()` and already used by the delete path (`ChatPage.tsx:60`), so this reuses an established pattern in the same file rather than introducing a new mechanism.
- Ordering: refresh the list and navigate. The re-fetch is asynchronous; the sidebar will update when it resolves (a single `GET /chats` round-trip, typically a few tens of milliseconds).
- No change to `useChats.ts` is required for FR-1. `useChats.ts` is left unchanged to minimise the diff, unless the implementation reveals that `refreshChats` does not preserve the filter/scroll state required by FR-2 — in which case the smallest conforming adjustment is made there.

### 5.2 Stage-status colouring
- `MessageView.tsx` — change the visibility condition so the indicator remains rendered while the message is streaming and at least one stage exists, regardless of whether answer text has started. The `!m.content` clause is removed from the visibility test; `stages.length > 0` and `m.streaming` remain.
- `MessageView.tsx` — the separate fallback (`m.streaming && !showProgress && !m.content && !m.tools?.length`) is retained for the pre-stage window, where the backend has not yet emitted any stage event. It remains reachable only in that window.
- `StageProgress.tsx` — no change expected. It already renders each stage with its `status` class and already orders by `STAGE_ORDER`. It is reviewed during implementation to confirm that exactly one stage can be `active` at a time given the backend's event ordering.
- `chat.css` — **no change**. The existing `.active` / `.complete` / `.pending` rules are correct and are reused as-is (NFR-6).

---

## 6. Scope Exclusions

Explicitly **out of scope**, to keep this change small and fast as requested:

- The backend, the API contract, and the generated `types.ts`.
- The `AbortController` behaviour in `useChatStream.ts:96` (aborting on route change) — noted in the earlier MVP unit's workspace detection, but unrelated to either reported symptom and changing it risks the streaming path.
- Persisting the assistant message incrementally (the backend writes it once at stream end, `routes.py:197-204`) — a separate concern from either reported symptom.
- Any refactor of the chat hooks, a new state-management abstraction, or a general-purpose cache/invalidation layer.
- Adding a test runner or a new test framework to the frontend.
- Any change to the phase-1 MVP documentation or the `aidlc-bank/` tree.

---

## 7. Acceptance Criteria

| # | Criterion | Verifies |
|---|---|---|
| AC-1 | Starting a new chat and sending a message makes the chat appear in the sidebar **without a browser reload**. | FR-1 |
| AC-2 | The new sidebar entry shows the real title, sits in the **Today** group, and is highlighted as the active chat. | FR-1 |
| AC-3 | Deleting a chat removes it from the sidebar without a reload, and the search filter and scroll position survive both a create and a delete. | FR-2 |
| AC-4 | During a stream, the highlight is on **Fetching statutes** → **Analyzing** → **Grounding** in that order, exactly one stage highlighted at a time, with finished stages shown as complete and not-yet-started stages shown as pending. | FR-3 |
| AC-5 | The progress block is visible for the entire duration of the response, including while answer text is streaming in and after the last stage completes. | FR-4 |
| AC-6 | The highlighted stage is derived from the backend `stage` events; the frontend contains no hard-coded progression, timer, or inference from `text_delta`. | FR-5 |
| AC-7 | `tsc -b` exits 0; `vite build` succeeds; `npm run lint` reports 0 errors and no increase in warnings; `git diff` over `legalwave-backend/` is empty; `legalwave-frontend/package.json` dependencies are unchanged. | FR-6, NFR-1…NFR-3 |
| AC-8 | Existing behaviour is preserved: sidebar collapse (`Ctrl+B`, rail, drawer), chat routing, stop/abort, file upload and the `uploaded`/`reading_file` stages all still work. | NFR-7 |

---

## 8. Verification Strategy

The project has no test runner, so verification follows the pattern established by the previously delivered units:

1. **Static** — `npx tsc -b` (0 errors), `npm run build`, `npm run lint` (0 errors), plus a small purpose-built static verifier script that asserts the specific source-level properties this fix depends on (e.g. that `MessageView` no longer gates the indicator on `!m.content`, and that the chat-created path calls `refreshChats`).
2. **Behavioural** — a headless-browser (CDP) harness driving the production build that: creates a chat and asserts the sidebar entry appears **without a reload**; asserts the stage highlight advances through all three stages; and asserts the indicator is still present while text is streaming.
3. **By-eye items** — the exact colour and animation of the amber active dot and the green complete dot, and the sidebar entry's visual alignment with the rest of the list.

The CDP harness is kept **outside** the repository (as with the previously delivered units) so that the zero-dependency requirement (FR-6) is not violated.

---

## 9. Traceability

| Requirement | Covered by | Plan step |
|---|---|---|
| FR-1 | `ChatPage.tsx` — `onChatCreated` calls `refreshChats()` | S3 |
| FR-2 | `useChats.ts` — filter/scroll preserved across refresh | S3, S4 |
| FR-3 | Backend events + `StageProgress` ordering (existing) + `MessageView` visibility | S2 |
| FR-4 | `MessageView.tsx` — visibility no longer gated on `!m.content` | S2 |
| FR-5 | `useChatStream.ts` `stage` handler (existing, unchanged) | S2 |
| FR-6 | No backend/contract/dependency change | S1, S5 |
| NFR-1…3 | `tsc -b`, `vite build`, `lint` | S5 |
| NFR-4 | Single targeted re-fetch on the creation event | S3 |
| NFR-5 | Filter/scroll preservation | S3, S4 |
| NFR-6 | `chat.css` unchanged | S2 |
| NFR-7 | Regression checks | S5 |

---

## 10. Extension Compliance

| Extension | Status | Applicability to this unit | Compliance |
|---|---|---|---|
| security-baseline | Opted out (user, MVP precedent) | N/A — no auth, secret handling, input surface, or new network endpoint is introduced. Both changes are client-side render/refresh logic on already-authenticated routes. | N/A |
| resiliency-baseline | Opted out (user, MVP precedent) | N/A — no deployed/distributed/stateful workload, no data store, no SLA, no failover path. The unit adds no runtime infrastructure. | N/A |
| property-based-testing | Opted out (user, MVP precedent) | N/A — the change introduces no new business logic, data transformation, serialization round-trip or stateful algorithm. The properties under test are render conditions, best asserted by static and CDP checks. Enabling PBT would also require a test-runner dependency, which FR-6 forbids. | N/A |

No enabled extension applies to this unit, so no extension rule produces a blocking finding. The "skip" of each extension is recorded in `audit.md`.
