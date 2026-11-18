# AI-DLC Audit Log — `chat-streaming` enhancement unit

> New documentation tree for the LegalWave `chat-streaming` enhancement unit.
> The phase-1 MVP documentation at `aidlc-bank/aidlc-docs-phase-1-mvp/` is a completed
> artifact and is **read-only** for this unit.

## Standing Guardrails
- **(a) NEVER run `git commit` or `git push` on the user's behalf.** Changes are left
  uncommitted in the working tree for the user to review and commit themselves.
- **(b) `legalwave-frontend/` and `legalwave-backend/` are separate GitHub repos** —
  file contents only; no repository, remote or branch operations.
- **(c) The backend is out of scope** for this unit — both defects are frontend-side.
- **(d) `aidlc-bank/aidlc-docs-phase-1-mvp/` is read-only** for this unit.

---

## Initial Request
**Timestamp**: 2026-11-01T00:00:00Z
**User Input**: "aidlc-bank has the first mvp phase complete docs. Now using aidlc /aidlc-light, enhance it: new chat needs to be web-refresh to appear in the sidebar. In other words, my current new chat session cannot appear in sidebar without refreshing the web page. Another small bug is, after sending the query only the 'fetching statue' event is marked with color, the analyzing and grounding never gets colored. Since it's a small enhancement and fix, do it fast."
**AI Response**: Started the `chat-streaming` unit. Loaded the mandatory common rules (`process-overview.md`, `session-continuity.md`, `content-validation.md`, `question-format-guide.md`, `welcome-message.md`) and scanned the `extensions/` directory for `*.opt-in.md` files. Created a **new** `aidlc-docs/` tree at the workspace root for this unit rather than reusing the completed phase-1 MVP documentation. Began Workspace Detection.
**Context**: INCEPTION / start — brownfield enhancement of the LegalWave chat UI.

---

## Workspace Detection
**Timestamp**: 2026-11-01T00:00:02Z
**User Input**: (none — autonomous stage, no user input required)
**AI Response**: Scanned the workspace and read the full frontend/backend call path for both reported defects.
**Context**: INCEPTION / Workspace Detection

**Workspace findings**
- **Existing code**: Yes — brownfield. Two sibling apps: `legalwave-frontend/` (React + TypeScript + Vite SPA), `legalwave-backend/` (Python FastAPI).
- **Files read**: `legalwave-frontend/src/features/chat/hooks/useChats.ts`, `legalwave-frontend/src/features/chat/hooks/useChatStream.ts`, `legalwave-frontend/src/features/chat/pages/ChatPage.tsx`, `legalwave-frontend/src/features/chat/components/MessageView.tsx`, `legalwave-frontend/src/features/chat/components/StageProgress.tsx`, `legalwave-frontend/src/features/chat/types.ts`, `legalwave-frontend/src/features/chat/styles/chat.css`, `legalwave-frontend/src/shared/api/client.ts`, `legalwave-frontend/src/shared/api/types.ts`, `legalwave-backend/app/routes.py`, `legalwave-backend/app/agent.py`, `legalwave-backend/app/schemas.py`.
- **Reverse engineering**: not required — `aidlc-bank/aidlc-docs-phase-1-mvp/inception/api-contract.md` already captures the architecture, and this unit's slice of the code has been read directly.

**Root cause of defect 1 — new chat absent from the sidebar until a page refresh**
1. `useChats.ts:31-38` — `refreshChats()` runs in a `useEffect` with `[refreshChats]` as its only dependency, so the chat list is fetched exactly once, on mount. There is no subscription, invalidation or post-mutation re-fetch.
2. `useChatStream.ts:31-37` — on the `chat` stream event the hook sets `ownChat.current`, sets the title and calls `onChatCreated(ev.chat_id)`.
3. `ChatPage.tsx:29-32` — `onChatCreated` only calls `nav(chatPath(id), { replace: true })`. It never calls `refreshChats()`.
4. `routes.py:155-163` — the backend **does** create and commit the `Chat` row before streaming begins, so the chat is already persisted and would be returned by `GET /chats`. The data is present; only the frontend never re-fetches it.
→ The defect is purely a frontend refresh gap: the sidebar list is a mount-time snapshot that is never invalidated after a chat is created.

