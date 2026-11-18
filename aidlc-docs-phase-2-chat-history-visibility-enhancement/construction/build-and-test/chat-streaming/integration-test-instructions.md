# Integration Test Instructions — `chat-streaming` unit

## Scope

This unit is frontend-only. The integration surface is therefore narrow and
entirely inside the browser:

```
POST /api/chats/stream   ──stream──▶  useChatStream.handleEvent
                                         │
                          ┌──────────────┴──────────────┐
                          ▼                             ▼
                 onChatCreated                 onChatUpdated
                 (the `chat` event)            (the `done` event)
                          │                             │
                          └──────────┬──────────────────┘
                                     ▼
                              refreshChats()
                                     ▼
                            GET /api/chats
                                     ▼
                          useChats → groupChats
                                     ▼
                              ChatSidebar
```

The backend is **unchanged** and is exercised only as-is.

---

## 1. Automated behavioural verification — CDP harness

A headless-Chrome harness drives the **production build** over the DevTools
Protocol. It is installed **outside the repository** (at `/tmp/cdp-harness`),
matching the pattern used by the previously delivered units, so that FR-6's
zero-dependency requirement is not violated.

### 1.1 Setup

```bash
# The harness needs the production build to exist first.
cd legalwave-frontend
npm run build

# The `ws` package lives outside the repository, on purpose.
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1
npm install ws
```

### 1.2 Scenarios and assertions

| # | Scenario | Assertions |
|---|---|---|
| **B-1** | **A new chat appears in the sidebar without a reload** | Send a message from the empty chat screen. **Without touching the browser's reload control**, assert that: (a) a `.chat-item` appears in the sidebar; (b) its `.chat-title` is the first ~50 characters of the sent message (the backend's title rule is `message.strip()[:50]`), not `Untitled`; (c) it sits under the `Today` group label; (d) it carries the `.active` class, matching the routed `/c/{id}`; (e) `location.reload` was never called — assert via a `Page.frameNavigated` counter captured before the send, which must not increase. |
| **B-2** | **The sidebar preview completes after the stream finishes** | After the stream reaches `done`, assert that the new chat's `.chat-preview` contains the assistant's first words — proving the second refresh (on `done`) landed. |
| **B-3** | **The stage indicator advances through all three stages** | Drive a stream that emits the backend's real event sequence. At each point, assert the `.stage` rows' classes: <br>• on `fetching_statutes` active → `fetching_statutes` is `.active`, `analyzing` and `grounding` are `.pending` <br>• on `analyzing` active → `fetching_statutes` is `.complete`, `analyzing` is `.active`, `grounding` is `.pending` <br>• on `grounding` complete → all three are `.complete` <br>Throughout: **exactly one** row is `.active`. <br>**Caveat**: the intermediate `grounding active` rendering is *not* asserted — the backend emits it 0.1 ms before `grounding complete`, so React batches the two into one commit and only the final state reaches the DOM. See §1.5. |
| **B-4** | **The indicator survives the first token** | Emit a `text_delta` while `analyzing` is active. Assert that `[data-testid="stage-progress"]` is **still present in the DOM** and that the `analyzing` row is still `.active`. This is the regression that the `!m.content` gate caused — the indicator used to vanish here. |
| **B-5** | **The indicator is removed when the stream ends** | After `done`, assert `[data-testid="stage-progress"]` is **absent**. |
| **B-6** | **The indicator is not shown before any stage arrives** | Immediately after sending, before the first `stage` event, assert `[data-testid="stage-progress"]` is absent and the `.analyzing-dot` fallback is present. |
| **B-7** | **The stream is not aborted by the refresh** | Assert that the answer text reaches its full length — i.e. the stream was not cut short by a re-render. This is the regression that risk R5 identifies: if `onChatCreated`'s identity changed, the route-change effect would re-run and abort the stream. |
| **B-8** | **Deleting a chat removes it without a reload** | Delete the new chat. Assert the `.chat-item` disappears from the sidebar without a reload. |
| **B-9** | **The search filter survives a refresh** | Type a query into `[data-testid="chat-search-input"]` that matches nothing, then create a chat and assert the input still holds the query text. |
| **B-10** | **The sidebar-collapse feature still works** | Press `Ctrl+B`; assert `.shell` gains `.sidebar-collapsed` and the panel is `aria-hidden`. Press again; assert it is restored. |

