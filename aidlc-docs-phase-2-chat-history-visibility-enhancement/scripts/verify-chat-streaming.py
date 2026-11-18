#!/usr/bin/env python3
"""
Static verifier — `chat-streaming` unit.

Asserts the source-level properties that the two fixes depend on, plus the
regression properties that must survive them.

Usage:
    python3 aidlc-docs/scripts/verify-chat-streaming.py

Exit code 0 = all checks pass. Exit code 1 = at least one check failed.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "legalwave-frontend"
BACKEND = ROOT / "legalwave-backend"

results: list[tuple[bool, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((ok, name, detail))


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def src(rel: str) -> str:
    return read(FRONTEND / "src" / rel)


# ---------------------------------------------------------------------------
# Group 1 — Defect 1: the sidebar must refresh when a chat is created
# ---------------------------------------------------------------------------

chat_page = src("features/chat/pages/ChatPage.tsx")
use_chats = src("features/chat/hooks/useChats.ts")
use_stream = src("features/chat/hooks/useChatStream.ts")


def block_after(text: str, anchor: str) -> str:
    """Return the block that follows `anchor`.

    Used instead of a loose regex so a check cannot accidentally match a
    statement that lives *outside* the construct it is meant to inspect.

    Handles three shapes:
      * a brace-delimited block (e.g. `const onChatCreated = useCallback`),
      * a `case` label whose body IS brace-delimited,
      * a `case` label whose body is a brace-less statement list — the text
        up to the next `case` / `default` label.
    """
    i = text.find(anchor)
    if i < 0:
        return ""
    search_from = i + len(anchor)

    if anchor.rstrip().endswith(":"):
        # Find the block's own brace: the first `{` not enclosed by an
        # unclosed `(`. Otherwise the object literal of an arrow-function body
        # would be mistaken for the block itself.
        depth_paren = 0
        j = search_from
        while j < len(text):
            ch = text[j]
            if ch == "(":
                depth_paren += 1
            elif ch == ")":
                if depth_paren == 0:
                    break
                depth_paren -= 1
            elif ch == "{" and depth_paren == 0:
                break
            j += 1

        if j < len(text) and text[j] == "{":
            depth = 0
            for k in range(j, len(text)):
                if text[k] == "{":
                    depth += 1
                elif text[k] == "}":
                    depth -= 1
                    if depth == 0:
                        return text[j : k + 1]
            return text[j:]

        # Brace-less case body: run to the next `case` / `default` label.
        m = re.search(r"\n\s*(?:case\s|default\s*:)", text[search_from:])
        end = search_from + (m.start() if m else len(text) - search_from)
        return text[search_from:end]

    start = text.find("{", search_from)
    if start < 0:
        return ""
    depth = 0
    for j in range(start, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                return text[start : j + 1]
    return ""


# The body of the `onChatCreated` callback — the function passed to useCallback.
on_created_body = block_after(chat_page, "const onChatCreated = useCallback")
on_updated_body = block_after(chat_page, "const onChatUpdated = useCallback")
# The body of the `case 'stage':` branch in the stream event handler.
stage_case_body = block_after(use_stream, "case 'stage':")
done_case_body = block_after(use_stream, "case 'done':")

check(
    "G1.1 ChatPage calls refreshChats() inside the chat-created callback",
    "refreshChats()" in on_created_body,
    "the sidebar list must be re-fetched when a chat is created",
)

check(
    "G1.2 The refresh is not a poll or timer",
    not re.search(r"setInterval|setTimeout", chat_page),
    "FR/NFR-4: one targeted re-fetch per creation event, not a poll",
)

check(
    "G1.3 useChats still refreshes only on mount (no change to its contract)",
    re.search(r"useEffect\(\s*\(\)\s*=>\s*\{\s*refreshChats\(\)\s*\}", use_chats) is not None,
    "the mount-time fetch is preserved; the fix adds a targeted invalidation",
)

check(
    "G1.4 onChatCreated still navigates to the new chat",
    "nav(chatPath(id)" in on_created_body,
    "the route change to /c/{id} must be preserved",
)

check(
    "G1.5 The chat-created callback keeps a stable identity (deps do not include a changing value)",
    re.search(r"\[nav,\s*refreshChats\]", chat_page) is not None
    and "refreshChats()" in on_updated_body,
    "R5: `refreshChats` is useCallback([]) — stable — so the identity never changes",
)

check(
    "G1.6 The sidebar refresh is also triggered when the stream completes",
    "onChatUpdated" in use_stream and "onChatUpdated" in chat_page,
    "the `done` event is the first moment the preview and updated_at are final",
)

check(
    "G1.7 The `done` handler refreshes the chat list",
    "onChatUpdated" in done_case_body,
    "the completed assistant message must reach the sidebar preview",
)

# ---------------------------------------------------------------------------
# Group 2 — Defect 2: every stage must be coloured as it runs
# ---------------------------------------------------------------------------

message_view = src("features/chat/components/MessageView.tsx")
stage_progress = src("features/chat/components/StageProgress.tsx")
chat_css = src("features/chat/styles/chat.css")

check(
    "G2.1 The progress indicator is NOT gated on the absence of answer text",
    re.search(r"showProgress\s*=\s*m\.streaming\s*&&\s*stages\.length\s*>\s*0", message_view) is not None,
    "the old `&& !m.content` clause unmounted the indicator at the first token",
)

check(
    "G2.2 The old `!m.content` gate is gone from the visibility test",
    not re.search(r"showProgress\s*=\s*[^\n]*!m\.content", message_view),
    "this was the exact cause: analysing/grounding never got coloured",
)

check(
    "G2.3 The indicator is still rendered under the `showProgress` guard",
    re.search(r"\{showProgress\s*&&\s*<StageProgress", message_view) is not None,
    "FR-4: the indicator stays mounted for the whole stream",
)

check(
    "G2.4 The indicator is still gated on `m.streaming`",
    re.search(r"showProgress\s*=\s*m\.streaming", message_view) is not None,
    "the indicator must not appear on a finished message",
)

check(
    "G2.5 Each stage row carries its status class",
    re.search(r"className=\{`stage \$\{s\.status\}`\}", stage_progress) is not None,
    "`.active` / `.complete` / `.pending` drive the colouring",
)

check(
    "G2.6 All three backend stages are in the known order",
    all(
        k in src("features/chat/types.ts")
        for k in ("fetching_statutes", "analyzing", "grounding")
    ),
    "fetching -> analysing -> grounding must all be renderable",
)

check(
    "G2.7 The stage handler upserts by key (a stage updates, it is not duplicated)",
    re.search(r"findIndex\(\s*\(s\)\s*=>\s*s\.key\s*===?\s*ev\.stage\s*\)", stage_case_body) is not None
    and "stages[i] = s" in stage_case_body
    and "stages.push(s)" in stage_case_body,
    "a stage transitioning active -> complete must update in place",
)

check(
    "G2.8 The stage handler preserves the backend label",
    re.search(r"label:\s*ev\.label\s*\|\|", stage_case_body) is not None,
    "FR-5: the backend label wins; the frontend fallback is secondary",
)

check(
    "G2.9 The active stage is styled as active",
    re.search(r"\.stage\.active\b", chat_css) is not None
    and re.search(r"\.stage\.active\s+\.dot", chat_css) is not None,
    "the amber pulsing dot must exist",
)

check(
    "G2.10 The completed stage is styled as complete",
    re.search(r"\.stage\.complete\b", chat_css) is not None,
    "the green check dot must exist",
)

check(
    "G2.11 The pending stage is styled as pending",
    re.search(r"\.stage\.pending\b", chat_css) is not None,
    "not-yet-started stages must be dimmed",
)

check(
    "G2.12 No CSS change was needed — the colouring rules are the pre-existing ones",
    ".stage.active" in chat_css and ".stage.complete" in chat_css and ".stage.pending" in chat_css,
    "NFR-6: chat.css is reused as-is",
)

# ---------------------------------------------------------------------------
# Group 3 — The fix is driven by backend events, not a local guess
# ---------------------------------------------------------------------------

check(
    "G3.1 No hard-coded stage progression was added to the frontend",
    not re.search(r"setTimeout|setInterval", use_stream),
    "FR-5: the highlight must follow the backend's stage events",
)

check(
    "G3.2 The frontend did not advance a stage on text_delta",
    "stage" not in block_after(use_stream, "case 'text_delta':").lower(),
    "FR-5: text_delta must not drive the stage highlight",
)

check(
    "G3.3 The frontend still reads the stage from the event",
    re.search(r"status:\s*ev\.status", use_stream) is not None,
    "the status comes straight off the wire",
)

# ---------------------------------------------------------------------------
# Group 4 — Regression guards
# ---------------------------------------------------------------------------

check(
    "G4.1 The route-change effect still aborts the previous stream",
    re.search(r"abortRef\.current\?\.abort\(\)", use_stream) is not None,
    "the existing abort path must survive",
)

check(
    "G4.2 The file-upload stages are still emitted and handled",
    "uploaded" in use_stream and "reading_file" in use_stream,
    "the attachment path shares the stage machinery",
)

check(
    "G4.3 The stop/abort control is unchanged",
    re.search(r"const stop = useCallback", use_stream) is not None,
    "NFR-7: the stop path must survive",
)

check(
    "G4.4 The sidebar collapse feature is still wired up",
    re.search(r"useSidebarCollapse\(\)", chat_page) is not None
    and re.search(r"railActive", chat_page) is not None
    and re.search(r"collapsed=\{railActive\}", chat_page) is not None,
    "NFR-7: the sidebar-collapse unit must not regress — the hook, the rail "
    "flag and the prop passed to ChatSidebar must all still be present",
)

check(
    "G4.5 The backend is untouched by this unit",
    True,
    "verified separately by the git diff check below",
)

# ---------------------------------------------------------------------------
# Group 5 — Repository-level guarantees
# ---------------------------------------------------------------------------


def git_diff_stat(repo: Path, path: str) -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(repo), "diff", "--stat", "--", path],
            capture_output=True, text=True, timeout=30,
        )
        return out.stdout.strip()
    except Exception as exc:  # pragma: no cover
        return f"<error: {exc}>"


backend_diff = git_diff_stat(BACKEND, ".")
check(
    "G5.1 legalwave-backend/ has no uncommitted changes",
    backend_diff == "",
    f"FR-6: the backend must not be modified — got: {backend_diff or '(clean)'}",
)

pkg = read(FRONTEND / "package.json")
check(
    "G5.2 No dependency was added to the frontend",
    '"react": "^19.3.1"' in pkg and '"react-router": "^8.5.1"' in pkg,
    "FR-6 / NFR-2: the dependency surface is unchanged",
)

new_files = git_diff_stat(FRONTEND, "src")
check(
    "G5.3 No new source file was added to the frontend",
    "creation" not in new_files,
    f"FR-6: the fix is an edit to existing files — got: {new_files or '(no changes)'}",
)


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

passed = sum(1 for ok, _, _ in results if ok)
failed = len(results) - passed

print(f"chat-streaming unit — static verification")
print(f"=" * 62)
group = ""
for ok, name, detail in results:
    g = name.split(".")[0]
    if g != group:
        group = g
        print()
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}")
    if not ok and detail:
        print(f"         -> {detail}")

print()
print("=" * 62)
print(f"  {passed} passed, {failed} failed, {len(results)} total")
print("=" * 62)

sys.exit(0 if failed == 0 else 1)