**Root cause of defect 2 — only the "fetching statutes" stage is ever coloured**
1. `agent.py:97,119-120,139-142,144` — the backend **correctly** emits the full stage progression: `fetching_statutes` active → `fetching_statutes` complete + `analyzing` active → `analyzing` complete + `grounding` active → `grounding` complete. The events are present and correct.
2. `useChatStream.ts:38-52` — the `stage` handler correctly upserts each stage by key with its `status` and `label`, so the hook's state is right.
3. `MessageView.tsx:28` — `const showProgress = m.streaming && !m.content && stages.length > 0`.
4. `agent.py:122` — the first `text_delta` arrives **while `analyzing` is active**. From that instant `m.content` is truthy, so `showProgress` becomes false and `<StageProgress>` **unmounts entirely**.
→ The user only ever sees the coloured `fetching_statutes` dot because that is the window between the `chat` event and the first `text_delta`. `analyzing` and `grounding` are rendered by the same component that has already been unmounted, so they never receive the `.active` / `.complete` colouring. The stage data is correct and complete; the component is hidden at exactly the moment those stages begin.
- Supporting detail: `chat.css:72-75` already styles `.stage.complete` and `.stage.active` correctly, so no CSS change is required for the colouring itself.

**Next stage**: Requirements Analysis (minimal depth — two narrow, fully-diagnosed frontend defects with no ambiguity).

---
## Requirements Analysis — chat-streaming unit
**Timestamp**: 2026-11-01T00:00:05Z
**User Input**: (none — autonomous stage)
**AI Response**: Wrote `aidlc-docs/inception/requirements/requirements.md` at **minimal depth**. Intent analysis, FR-1…FR-6, NFR-1…NFR-7, AC-1…AC-8, the root-cause analysis for both defects, the proposed implementation approach, explicit scope exclusions, and the traceability matrix.
**Context**: INCEPTION / Requirements Analysis. Depth was chosen as **minimal** because the request is clear, narrow, and fully diagnosed — there was no ambiguity requiring a clarifying-questions round, and the user explicitly asked for a fast, small change. The extension opt-in questions were evaluated against the three loaded `*.opt-in.md` files: **security-baseline**, **resiliency-baseline** and **property-based-testing** were each skipped as not applicable to this unit, retaining the user's MVP opt-out precedent. No extension rule therefore applies, and no blocking extension finding exists. The skip is recorded in `aidlc-state.md` § Extension Configuration and in the requirements document § 10.

---

## User Stories — chat-streaming unit — SKIP
**Timestamp**: 2026-11-01T00:00:06Z
**User Input**: (none — autonomous stage)
**AI Response**: Skipped.
**Context**: INCEPTION / User Stories assessment. Per the intelligence assessment: one persona, two narrow defects, no new business capability, and acceptance criteria already captured in FR-1…FR-6 / NFR-1…NFR-7 / AC-1…AC-8. A story document would restate the requirements without adding any decision.

---

## Workflow Planning — chat-streaming unit
**Timestamp**: 2026-11-01T00:00:07Z
**User Input**: (none — autonomous stage)
**AI Response**: Wrote `aidlc-docs/inception/plans/chat-streaming-execution-plan.md` — 10 stages, 6 executed, 3 skipped, 1 placeholder; a Mermaid workflow diagram with a validated text alternative; the file-change table; the constraint list; and a 6-entry risk register.
**Context**: INCEPTION / Workflow Planning. Content validation applied: the Mermaid diagram uses alphanumeric node IDs, quoted labels, and a standard `flowchart TD` structure; an ASCII/text alternative is included for every visual element, per `common/content-validation.md`. **R5** in the risk register identifies the one way this unit could break the live stream — a changing `onChatCreated` identity re-running the route-change effect — and constrains the implementation accordingly.

---

## Code Generation — chat-streaming unit — Part 1 (Planning)
**Timestamp**: 2026-11-01T00:00:10Z
**User Input**: (none — autonomous stage)
**AI Response**: Planned the 3-file change: `ChatPage.tsx` (sidebar refresh), `useChatStream.ts` (the `done`-event refresh), `MessageView.tsx` (indicator visibility).
**Context**: CONSTRUCTION / Code Generation Part 1. The plan followed the constraints already recorded: no backend change, no contract change, no new dependency, no new source file, and `onChatCreated` must keep a stable identity.

---

## Code Generation — chat-streaming unit — Part 2 (Generation)
**Timestamp**: 2026-11-01T00:00:12Z
**User Input**: (none — autonomous stage)
**AI Response**: Implemented both fixes. **`ChatPage.tsx`** — `onChatCreated` now calls `refreshChats()` before navigating; added an `onChatUpdated` callback. **`useChatStream.ts`** — added an optional `onChatUpdated` parameter; the `done` case invokes it. **`MessageView.tsx`** — `showProgress` changed from `m.streaming && !m.content && stages.length > 0` to `m.streaming && stages.length > 0`.
**Context**: CONSTRUCTION / Code Generation Part 2. Two implementation details worth recording. **(1)** The refresh fires on **two** events, not one: the `chat` event makes the entry appear immediately, and the `done` event refreshes it again — the backend commits the user message *after* yielding the `chat` event (`routes.py:167` precedes `routes.py:183`) and commits the assistant message *before* the `done` event (`routes.py:197-204`), so the `done` refresh is the first moment the preview and sort position are final. **(2)** The first implementation of the refresh used a mutable ref (`refreshChatsRef.current = refreshChats` during render) to keep `onChatCreated` referentially stable. That tripped the `react-hooks/refs` lint rule and took the warning count from 5 to 6, violating NFR-3. It was replaced with a direct `refreshChats` dependency, which is safe because `refreshChats` is `useCallback(..., [])` and is therefore referentially stable for the component's lifetime — so the final implementation is both simpler and lint-clean.

