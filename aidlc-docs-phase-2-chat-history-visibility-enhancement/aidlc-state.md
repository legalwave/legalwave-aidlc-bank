# AI-DLC State Tracking

## Project Information
- **Project Type**: Brownfield
- **Project**: LegalWave — `chat-streaming` enhancement unit
- **Start Date**: 2026-11-01
- **Current Phase**: CONSTRUCTION — Build and Test complete
- **Active Unit**: `chat-streaming` (sidebar live-refresh + stage-status coloring) — **complete**

## Workspace State
- **Existing Code**: Yes
- **Programming Languages**: TypeScript (React SPA), Python (FastAPI backend)
- **Build System**: npm + Vite (frontend), uv (backend)
- **Project Structure**: Two sibling applications — `legalwave-frontend/` (React SPA) and `legalwave-backend/` (FastAPI)
- **Workspace Root**: `/home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave`
- **Reverse Engineering Needed**: No — the prior MVP unit already captured the architecture in `aidlc-bank/aidlc-docs-phase-1-mvp/inception/api-contract.md`, and this unit touches a narrow, well-understood slice of the frontend

## Code Location Rules
- **Application Code**: Workspace root (NEVER in `aidlc-docs/`)
- **Documentation**: `aidlc-docs/` only
- **Structure patterns**: See `construction/code-generation.md` Critical Rules

## Standing Guardrails
- **(a) NEVER run `git commit` or `git push` on the user's behalf.** All changes are left uncommitted in the working tree for the user to review, stage and commit themselves. This guardrail applies to every stage of every unit in this project without exception, and no stage may ask the user to relax it.
- **(b) `legalwave-frontend/` and `legalwave-backend/` are separate GitHub repositories** under the `legalwave` organisation. They are out of scope for repository, remote and branch operations — read and write file contents only.
- **(c) The backend is out of scope for this unit.** Both defects are frontend-side; no `legalwave-backend/` file is modified, and no API contract change is introduced.
- **(d) The phase-1 MVP documentation** at `aidlc-bank/aidlc-docs-phase-1-mvp/` is a completed, delivered artifact and is **read-only** for this unit. All new documentation for this unit is written to `aidlc-docs/`.

## Extension Configuration
| Extension | Enabled | Decided At | Note |
|---|---|---|---|
| security-baseline | No | Requirements Analysis | User opt-out (MVP precedent). No auth, secret handling, or new input surface is introduced; both fixes are presentational/state-plumbing changes on already-authenticated routes |
| resiliency-baseline | No | Requirements Analysis | User opt-out (MVP precedent). Every rule targets a deployed/distributed/stateful workload; this unit changes two React components/hooks with no new workload or data store |
| property-based-testing | No | Requirements Analysis | User opt-out (MVP precedent). PBT-09 requires a framework dependency; the project has no test runner, and adding one is out of scope for a fast small fix |

## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection — brownfield. Scanned `legalwave-frontend/src/features/chat/` (`useChatStream.ts`, `useChats.ts`, `ChatPage.tsx`, `MessageView.tsx`, `StageProgress.tsx`, `types.ts`, `styles/chat.css`), `legalwave-frontend/src/shared/api/` (`client.ts`, `types.ts`) and `legalwave-backend/app/` (`routes.py`, `agent.py`, `schemas.py`). Root cause of both reported defects established at the code level — see `inception/requirements/requirements.md` §Root Cause Analysis.
- [x] Requirements Analysis — minimal depth (`inception/requirements/requirements.md`); FR-1…FR-6, NFR-1…NFR-7, AC-1…AC-8; 0 uncovered requirements
- [x] Reverse Engineering — SKIP (the prior MVP unit already captured the architecture in `api-contract.md`; this unit touches a narrow slice of the frontend whose full call path has been read directly)
- [x] User Stories — SKIP (one persona, two narrow defects, no new business capability; acceptance criteria are captured in FR-1…FR-6)
- [x] Workflow Planning (`inception/plans/chat-streaming-execution-plan.md`; 10 stages — 6 executed, 3 skipped, 1 placeholder; Mermaid + ASCII diagrams validated)
- [x] Application Design — SKIP (no new components, services, or component boundaries; two existing hooks and two existing components are modified in place)
- [x] Units Generation — SKIP (a single cohesive frontend unit; all three changed files share one dependency graph and must land atomically)

