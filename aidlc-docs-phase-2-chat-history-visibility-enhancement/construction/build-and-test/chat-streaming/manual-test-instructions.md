# Manual Test Instructions — `chat-streaming` unit

These are the scenarios that are best judged **by eye**. Everything that can be
asserted mechanically is covered by `verify-chat-streaming.py` (30 static
checks) and the CDP harness scenarios B-1…B-10.

## Setup

```bash
# Terminal 1
cd legalwave-backend && uv run uvicorn app.main:app --reload --port 8000

# Terminal 2
cd legalwave-frontend && npm run dev
```

`GOOGLE_API_KEY` must be set in `legalwave-backend/.env`, otherwise the agent
emits an `error` right after the `fetching_statutes` stage and the full
fetching → analysing → grounding progression never occurs.

---

## M-1 — A new chat appears in the sidebar without a refresh

1. Sign in and land on the chat screen.
2. Type a distinctive message — e.g. `Contract review for Acme Corporation` — and send it.
3. **Do not touch the browser's reload button.**

**Expect**:
- The URL changes to `/c/{uuid}`.
- A new entry appears in the **left sidebar**, at the top of the **Today** group.
- Its title reads `Contract review for Acme Corporation` (truncated at 50 characters).
- Its **preview** shows the first words of the assistant's answer once the answer completes.
- The entry is **highlighted** (the `.active` styling) — it matches the chat you are in.
- The answer streams in fully in the main thread.

**This is the primary fix for defect 1.**

---

## M-2 — The sidebar entry survives navigation

1. With the chat from M-1 created, click **+ New chat**.
2. Send a second message.
3. Navigate back to the first chat by clicking its sidebar entry.

**Expect**: both chats are in the sidebar, each with its own title and preview, and the correct one is highlighted.

---

## M-3 — The search filter and scroll position survive a refresh

1. Create a chat, then type `xyzzy` into the **Search chats** box — the list should empty.
2. Create another chat.

**Expect**:
- The search box still reads `xyzzy`.
- The list is still filtered — the newly created chat is **not** shown, because it does not match the filter.

3. Clear the search box.

**Expect**: the new chat is now visible, with its preview populated.

---

## M-4 — The stage indicator appears before the answer text

1. Start a new chat and send a query.

**Expect**: the progress block appears with the three rows — *Fetching statutes from e-Gov…*, *Analyzing against Japanese law*, *Grounding claims in citations…* — and the **first** row's dot is amber and pulsing while the other two are dimmed.

---

## M-5 — The stage indicator advances through all three stages ⭐

*This is the primary fix for defect 2 and the most important scenario in this document.*

1. Start a new chat and send a query that makes the agent work for a few seconds.
2. Watch the progress block closely, **including the moment the answer text starts appearing**.

**Expect, in order**:

| Moment | Fetching statutes | Analysing | Grounding |
|---|---|---|---|
| The statutes are being fetched | **amber, pulsing** | dim | dim |
| The statutes are in and the model is working | green, ✓ | **amber, pulsing** | dim |
| Everything is done | green, ✓ | green, ✓ | green, ✓ |

> **Note on the "Grounding" row.** The intermediate state in which *Grounding
> alone* is amber and pulsing is **not observable**, and is therefore not part
> of this expectation. `aidlc-docs/scripts/probe-timing.py` measured the gap
> between the backend's `grounding active` and `grounding complete` events at
> **0.1 ms**. React batches them into a single commit, so the browser only
> ever paints the final state — the grounding row goes from *pending* straight
> to *complete*. This is a backend timing characteristic (out of scope for this
> unit, FR-6), not a frontend defect. What matters here is that the
> **grounding row exists and reaches green ✓ while the block is still
> mounted** — which is exactly what the fix restored.

**Critically**: the progress block must **stay on screen while the answer text streams in**. Before the fix, the whole block disappeared the instant the first word appeared, so *Analysing* and *Grounding* were never shown in colour at all.

The DOM-observed progression captured by the live harness confirms this:

```
Fetching statutes=active | Analyzing against Japanese law=pending | Grounding claims in citations…=pending
Statutes fetched=complete | Analyzing clauses=active | Grounding claims in citations…=pending
Statutes fetched=complete | Analysis complete=complete | Citations grounded=complete
```

**By-eye judgement** (the part a script cannot make):
- The active dot is the amber accent with a soft glow and a slow pulse.
- The completed dot is solid green with a small white ✓.
- The pending dot is dimmed grey.
- Exactly one row is highlighted at a time — never two.

---

## M-6 — The stage indicator disappears when the answer is finished

**Expect**: once the answer is complete, the progress block is gone and only the answer text and the blinking cursor remain.

---

## M-7 — The stop button still works

1. Start a chat and send a query.
2. Press **Stop** while the answer is streaming.

**Expect**: streaming stops immediately, the progress block is removed, and no error is shown. The sidebar still shows the chat (it was created and committed server-side regardless).

---

## M-8 — The sidebar collapse feature still works

1. Press `Ctrl+B` (or `Cmd+B`).

**Expect**: the sidebar collapses to the 56px rail with only the toggle, the logo and the new-chat button. Press again to restore.

2. Confirm `Ctrl+B` does **not** fire while typing in the **Search chats** box.

**Expect**: the sidebar does not collapse while you are typing in a text field.

---

## M-9 — Attaching a file still works

1. Start a new chat, attach a `.txt` file, and send it.

**Expect**:
- The sidebar entry appears without a refresh (as in M-1).
- The progress block shows two extra rows at the top — *Uploading {filename}* and *Reading file* — which turn green ✓ before the fetching stage begins.

---

## M-10 — Reloading the page still works normally

1. Reload the browser on an existing chat.

**Expect**: the chat loads from the server, the sidebar is populated, and the history shows both the user message and the assistant answer.

---

## Summary

| Scenario | Covers | Automatable? |
|---|---|---|
| M-1 | FR-1 | Partly (B-1, B-2) — the *visual* placement and styling is by-eye |
| M-2 | FR-1 | Partly (B-1) |
| M-3 | FR-2, NFR-5 | Partly (B-8, B-9) — the *feel* of the filter is by-eye |
| M-4 | FR-3 | No — by-eye |
| M-5 ⭐ | FR-3, FR-4 | Partly (B-3, B-4 — **executed, 21/21**) — the colour and animation are by-eye |
| M-6 | FR-4 | Yes (B-5) |
| M-7 | NFR-7 | Partly — the abort behaviour is by-eye |
| M-8 | NFR-7 | Partly (B-10) — the animation is by-eye |
| M-9 | FR-1, NFR-7 | Partly — the upload rows are by-eye |
| M-10 | NFR-7 | No — by-eye |