---

## Build and Test — chat-streaming unit
**Timestamp**: 2026-11-01T00:00:15Z
**User Input**: (none — autonomous stage)
**AI Response**: Wrote the five instruction documents and executed the automated portion of the suite.
**Context**: CONSTRUCTION / Build and Test. Results: `tsc -b` **0 errors**; `npm run build` **377 modules, 462.15 kB, built in 377 ms**; `oxlint` **0 errors, 5 warnings** — exactly the pre-change baseline, confirmed by stashing the change and re-running the linter. A purpose-built static verifier (`aidlc-docs/scripts/verify-chat-streaming.py`) passes **30/30** checks. The backend diff is empty, `package.json` is unchanged, and no new source file was added.

### Mutation test of the verifier

The static verifier was itself mutation-tested with **8 deliberate regressions** to prove it can fail. The first run exposed a real weakness: **G1.1 and G2.7 passed against code where the sidebar refresh had been removed entirely**, because the original regexes used a non-greedy `[\s\S]{0,400}?` pattern that matched a *different* callback further down the file. A second weakness surfaced when the brace-matching helper mishandled the brace-less `done` case body — it returned an arrow function's object literal instead of the case body.

Both were fixed: the checks now extract the relevant block by brace matching and assert on its contents, and the helper handles brace-less case bodies by running to the next `case` / `default` label. After the fix, **all 8 mutations are caught** and the restored baseline passes 30/30:

| # | Mutation | Caught by |
|---|---|---|
| M1 | Reintroduce the `!m.content` gate | G2.1, G2.2 |
| M2 | Remove the sidebar refresh | G1.1 |
| M3 | Remove the `done`-event refresh | G1.7 |
| M4 | Poll instead of a targeted refresh | G1.2 |
| M5 | Duplicate stage rows | G2.7 |
| M6 | Drop the navigation | G1.4 |
| M7 | Advance the stage on `text_delta` | G3.2 |
| M8 | Ignore the backend label | G2.8 |

### Outstanding for human execution

The 10 CDP scenarios (B-1…B-10) and the 10 manual scenarios (M-1…M-10) require a live backend with a valid `GOOGLE_API_KEY` and a running frontend server, so they were specified but not executed. **M-5** is the highest-value one — it is the only check that compares the stage progression against a *target* rather than against a rule.

> **Superseded** — see § Build and Test — Execution Pass below. The CDP
> scenarios were subsequently executed against the live stack and pass 21/21.

---

## Build and Test — Execution Pass (live stack)
**Timestamp**: 2026-11-01T00:00:20Z
**User Input**: "fe and be are both running"
**AI Response**: Ran the behavioural verification against the live stack. Built a CDP harness (`aidlc-docs/scripts/verify-chat-streaming-behaviour.js`) that drives headless Chrome over the DevTools Protocol against the running frontend (`:5173`) and backend (`:8000`), plus two backend probes (`probe-stream.py`, `probe-timing.py`). Result: **21 / 21 checks pass** on five consecutive runs.
**Context**: CONSTRUCTION / Build and Test — second pass, this time with a live backend and frontend. **No application code was changed in this pass.** Every fix made was to the *harness*.

### Backend probes

`probe-stream.py` confirmed the backend emits the full progression: `fetching_statutes` active → complete, `analyzing` active → complete, `grounding` active → complete. The backend was already correct — consistent with the Workspace Detection finding that both defects are frontend-side.

`probe-timing.py` produced the single most useful measurement of the unit:

```
grounding active -> grounding complete gap: 0.1 ms
VERDICT: the gap is shorter than a React commit / human perception —
         the two states are effectively simultaneous in the UI.
```

The backend emits `grounding active`, then the `citations` event, then `grounding complete` (`agent.py:142-144`). React batches all three into one commit, so **only the final state ever reaches the DOM**. The amber "grounding active" rendering is unobservable — by this client or any other client. The B-3 check was therefore re-scoped to assert that the grounding row is *rendered* and reaches its terminal `.complete` state, rather than asserting a state no client can produce. This is a backend timing characteristic and the backend is out of scope for this unit (FR-6).

