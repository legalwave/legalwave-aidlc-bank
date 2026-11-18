"""Generate the component-relationship ASCII diagram with guaranteed equal line widths.

Widths are solved, not guessed: the inner boxes are sized first, then the
container is padded to make every line exactly WIDTH characters.
"""
import sys

WIDTH = 72

# --- Solve the inner geometry -------------------------------------------
# Sibling boxes side by side, separated by a gap, inside the container.
BOX_W = 27          # width of each inner component box
GAP = 6             # horizontal gap between the two boxes
PAD_L = 3           # container left padding before the first box
PAD_R = 3           # container right padding after the second box
CONTENT_W = PAD_L + BOX_W + GAP + BOX_W + PAD_R

# The container's inner area must be at least CONTENT_W wide, and the border
# adds one character on each side.
BORDER_W = CONTENT_W + 2


def box(title, sub, note):
    """Return the 5 lines of an inner box, each exactly BOX_W wide."""
    inner = BOX_W - 2
    out = ["+" + "-" * inner + "+"]
    out.append("|" + title.ljust(inner) + "|")
    out.append("|" + sub.ljust(inner) + "|")
    out.append("|" + note.ljust(inner) + "|")
    out.append("+" + "-" * inner + "+")
    for l in out:
        assert len(l) == BOX_W, (len(l), l)
    return out


def container_line(left, mid, right):
    """'left' + 'mid' + 'right' padded to exactly BORDER_W, wrapped in pipes."""
    assert len(left) + len(mid) + len(right) <= BORDER_W - 2
    body = (left + mid + right).ljust(BORDER_W - 2)
    return "|" + body + "|"


def container_top():
    return "+" + "-" * (BORDER_W - 2) + "+"


def container_bottom():
    return "+" + "-" * (BORDER_W - 2) + "+"


def nested_row(text):
    """A row inside the nested mockups box: '| ' + text + padding + '||'.

    Layout: container pipe (1) + nested pipe (1) + ' ' (1) + text + padding
            + nested pipe (1) + container pipe (1)
    """
    avail = BORDER_W - 4  # characters available between the two nested pipes
    assert len(text) <= avail - 1, (len(text), avail)
    return "|" + "| " + text.ljust(avail - 1) + "|" + "|"


def nested_top():
    # container pipe + nested corner + dashes + nested corner + container pipe
    return "|" + "+" + "-" * (BORDER_W - 4) + "+" + "|"


def nested_bottom():
    return "|" + "+" + "-" * (BORDER_W - 4) + "+" + "|"


lines = []
lines.append(container_top())
lines.append(container_line("  ", "  LegalWave Workspace (brownfield)", "  "))
lines.append(container_line("  ", " " * (BORDER_W - 6), "  "))

left_box = box("  frontend/", "  React 19 + Vite", "  (NOT MODIFIED)")
right_box = box("  backend/", "  FastAPI + LangChain", "  (NOT MODIFIED)")

for i in range(5):
    l = " " * PAD_L + left_box[i]
    g = " " * GAP
    r = right_box[i] + " " * PAD_R
    row = l + g + r
    assert len(row) == CONTENT_W, (len(row), CONTENT_W)
    # The container's inner area is BORDER_W - 2. Centre the row inside it.
    inner_w = BORDER_W - 2
    slack = inner_w - len(row)
    assert slack >= 0, (slack, inner_w)
    lead = slack // 2
    trail = slack - lead
    lines.append("|" + " " * lead + row + " " * trail + "|")

lines.append(container_line("  ", " " * (BORDER_W - 6), "  "))

lines.append(nested_top())
lines.append(nested_row("context-docs/mockups/   <- ONLY TOUCHED DIRECTORY"))
lines.append(nested_row("  01-login.html .. 07-pdf-on-request.html  (UNTOUCHED)"))
lines.append(nested_row("  08-responsive-login-register.html      (NEW)"))
lines.append(nested_bottom())
lines.append(container_bottom())

for l in lines:
    assert len(l) == BORDER_W, (len(l), repr(l))

out = "\n".join(lines)
if len(sys.argv) > 1:
    open(sys.argv[1], "w", encoding="utf-8").write(out + "\n")
    print(f"wrote {sys.argv[1]} ({BORDER_W} cols x {len(lines)} lines)")
else:
    print(out)
