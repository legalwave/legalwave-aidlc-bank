# Build and Test Summary — `chat-streaming` unit

**Unit**: `chat-streaming` — sidebar live-refresh + stage-status colouring
**Date**: 2026-11-01
**Status**: ✅ Complete

---

## 1. What was delivered

Two frontend defects, fixed in **3 files** with **+40 / −6 lines**.

| Defect | Root cause | Fix |
|---|---|---|
| **A new chat does not appear in the sidebar until the browser is reloaded** | `useChats` fetched the chat list once, on mount. Nothing invalidated that snapshot when the backend created a chat. | `ChatPage.onChatCreated` now calls the existing `refreshChats()`; `useChatStream` additionally refreshes on the `done` event so the preview completes. |
| **Only the "Fetching statutes" stage is coloured — "Analysing" and "Grounding" never are** | `MessageView` gated the progress block on `!m.content`. The first answer token unmounted the whole block — exactly when `analyzing` and `grounding` became active. | The block's visibility now depends only on `m.streaming` and `stages.length`. |

**Neither defect was a backend defect.** The backend already created and
committed the chat row before streaming, and already emitted the complete
stage progression. The frontend received both correctly and discarded them at
the last moment.

---

## 2. Files changed

| File | Change |
|---|---|
| `legalwave-frontend/src/features/chat/pages/ChatPage.tsx` | `onChatCreated` calls `refreshChats()` alongside the navigation; new `onChatUpdated` callback. |
| `legalwave-frontend/src/features/chat/hooks/useChatStream.ts` | New optional `onChatUpdated` parameter; the `done` case invokes it. |
| `legalwave-frontend/src/features/chat/components/MessageView.tsx` | `showProgress` no longer gated on `!m.content`. |

**Not changed**: the backend, the API contract, the generated `types.ts`,
`chat.css`, `StageProgress.tsx`, `useChats.ts`, `package.json`, and the whole
phase-1 MVP documentation tree.

---

## 3. Verification results

| Check | Command | Result |
|---|---|---|
| Type-check | `npx tsc -b` | ✅ **0 errors** |
| Production build | `npm run build` | ✅ 377 modules, built in 377 ms, 462.15 kB (gzip 143.01 kB) |
| Lint | `npm run lint` (oxlint) | ✅ **0 errors, 5 warnings** — exactly the pre-change baseline |
| Static verifier | `python3 aidlc-docs/scripts/verify-chat-streaming.py` | ✅ **30 passed, 0 failed** |
| Mutation test | 8 deliberate regressions | ✅ **all 8 caught** |
| **Behavioural (live stack)** | `node aidlc-docs/scripts/verify-chat-streaming-behaviour.js` | ✅ **21 passed, 0 failed** — 5 consecutive runs |
| Backend stage probe | `python3 aidlc-docs/scripts/probe-stream.py` | ✅ full progression emitted |
| Backend timing probe | `python3 aidlc-docs/scripts/probe-timing.py` | ✅ `grounding` gap measured at **0.1 ms** |
| Backend untouched | `git -C legalwave-backend diff` | ✅ empty |
| No new dependency | `package.json` | ✅ unchanged |
| No new source file | `git diff --stat` | ✅ 3 modified, 0 created |

### 3.1 The lint baseline was held

An earlier implementation of the sidebar refresh used a mutable ref
(`refreshChatsRef.current = refreshChats` during render) to avoid a
dependency-list change. That tripped the `react-hooks/refs` rule and took the
warning count from 5 to **6**, violating NFR-3.

It was replaced with a direct `refreshChats` dependency. This is safe because
`refreshChats` is `useCallback(..., [])` and therefore referentially stable
for the component's lifetime — so including it changes neither callback's
identity. The final implementation returns to the 5-warning baseline.

This mattered beyond lint: risk **R5** in the execution plan identifies a
changing `onChatCreated` identity as the one way this unit could abort the
live stream. The `useCallback([])` guarantee is what makes the simple
implementation correct.

### 3.2 The verifier was mutation-tested

A suite that always passes proves nothing. Eight deliberate regressions were
injected and **every one was caught**:

| # | Regression | Caught by |
|---|---|---|
| M1 | Reintroduce the `!m.content` gate | G2.1, G2.2 |
| M2 | Remove the sidebar refresh | G1.1 |
| M3 | Remove the `done`-event refresh | G1.7 |
| M4 | Poll instead of a targeted refresh | G1.2 |
| M5 | Duplicate stage rows | G2.7 |
| M6 | Drop the navigation | G1.4 |
| M7 | Advance the stage on `text_delta` | G3.2 |
| M8 | Ignore the backend label | G2.8 |