### 🟢 CONSTRUCTION PHASE
- [x] Code Generation — `chat-streaming` unit — COMPLETE
  - [x] Part 1 — Planning (3 files changed, +40/−6; risk register R1–R6; R5 identified the callback-identity constraint the implementation had to honour)
  - [x] Part 2 — Generation (both defects fixed; `tsc -b` 0 errors; build 377 modules; lint back to the 5-warning baseline)
- [x] Build and Test — `chat-streaming` unit — COMPLETE
  - Build instructions → `construction/build-and-test/chat-streaming/build-instructions.md`
  - Unit test instructions → `construction/build-and-test/chat-streaming/unit-test-instructions.md` (30-check inventory with FR/NFR traceability + the 8-case mutation-test table)
  - Integration test instructions → `construction/build-and-test/chat-streaming/integration-test-instructions.md` (10 CDP scenarios, 4 backend contract assertions, 5 cross-cutting checks — **executed against the live stack, 21/21**)
  - Performance test instructions → `construction/build-and-test/chat-streaming/performance-test-instructions.md` (7 structural properties, 3 runtime measurements, 3 regression checks)
  - Manual test instructions → `construction/build-and-test/chat-streaming/manual-test-instructions.md` (10 by-eye scenarios; M-5 is the primary one for defect 2)
  - Build-and-test summary → `construction/build-and-test/chat-streaming/build-and-test-summary.md`
  - **Execution pass (live stack)** — CDP harness `scripts/verify-chat-streaming-behaviour.js` → **21/21 on five consecutive runs**; backend probes `scripts/probe-stream.py` and `scripts/probe-timing.py`. **Three harness defects found and fixed** (observer-only sampling, last-state terminal test, non-unique chat matching) — all were test defects; **no application code changed in this pass**.

### 🟡 OPERATIONS PHASE
- [x] Operations — **PLACEHOLDER, no action required.** Per `.aws-aidlc-rule-details/operations/operations.md`, all build and test activity is handled in the CONSTRUCTION phase; this workflow version has no deployment, monitoring or incident-response stage.

## Key Outcomes — `chat-streaming` unit
- **Defect 1 fixed** — a newly created chat appears in the sidebar **without a browser refresh**. The backend already committed the chat row before streaming (`routes.py:159-163`); the frontend simply never invalidated its mount-time snapshot. `ChatPage.onChatCreated` now calls the existing `refreshChats()`, and the `done` event triggers a second refresh so the preview and `updated_at` are final (`routes.py:197-204`).
- **Defect 2 fixed** — the progress indicator now stays mounted for the whole stream. It was gated on `!m.content`, so the first answer token unmounted it — exactly when `analyzing` and `grounding` became active, which is why only `fetching_statutes` was ever colored. Visibility now depends only on `m.streaming && stages.length > 0`.
- **No backend, API-contract or dependency change.** `git -C legalwave-backend diff` is empty; `chat.css` is byte-identical; `package.json` is unchanged; no new source file was added.
- **Verification**: `tsc -b` 0 errors; build 377 modules / 462.15 kB; lint 0 errors and the 5-warning baseline (a 6th warning was introduced by an earlier ref-based implementation and was removed); **30/30 static checks pass**; **all 8 mutation-test regressions caught**; **21/21 CDP behavioural checks pass** against the live stack on five consecutive runs.
- **Measured finding — the `grounding` active state is not renderable.** `probe-timing.py` measured the gap between `grounding active` and `grounding complete` at **0.1 ms**. The backend emits `grounding active`, the `citations` event, then `grounding complete` (`agent.py:142-144`); React batches all three into a single commit, so only the final state reaches the DOM. The amber "grounding active" rendering is unobservable by **any** client. The B-3 check was re-scoped to assert that the grounding row is *rendered* and reaches its terminal `.complete` state — which is the substance of the fix. This is a backend timing characteristic; the backend is out of scope (FR-6).
- **The behavioural harness was itself buggy.** Three defects in the *test* were found and fixed (observer-only sampling missed half-updated row sets; the terminal-state test read only the last recorded state; the delete target was matched by a non-unique title prefix and so hit the wrong chat). **No application code was changed as a result** — every fix was to the harness. A fourth change replaced a fixed `sleep(2000)` after the delete click with a poll-until-gone loop.
- **Outstanding (human execution)**: the 10 manual scenarios (M-1…M-10). M-5 is the highest-value check — it is the only one that compares the stage progression against a *target* rather than against a rule. The 10 CDP scenarios were **executed** and pass.
- **Guardrail (a) honoured**: no `git commit` and no `git push` was run. All changes are left uncommitted in the working tree for review.
