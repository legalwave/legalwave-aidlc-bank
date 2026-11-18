# Unit Test Instructions — `chat-streaming` unit

The project has **no test runner**. Adding one was explicitly ruled out by
FR-6 (zero new dependencies). Verification therefore uses the pattern
established by the previously delivered units: a purpose-built static verifier
plus a headless-browser harness.

---

## 1. Static verifier — 30 checks

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave
python3 aidlc-docs/scripts/verify-chat-streaming.py
```

**Expected**: `30 passed, 0 failed, 30 total`, exit code `0`.

### 1.1 Check inventory

| Group | # | Check | Requirement |
|---|---|---|---|
| **G1 — sidebar live refresh** | G1.1 | `ChatPage` calls `refreshChats()` **inside** the chat-created callback | FR-1 |
| | G1.2 | The refresh is not a poll or timer | NFR-4 |
| | G1.3 | `useChats` still refreshes only on mount (its contract is unchanged) | FR-2 |
| | G1.4 | `onChatCreated` still navigates to the new chat | FR-1 |
| | G1.5 | The chat-created callback keeps a stable identity | NFR-4, risk R5 |
| | G1.6 | The refresh is also triggered when the stream completes | FR-1, FR-2 |
| | G1.7 | The `done` handler refreshes the chat list | FR-1 |
| **G2 — stage colouring** | G2.1 | The indicator is **not** gated on the absence of answer text | FR-4 |
| | G2.2 | The old `!m.content` gate is gone from the visibility test | FR-4 |
| | G2.3 | The indicator is still rendered under the `showProgress` guard | FR-4 |
| | G2.4 | The indicator is still gated on `m.streaming` | FR-4 |
| | G2.5 | Each stage row carries its status class | FR-3 |
| | G2.6 | All three backend stages are in the known order | FR-3 |
| | G2.7 | The stage handler upserts by key (a stage updates, it is not duplicated) | FR-3 |
| | G2.8 | The stage handler preserves the backend label | FR-5 |
| | G2.9 | The active stage is styled as active | FR-3 |
| | G2.10 | The completed stage is styled as complete | FR-3 |
| | G2.11 | The pending stage is styled as pending | FR-3 |
| | G2.12 | The colouring rules are the pre-existing ones (no CSS change) | NFR-6 |
| **G3 — event-driven, not guessed** | G3.1 | No hard-coded stage progression was added | FR-5 |
| | G3.2 | The frontend did not advance a stage on `text_delta` | FR-5 |
| | G3.3 | The frontend reads the stage status from the event | FR-5 |
| **G4 — regression guards** | G4.1 | The route-change effect still aborts the previous stream | NFR-7 |
| | G4.2 | The file-upload stages are still emitted and handled | NFR-7 |
| | G4.3 | The stop/abort control is unchanged | NFR-7 |
| | G4.4 | The sidebar collapse feature is still wired up | NFR-7 |
| | G4.5 | The backend is untouched by this unit | FR-6 |
| **G5 — repository guarantees** | G5.1 | `legalwave-backend/` has no uncommitted changes | FR-6 |
| | G5.2 | No dependency was added to the frontend | FR-6, NFR-2 |
| | G5.3 | No new source file was added to the frontend | FR-6 |

### 1.2 How the structural checks work

Checks G1.1, G1.4, G1.5, G1.7, G2.7, G2.8 and G3.2 do **not** use loose
regexes over the whole file. They extract the relevant block by brace matching
(`block_after`) and then assert on its contents. This matters: an early version
of this suite used a non-greedy `[\s\S]{0,400}?` pattern and silently passed
against a build where the sidebar refresh had been removed entirely, because
the pattern matched a *different* callback further down the file.

The helper handles three shapes: a brace-delimited block, a `case` label whose
body is brace-delimited, and a `case` label whose body is a brace-less
statement list (the `done` case).

---

## 2. Mutation test — proving the suite can fail

A check suite that always passes proves nothing. The verifier was
mutation-tested with **8 deliberate regressions**, each of which must be
caught. Run these against the suite and confirm every one is caught.

| # | Deliberate regression | How to apply | Must fail |
|---|---|---|---|
| M1 | Reintroduce the `!m.content` gate | in `MessageView.tsx`, change `const showProgress = m.streaming && stages.length > 0` to `const showProgress = m.streaming && !m.content && stages.length > 0` | G2.1, G2.2 |
| M2 | Remove the sidebar refresh | in `ChatPage.tsx`, delete the `refreshChats()` line from `onChatCreated` | G1.1 |
| M3 | Remove the `done`-event refresh | in `useChatStream.ts`, delete `onChatUpdated?.(ownChat.current ?? '')` | G1.7 |
| M4 | Poll instead of a targeted refresh | in `ChatPage.tsx`, replace `refreshChats()` with `setInterval(() => refreshChats(), 5000)` | G1.2 |
| M5 | Duplicate stage rows | in `useChatStream.ts`, replace `if (i >= 0) stages[i] = s` / `else stages.push(s)` with `stages.push(s)` | G2.7 |
| M6 | Drop the navigation | in `ChatPage.tsx`, delete `nav(chatPath(id), { replace: true })` | G1.4 |
| M7 | Advance the stage on `text_delta` | in `useChatStream.ts`, add a `stages:` override to the `text_delta` patch | G3.2 |
| M8 | Ignore the backend label | in `useChatStream.ts`, change `label: ev.label \|\| …` to `label: STAGE_FALLBACK[ev.stage] \|\| ev.stage` | G2.8 |

**Result recorded for this unit**: all 8 mutations caught; the restored
baseline passes 30/30.

### 2.1 Running the mutation suite

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/legalwave
F=legalwave-frontend/src/features/chat
cp $F/components/MessageView.tsx /tmp/MV.bak
cp $F/pages/ChatPage.tsx /tmp/CP.bak
cp $F/hooks/useChatStream.ts /tmp/UCS.bak

# --- M1 ---
python3 - <<'EOF'
import pathlib
p = pathlib.Path('legalwave-frontend/src/features/chat/components/MessageView.tsx')
t = p.read_text()
p.write_text(t.replace(
    'const showProgress = m.streaming && stages.length > 0',
    'const showProgress = m.streaming && !m.content && stages.length > 0'))
EOF
python3 aidlc-docs/scripts/verify-chat-streaming.py | grep FAIL   # expect G2.1, G2.2
cp /tmp/MV.bak $F/components/MessageView.tsx

# ... and the same shape for M2..M8 (see the table above) ...

# --- restore and confirm ---
cp /tmp/MV.bak $F/components/MessageView.tsx
cp /tmp/CP.bak $F/pages/ChatPage.tsx
cp /tmp/UCS.bak $F/hooks/useChatStream.ts
python3 aidlc-docs/scripts/verify-chat-streaming.py | tail -2      # expect 30 passed, 0 failed
```

> Always confirm the working tree is restored (`git -C legalwave-frontend diff`)
> after running the mutation suite — the mutations edit the source files in place.

---

## 3. Traceability

| Requirement | Covered by |
|---|---|
| FR-1 | G1.1, G1.4, G1.6, G1.7 + manual scenario M-1, M-2 |
| FR-2 | G1.2, G1.3 + manual scenario M-3 |
| FR-3 | G2.5, G2.6, G2.9, G2.10, G2.11, G2.12 + manual scenario M-5 |
| FR-4 | G2.1, G2.2, G2.3, G2.4 + manual scenario M-4, M-5 |
| FR-5 | G2.7, G2.8, G3.1, G3.2, G3.3 |
| FR-6 | G4.5, G5.1, G5.2, G5.3 |
| NFR-1 | `tsc -b` → 0 errors |
| NFR-2 | `npm run build` → success; G5.2 |
| NFR-3 | `npm run lint` → 5 warnings (baseline), 0 errors |
| NFR-4 | G1.2, G1.5 |
| NFR-5 | G1.3 + manual scenario M-3 |
| NFR-6 | G2.12 |
| NFR-7 | G4.1, G4.2, G4.3, G4.4 + manual scenario M-6 |