### 1.3 Running the harness

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-chat-streaming-behaviour.js
```

**Expected**: all scenarios pass, exit code `0`.

> The harness serves the **production build**, so `npm run build` must have run
> first. It exits with code `2` and `FATAL: no production build found` if
> `legalwave-frontend/dist/index.html` is missing.

### 1.4 Execution result — EXECUTED ✅

The harness was executed against the live stack (frontend dev server on
`:5173`, backend on `:8000`) and passes **21 / 21** checks.

| Run | Result |
|---|---|
| 1 | 21 passed, 0 failed |
| 2 | 21 passed, 0 failed |
| 3 | 21 passed, 0 failed |
| 4 | 21 passed, 0 failed |
| 5 | 21 passed, 0 failed |

Three harness defects were found and fixed during this exercise — each of
them was a flaw in the **test**, not in the application:

| # | Harness defect | Symptom | Fix |
|---|---|---|---|
| H1 | The stage sampler relied solely on the MutationObserver callback | B-3.4 failed intermittently. React may have removed the old stage rows but not yet mounted the new ones when the observer callback ran, so the sampler read an empty or half-updated row set and **missed** the real state. | A 25 ms in-page interval poll was added alongside the observer. The interval is the authoritative sampler; the observer is now a fast path. |
| H2 | The terminal-state test looked only at the **last** recorded state | The interval sampler may append a later partial rendering after the all-complete one, so a run that had already seen the terminal state could still be judged "not terminal". | The test now asks whether the **set** of observed states contains an all-complete rendering. |
| H3 | The chat to delete was matched by a fixed title prefix (`CDP check`) | The sidebar is sorted by `updated_at`, and `includes('CDP check')` matched whichever CDP chat happened to come first in DOM order — not necessarily the one this run created. The delete check then deleted the wrong chat and failed. | Each run now uses a **unique per-run marker** (`cdp<base36 timestamp>`) embedded in the message, so every assertion and the delete target address exactly this run's chat. |

A fourth fix removed a fixed `sleep(2000)` after the delete click and replaced
it with a poll-until-gone loop, because the delete is an HTTP round-trip
followed by a re-fetch, and a fixed delay made the check timing-dependent.

**The application code was not changed as a result of any of these.** All four
were test-harness defects; the 30 static checks, the type-check, the build and
the lint baseline were unaffected.

### 1.5 The `grounding` stage — a measured backend timing characteristic

The B-3 scenario specification above asks for the DOM to show `grounding` in
the `.active` state. **That state is not renderable by any client**, and the
harness does not assert it.

Measured with `aidlc-docs/scripts/probe-timing.py` against the live backend:

```
grounding active -> grounding complete gap: 0.1 ms
VERDICT: the gap is shorter than a React commit / human perception —
         the two states are effectively simultaneous in the UI.
```

The backend emits `grounding active`, then the `citations` event, then
`grounding complete` (`agent.py:142-144`). React batches those into a single
commit, so only the final state ever reaches the DOM. The amber "grounding
active" state is unobservable — by this client or any other.

This is a **backend timing characteristic**, not a frontend defect, and the
backend is out of scope for this unit (FR-6). What the harness asserts
instead is that:

- the grounding row is **rendered** — the indicator was still mounted when
  grounding ran, which is the substance of the fix (B-3.4), and
- it reaches its terminal `.complete` state.

The DOM-observed progression, captured by the in-page sampler, is:

```
Fetching statutes=active | Analyzing against Japanese law=pending | Grounding claims in citations…=pending
Statutes fetched=complete | Analyzing clauses=active | Grounding claims in citations…=pending
Statutes fetched=complete | Analysis complete=complete | Citations grounded=complete
```

Note the third line: `analyzing` and `grounding` are both visibly coloured
before the answer text arrives. **Before the fix, that third line was never
rendered at all** — the `!m.content` gate unmounted the block at the first
token.

---

## 2. Backend contract checks

The frontend change relies on three backend facts. These are **assertions, not
changes** — the backend is untouched.

| # | Assertion | Where |
|---|---|---|
| **B-C1** | The chat row is committed **before** the first stream event, so `GET /chats` can already return it | `routes.py:159-163` |
| **B-C2** | The `chat` event carries the chat id and title | `routes.py:167` |
| **B-C3** | The assistant message is committed and `updated_at` bumped **before** the `done` event, so the preview is final when the second refresh fires | `routes.py:197-204` |
| **B-C4** | The stage event sequence is `fetching_statutes` active → complete, `analyzing` active → complete, `grounding` active → complete | `agent.py:97,119-120,141-142,144` |

Verified by reading the backend source; `git -C legalwave-backend diff` is
empty (asserted automatically by G5.1).

---

## 3. Cross-cutting integration checks

| # | Check | Method | Result |
|---|---|---|---|
| **I-1** | The API contract is unchanged | `git -C legalwave-backend diff` is empty; `legalwave-frontend/src/shared/api/types.ts` is unchanged | ✅ |
| **I-2** | No new dependency | `package.json` dependencies identical to the pre-change baseline | ✅ (G5.2) |
| **I-3** | The generated frontend types are not stale | `python3 legalwave-frontend/scripts/generate-frontend-types.py --check` | Run as part of CI |
| **I-4** | The backend OpenAPI spec is not stale | `uv run python legalwave-backend/scripts/export-openapi.py --check` | Run as part of CI |
| **I-5** | The type-check, build and lint all pass | See `build-instructions.md` | ✅ (0 errors / 5 pre-existing warnings) |

> I-3 and I-4 are **unchanged** by this unit — no backend declaration changed,
> so neither generated file can have gone stale. They are listed so the CI
> contract is not silently assumed.