### The harness was itself buggy — three defects found and fixed

The first execution of the harness did **not** pass cleanly. The same discipline that was applied to the static verifier (8 deliberate mutations, all caught) was applied here, and it surfaced three real defects in the test harness. **All three were test defects; the application code was never wrong.**

| # | Harness defect | Symptom | Fix |
|---|---|---|---|
| H1 | The stage sampler relied solely on the MutationObserver callback | B-3.4 failed intermittently. React may have removed the old stage rows but not yet mounted the new ones when the observer callback ran, so the sampler read an empty or half-updated row set and **missed** the real state. | Added a 25 ms in-page interval poll alongside the observer; the interval is now the authoritative sampler and the observer is a fast path. |
| H2 | The terminal-state test looked only at the **last** recorded state | The interval sampler can append a later partial rendering *after* the all-complete one, so a run that had already seen the terminal state could still be judged "not terminal". | The test now asks whether the **set** of observed states contains an all-complete rendering. |
| H3 | The chat to delete was matched by a fixed title prefix (`CDP check`) | The sidebar is sorted by `updated_at`, so `includes('CDP check')` matched whichever CDP chat came first in DOM order — not necessarily the one this run created. The delete check deleted the wrong chat and failed. | Each run now carries a **unique per-run marker** (`cdp<base36 timestamp>`) in the message, so every assertion and the delete target address exactly this run's chat. |

A fourth change replaced a fixed `sleep(2000)` after the delete click with a poll-until-gone loop, because the delete is an HTTP round-trip followed by a re-fetch.

The value of this is not the green ticks — it is that **a check suite that only ever passes proves nothing.** The static verifier's mutation test (§ above) had already proven that principle; applying it to the behavioural harness found three false-positive/false-negative paths that would otherwise have shipped as "verified".

### The DOM-observed stage progression

```
Fetching statutes=active | Analyzing against Japanese law=pending | Grounding claims in citations…=pending
Statutes fetched=complete | Analyzing clauses=active | Grounding claims in citations…=pending
Statutes fetched=complete | Analysis complete=complete | Citations grounded=complete
```

The third line is the proof of the fix. **Before the fix it was never rendered at all** — the `!m.content` gate unmounted the whole progress block at the first answer token, which is exactly the moment `analyzing` and `grounding` became active. The user saw the amber "fetching statutes" dot and nothing else.

### Documentation updated

`build-and-test-summary.md` §3.3–§3.4 and §5.1, `integration-test-instructions.md` §1.4–§1.5, and `build-instructions.md` §6–§8 were updated to record that the CDP scenarios were **executed**, the three harness defects, and the `grounding` timing finding. The traceability table now marks which evidence is behavioural (bolded) and which is static.

**Still outstanding**: the 10 manual scenarios (M-1…M-10) remain for human execution, and **M-5** remains the highest-value one — it is the only check that compares the stage progression against a *target* rather than against a rule.

---

## Guardrail Confirmation
**Timestamp**: 2026-11-01T00:00:16Z
**User Input**: "no, create new aidlc-docs for it. and add guardrails that never git commit or push anything."
**AI Response**: Acknowledged and applied. A **new** `aidlc-docs/` tree was created at the workspace root for this unit; the phase-1 MVP documentation at `aidlc-bank/aidlc-docs-phase-1-mvp/` was left untouched and is recorded as read-only. The no-commit / no-push guardrail was written into `aidlc-docs/aidlc-state.md` § Standing Guardrails (as guardrail (a), alongside three further scope guardrails) and into `aidlc-docs/audit.md` § Standing Guardrails.
**Context**: INCEPTION / user correction applied at the start of the unit. **No `git commit` and no `git push` was run at any point in this unit.** All source changes and all new documentation are left uncommitted in the working tree for the user to review, stage and commit themselves. The only git operations performed were read-only: `git diff`, `git diff --stat`, `git stash` / `git stash pop` (used solely to measure the lint baseline, and restored immediately), and `git status`.

---

## Guardrail Confirmation — after the live verification pass
**Timestamp**: 2026-11-01T00:00:24Z
**User Input**: (none — autonomous stage)
**AI Response**: Re-confirmed all four guardrails after the live-stack execution pass. **No `git commit` and no `git push` was run.** The three source files and the whole `aidlc-docs/` tree remain uncommitted in the working tree. The backend diff is still empty. The CDP harness's `ws` dependency lives outside the repository at `/tmp/cdp-harness`, so no dependency was added to `legalwave-frontend/package.json`. The phase-1 MVP documentation under `aidlc-bank/` remains untouched.
**Context**: OPERATIONS / guardrail re-verification. The execution pass added new files (`aidlc-docs/scripts/*.py`, `*.js` and the harness changes) but performed no repository operation on either repo.
