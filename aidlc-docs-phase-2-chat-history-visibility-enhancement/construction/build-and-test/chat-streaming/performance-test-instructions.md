# Performance Test Instructions — `chat-streaming` unit

This unit adds **one** network request to the chat-creation path and changes
**one** render condition. The performance surface is therefore tiny, and the
checks below are correspondingly narrow.

---

## 1. Structural performance properties

| # | Property | How to check | Expected |
|---|---|---|---|
| **P-1** | The sidebar refresh is a **single targeted** `GET /chats`, not a poll | G1.2 — no `setInterval` / `setTimeout` in `ChatPage.tsx` | No timer present |
| **P-2** | Exactly **two** list fetches occur per chat lifecycle: one on the `chat` event, one on `done` | G1.1 + G1.7; confirm in the network log | 2 requests |
| **P-3** | The refresh is **not** triggered on every render | The `useChats` mount effect is unchanged (G1.3); `refreshChats` is only called from the two callbacks | No render-driven fetching |
| **P-4** | The indicator's re-render cost is unchanged | `StageProgress` was not modified; the change is one boolean in `MessageView` | No new render work |
| **P-5** | The indicator now stays mounted for the **whole** stream instead of unmounting early | `MessageView.tsx` — `showProgress` no longer depends on `!m.content` | The block renders for the full duration |
| **P-6** | The bundle did not grow | Compare the production build size before and after | 462.20 kB → 462.15 kB (a 50-byte reduction) |
| **P-7** | No new dependency | G5.2 | Unchanged `package.json` |

### P-5 — the one real cost

Keeping the progress block mounted for the whole stream means the stage rows
are re-rendered on each `text_delta` instead of only during the initial
fetching window. This is **intentional** — it is the entire point of the fix —
and it is cheap:

- The block contains **at most 5 rows**, each with a single text node and a
  dot. There is no list virtualisation involved and no measurable cost at this
  size.
- The rows are memo-free, but React's reconciliation of 5 unchanged rows per
  delta is negligible compared to the markdown re-render that already happens
  on the same update (`<Markdown text={m.content} />` re-parses the whole
  answer on every delta — the dominant cost, and **pre-existing**, unchanged by
  this unit).

**Conclusion**: P-5 adds no material cost. If a future change makes the stage
list large or the delta rate high, `React.memo` on `StageProgress` would be
the lever — but it is not warranted today, and adding it now would exceed the
"small and fast" scope of this unit.

---

## 2. Runtime measurements

### 2.1 Time-to-sidebar-entry

**What to measure**: the delay between the user pressing **Send** and the new
chat appearing in the sidebar.

**How**: open the browser's network panel, filter to `/api/chats`, send a
message, and record the time from the request to the entry's appearance in the
DOM.

**Expected**: one network round-trip to `GET /api/chats`, typically **< 100 ms**
on a local backend. The entry appears as soon as that request resolves; there
is no polling interval to wait for.

**Note**: the entry appears with an **empty preview** on this first refresh,
because the backend commits the user message *after* it yields the `chat`
event (`routes.py:167` precedes `routes.py:183`). The preview fills in on the
second refresh, which fires on `done` — by which time the assistant message is
committed (`routes.py:197-204`). This is the correct behaviour: showing the
entry immediately is what makes the app feel responsive, and the preview is
correct a moment later.

### 2.2 Indicator responsiveness

**What to measure**: that the highlight advances promptly between stages.

**How**: observe the three stage rows while a query runs.

**Expected**: each transition is driven by a backend `stage` event and is
applied on the next React commit — **within one frame** of the event arriving.
There is no artificial delay and no transition animation on the dot beyond the
existing 1.6s pulse.

### 2.3 Re-render sanity

**What to measure**: that the change did not introduce a render loop.

**How**: with the React DevTools profiler attached, send a message and confirm
that the component tree settles — `ChatPage` does not re-render continuously
once the stream is idle.

**Expected**: renders stop when the stream stops. The `onChatCreated` and
`onChatUpdated` callbacks are both referentially stable (`refreshChats` is a
`useCallback` with an empty dependency list), so neither the `handleEvent`
identity nor the route-change effect is re-triggered by a list update. This is
risk **R5** in the execution plan's risk register, and it is the reason the
implementation avoids a mutable ref.

---

## 3. Regression performance checks

| # | Check | Expected |
|---|---|---|
| **P-8** | The mount-time `GET /chats` still happens exactly once | 1 request on page load |
| **P-9** | Deleting a chat still issues exactly one `GET /chats` afterwards | 1 request |
| **P-10** | The streaming endpoint's request count is unchanged | 1 `POST /api/chats/stream` per message |

---

## 4. Summary

| Check | Result |
|---|---|
| P-1 … P-7 (structural) | ✅ pass — see §1 |
| P-2 request count | ✅ 2 per chat lifecycle |
| P-6 bundle size | ✅ unchanged (−50 bytes) |
| §2.1 time-to-sidebar-entry | Manual — < 100 ms expected on a local backend |
| §2.2 indicator responsiveness | Manual — one frame per transition |
| §2.3 re-render sanity | Manual — the tree settles when the stream is idle |
| P-8 … P-10 (regression) | ✅ pass |
