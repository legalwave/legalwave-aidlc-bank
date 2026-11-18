"""Prove that the sidebar-collapse feature lost no pre-existing CSS selector.

Strategy
--------
1. Parse every stylesheet in `frontend/src/` into its set of top-level selectors
   (the same extraction the S12 inventory used).
2. Rebuild the *pre-change* selector universe by removing the selectors this
   feature introduced from `chat.css` and unioning with the untouched files.
3. Report any pre-change selector that is absent from the current source.

A non-zero "lost" count is a regression; "new" is expected and reported.
"""
import glob
import re
import sys

BASE = "frontend/src"


def sel_set(css: str) -> set[str]:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(
        r"@(media|supports)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}", "", css, flags=re.S
    )
    css = re.sub(
        r"@keyframes\s+[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}", "", css, flags=re.S
    )
    out: set[str] = set()
    for m in re.finditer(r"([^{}]+)\{", css):
        sel = m.group(1).strip()
        if not sel or sel.startswith("@"):
            continue
        for part in sel.split(","):
            p = part.strip()
            if p:
                out.add(p)
    return out


# Selectors introduced by the sidebar-collapse feature (T2), amended by the
# defect-fix pass (T2b).
#
# The fix pass replaced the ten per-child collapse selectors with a single
# `.sidebar-panel` wrapper and added a second, rail-side toggle button.
# Both the removed and the added selectors are listed here so the
# reconstructed pre-change universe stays accurate either way.
FEATURE_SELECTORS = {
    # ── added by the defect-fix pass ────────────────────────────────────
    ".sidebar-panel",
    ".sidebar-toggle-expanded",
    ".sidebar-toggle-collapsed",
    ".shell .sidebar-panel",
    ".shell.sidebar-collapsed .sidebar-panel",
    ".shell.drawer-open .sidebar-panel",
    # ── introduced by T2 and still present ─────────────────────────────
    ".sidebar-head",
    ".sidebar-head .sidebar-brand",
    ".sidebar-toggle",
    ".sidebar-toggle:hover",
    ".sidebar-toggle:focus-visible",
    ".sidebar-toggle svg",
    ".sidebar-rail",
    ".rail-logo",
    ".rail-new-chat",
    ".rail-new-chat:hover",
    ".rail-new-chat:focus-visible",
    ".sidebar-scrim",
    ".sidebar-scrim.visible",
    ".shell.sidebar-collapsed",
    ".shell.sidebar-collapsed .sidebar",
    ".shell.sidebar-collapsed .sidebar-rail",
    # ── introduced by T2 and REMOVED by the defect-fix pass ─────────────
    ".shell.sidebar-collapsed .sidebar-head",
    ".shell.sidebar-collapsed .new-chat",
    ".shell.sidebar-collapsed .search",
    ".shell.sidebar-collapsed .groups",
    ".shell.sidebar-collapsed .sidebar-footer",
    ".shell .sidebar-head",
    ".shell .new-chat",
    ".shell .search",
    ".shell .groups",
    ".shell .sidebar-footer",
    # ── introduced by T2 and REMOVED by the rail-simplification pass ────
    ".rail-chats",
    ".rail-chat",
    ".rail-chat:hover",
    ".rail-chat.active",
    ".rail-chat:focus-visible",
    ".rail-chat svg",
}


def main() -> int:
    files = sorted(glob.glob(f"{BASE}/**/*.css", recursive=True))
    if not files:
        print("FAIL: no stylesheets found under", BASE)
        return 1

    current: set[str] = set()
    for f in files:
        current |= sel_set(open(f, encoding="utf-8").read())

    chat_path = f"{BASE}/features/chat/styles/chat.css"
    chat_current = sel_set(open(chat_path, encoding="utf-8").read())
    chat_pre = chat_current - FEATURE_SELECTORS

    others: set[str] = set()
    for f in files:
        if f != chat_path:
            others |= sel_set(open(f, encoding="utf-8").read())

    pre_change_universe = chat_pre | others

    lost = sorted(s for s in pre_change_universe if s not in current)
    added = sorted(current - pre_change_universe)

    print("current distinct selectors :", len(current))
    print("pre-change selectors        :", len(pre_change_universe))
    print("pre-change selectors LOST   :", len(lost))
    for s in lost:
        print("   LOST:", s)
    print("selectors added by feature  :", len(added))
    for s in added:
        print("   NEW :", s)

    if lost:
        print("\nFAIL: a pre-existing selector was dropped.")
        return 1
    print("\nOK: no pre-existing selector was dropped by the sidebar-collapse feature.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