Two weaknesses were found and fixed during this exercise:

1. **G1.1 and G2.7 initially passed against broken code.** The original
   regexes used a non-greedy `[\s\S]{0,400}?` pattern that matched a
   *different* callback further down the file. The checks were rewritten to
   extract the relevant block by brace matching and assert on its contents.
2. **The brace-matching helper initially mishandled a brace-less `case` body.**
   The `done` case has no block of its own, so the helper returned the object
   literal of an arrow function instead. It now handles brace-less case
   bodies by running to the next `case` / `default` label.

### 3.3 The behavioural harness was executed — and it was itself buggy

The CDP harness was run against the live stack. It now passes **21 / 21** on
five consecutive runs, but it did not get there first time: **three of its own
defects had to be found and fixed.** Every one was a defect in the *test* —
**the application code was not changed as a result of any of them.**

| # | Harness defect | Symptom | Fix |
|---|---|---|---|
| H1 | The stage sampler relied solely on the MutationObserver callback | B-3.4 failed intermittently. React may have removed the old stage rows but not yet mounted the new ones when the observer callback ran, so the sampler read an empty or half-updated row set and **missed** the real state. | Added a 25 ms in-page interval poll alongside the observer. The interval is the authoritative sampler; the observer is now a fast path. |
| H2 | The terminal-state test looked only at the **last** recorded state | The interval sampler can append a later partial rendering *after* the all-complete one, so a run that had already seen the terminal state could still be judged "not terminal". | The test now asks whether the **set** of observed states contains an all-complete rendering. |
| H3 | The chat to delete was matched by a fixed prefix (`CDP check`) | The sidebar is sorted by `updated_at`, so `includes('CDP check')` matched whichever CDP chat came first in DOM order — not necessarily the one this run created. The delete check then deleted the wrong chat and failed. | Each run now carries a **unique per-run marker** (`cdp<base36 timestamp>`) in the message, so every assertion and the delete target address exactly this run's chat. |

A fourth change removed a fixed `sleep(2000)` after the delete click and
replaced it with a poll-until-gone loop, because the delete is an HTTP
round-trip followed by a re-fetch, and a fixed delay made the check
timing-dependent.

The value of this exercise is not the 21 green ticks — it is that **a check
suite that only ever passes proves nothing.** The same discipline applied to
the static verifier in §3.2 was applied here, and it surfaced three real
false-positive/false-negative paths that would otherwise have shipped as
"verified".

### 3.4 The `grounding` stage is not renderable — a measured finding

The B-3 scenario specification asks for the DOM to show `grounding` in the
`.active` state. That state **cannot be rendered by any client**, and the
harness does not assert it.

Measured with `aidlc-docs/scripts/probe-timing.py` against the live backend:

```
grounding active -> grounding complete gap: 0.1 ms
```

The backend emits `grounding active`, then the `citations` event, then
`grounding complete` (`agent.py:142-144`). React batches those into a single
commit, so only the final state reaches the DOM. The amber "grounding active"
state is unobservable — by this client or any other.

This is a **backend timing characteristic**, not a frontend defect, and the
backend is out of scope for this unit (FR-6). The harness asserts instead that
the grounding row is **rendered** and reaches its terminal `.complete` state.

The DOM-observed progression is:

```
Fetching statutes=active | Analyzing against Japanese law=pending | Grounding claims in citations…=pending
Statutes fetched=complete | Analyzing clauses=active | Grounding claims in citations…=pending
Statutes fetched=complete | Analysis complete=complete | Citations grounded=complete
```

The third line is the proof of the fix. **Before the fix that line was never
rendered at all** — the `!m.content` gate unmounted the block at the first
token, which is exactly when `analyzing` and `grounding` became active.

---

## 4. Requirements traceability

