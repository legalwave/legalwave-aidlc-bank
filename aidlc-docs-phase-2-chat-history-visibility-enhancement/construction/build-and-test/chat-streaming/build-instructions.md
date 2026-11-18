# Build Instructions — `chat-streaming` unit

## Prerequisites

- Node.js with npm (the toolchain the project already pins).
- The backend is **not** required for the build, the type-check, the lint or the
  static verifier. It is only required for the manual end-to-end walkthrough.

## 1. Install dependencies

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave/legalwave-frontend
npm install
```

No dependency was added by this unit, so `package.json` and `package-lock.json`
are unchanged. `npm ci` is the stricter equivalent if the lockfile is trusted.

## 2. Type-check

```bash
cd legalwave-frontend
npx tsc -b
```

**Expected**: exit code `0`, no output. This is the primary safety net — the
change touches a typed event stream and a typed component contract, and
`tsc -b` fails if the `StreamEvent` union, the `Stage` type or the
`useChatStream` signature drift apart.

**Expected after this unit**: still 0 errors. Verified.

## 3. Lint

```bash
cd legalwave-frontend
npm run lint          # oxlint
```

**Expected**: `Found 5 warnings and 0 errors.`

The 5 warnings are **pre-existing** and unrelated to this unit. They were
measured by stashing the change and re-running the linter:

| # | File | Rule |
|---|---|---|
| 1 | `src/shared/components/Markdown.tsx:22:17` | react-hooks refs |
| 2 | `src/app/providers.tsx:63:17` | react-hooks refs |
| 3 | `src/features/chat/components/ChatThread.tsx:10:3` | react-hooks immutability |
| 4 | `src/features/chat/components/ChatThread.tsx:31:5` | react-hooks immutability |
| 5 | `src/features/chat/hooks/useChatStream.ts:110:7` | react-hooks set-state-in-effect |

> **A note on how this number was reached.** An earlier iteration of this unit
> introduced a **6th** warning: the sidebar refresh was initially implemented
> with a mutable ref (`refreshChatsRef.current = refreshChats` during render),
> which trips the `react-hooks/refs` rule. That approach was replaced with a
> direct `refreshChats` dependency — safe because `refreshChats` is a
> `useCallback` with an empty dependency list and is therefore referentially
> stable. The final implementation returns to the 5-warning baseline.

## 4. Production build

```bash
cd legalwave-frontend
npm run build        # tsc -b && vite build
```

**Expected**:

```
✓ 377 modules transformed.
dist/assets/index-<hash>.js   ~462 kB │ gzip: ~143 kB
✓ built in <1s
```

The bundle size should be effectively unchanged from the pre-change build
(462.20 kB before, 462.15 kB after — the small reduction is the removal of the
ref indirection).

## 5. Static verifier

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave
python3 aidlc-docs/scripts/verify-chat-streaming.py
```

**Expected**: `30 passed, 0 failed, 30 total` and exit code `0`.

The script is self-contained — it needs only Python 3 and a readable git
working tree. It asserts the source-level properties both fixes depend on, plus
the regression properties that must survive them.

## 6. Behavioural harness (live stack)

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave

# The `ws` package lives OUTSIDE the repository, on purpose — FR-6 forbids
# adding a dependency to the frontend.
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1
npm install ws

cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-chat-streaming-behaviour.js
```

**Expected**: `21 passed, 0 failed, 21 total` and exit code `0`.

The harness needs the frontend dev server on `:5173` and the backend on
`:8000` running (§7). It drives a real headless Chrome over the DevTools
Protocol, sends a real message, and asserts the DOM.

> The harness creates a chat whose title carries a **unique per-run marker**
> (`CDP check cdp<base36 timestamp> …`) and deletes that exact chat at the
> end. It therefore leaves the account clean and never collides with a chat
> from a previous run.

## 7. Backend probes

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave

# Which stage events does the backend actually emit?
python3 aidlc-docs/scripts/probe-stream.py

# How far apart are they?
python3 aidlc-docs/scripts/probe-timing.py
```

`probe-stream.py` prints the NDJSON event sequence. `probe-timing.py` prints
the wall-clock gap between `grounding active` and `grounding complete`, which
is currently **0.1 ms** — the reason the amber "grounding active" state is
never renderable. See `integration-test-instructions.md` §1.5.

## 8. Running the app for the manual walkthrough

```bash
# Terminal 1 — backend
cd legalwave-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd legalwave-frontend
npm run dev
```

Then open the printed Vite URL, sign in, and run the manual scenarios in
`manual-test-instructions.md`.

> The backend requires `GOOGLE_API_KEY` in `legalwave-backend/.env` for the
> agent to produce an answer. Without it the stream emits an `error` event
> after the `fetching_statutes` stage — which is enough to exercise the
> *sidebar* fix, but **not** enough to exercise the full
> fetching → analysing → grounding progression.