| Requirement | Status | Evidence |
|---|---|---|
| FR-1 — a new chat appears in the sidebar without a refresh | ✅ | G1.1, G1.4, G1.6, G1.7; **B-1.1–B-1.5**; B-2.1; manual M-1 |
| FR-2 — the sidebar list stays correct in both directions | ✅ | G1.2, G1.3; **B-8.1**, B-9.1; manual M-3 |
| FR-3 — the indicator advances through all three stages | ✅ | G2.5, G2.6, G2.9–G2.12; **B-3.1–B-3.4, B-3.6**; manual M-5 |
| FR-4 — the indicator stays visible for the whole stream | ✅ | G2.1–G2.4; **B-4.1, B-3.5, B-5.1**; manual M-4, M-5, M-6 |
| FR-5 — the indicator follows the backend's events | ✅ | G2.7, G2.8, G3.1–G3.3; **B-3.2, B-3.3** |
| FR-6 — no backend, contract or dependency change | ✅ | G4.5, G5.1, G5.2, G5.3; empty backend diff |
| NFR-1 — `tsc -b` clean | ✅ | 0 errors |
| NFR-2 — build succeeds | ✅ | 377 modules, 377 ms |
| NFR-3 — lint clean, no new warnings | ✅ | 0 errors, 5 warnings (baseline) |
| NFR-4 — a single targeted re-fetch, no polling | ✅ | G1.2, G1.5 |
| NFR-5 — filter and scroll survive a refresh | ✅ | G1.3; **B-9.1**; manual M-3 |
| NFR-6 — no CSS change | ✅ | G2.12; `chat.css` byte-identical |
| NFR-7 — no regression to the adjacent features | ✅ | G4.1–G4.4; **B-7.1, B-10.1, B-10.2**; manual M-7, M-8, M-9, M-10 |

**0 uncovered requirements.** The bolded entries are the behavioural checks
that were **executed** against the live stack; the remaining evidence is
static.

---

## 5. Instruction set

| Document | Contents |
|---|---|
| `build-instructions.md` | Install, type-check, lint, build, static verifier, the behavioural harness, the backend probes, and how to run the app |
| `unit-test-instructions.md` | The 30 static checks, their traceability, and the 8-case mutation test with runnable commands |
| `integration-test-instructions.md` | 10 CDP scenarios against the live stack, 4 backend contract assertions, 5 cross-cutting checks — **executed, 21/21** |
| `performance-test-instructions.md` | 7 structural properties, 3 runtime measurements, 3 regression checks |
| `manual-test-instructions.md` | 10 by-eye scenarios, M-5 being the primary one for defect 2 |

### 5.1 Verification scripts

| Script | Purpose | Result |
|---|---|---|
| `aidlc-docs/scripts/verify-chat-streaming.py` | 30 source-level assertions | 30 / 30 |
| `aidlc-docs/scripts/verify-chat-streaming-behaviour.js` | 21 CDP behavioural assertions against the live stack | 21 / 21 |
| `aidlc-docs/scripts/probe-stream.py` | Prints the backend's NDJSON stage sequence | full progression |
| `aidlc-docs/scripts/probe-timing.py` | Measures the gap between stage events | `grounding` gap 0.1 ms |

The two Python probes and the Node harness are all part of the `aidlc-docs/`
tree; the `ws` package the harness needs is installed **outside** the
repository at `/tmp/cdp-harness`, so FR-6's zero-dependency requirement holds.

---

## 6. Outstanding items

**None blocking.** The automated verification is complete. The following
remain for human execution because they require a human eye:

- The 10 manual scenarios (M-1…M-10) — especially **M-5**, which is the only
  check that compares the stage progression against a *target* rather than
  against a rule.
- The exact colour and animation of the amber active dot and the green
  complete dot. The harness asserts the **class** (`.active` / `.complete`),
  not the rendered colour, because the class is what the fix controls.

**Executed and passing**: the 30 static checks, the type-check, the build, the
lint baseline, the 8-case mutation test, and the **21 CDP behavioural checks**
against the live stack (§3.3).

---

## 7. Guardrail compliance

| Guardrail | Status |
|---|---|
| **(a) Never `git commit` or `git push` on the user's behalf** | ✅ **Honoured.** No commit or push was run. All three source files and the new documentation are left **uncommitted** in the working tree for review. |
| **(b) `legalwave-frontend/` and `legalwave-backend/` are separate repos** | ✅ Honoured — file contents only; no repository, remote or branch operation was performed on either. |
| **(c) The backend is out of scope** | ✅ Honoured — `git -C legalwave-backend diff` is empty. |
| **(d) The phase-1 MVP documentation is read-only** | ✅ Honoured — nothing under `aidlc-bank/` was modified; all new documentation went to the new `aidlc-docs/` tree. |
