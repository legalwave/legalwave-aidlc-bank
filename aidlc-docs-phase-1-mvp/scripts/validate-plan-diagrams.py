"""Validate the Mermaid flowchart and the ASCII diagram in the responsive-auth execution plan."""
import re
import sys

PLAN = "aidlc-docs/inception/plans/responsive-auth-execution-plan.md"

text = open(PLAN, encoding="utf-8").read()

errors = []

# --- Extract mermaid blocks ---
blocks = re.findall(r"```mermaid\n(.*?)```", text, re.S)
if not blocks:
    errors.append("no mermaid block found")

for i, block in enumerate(blocks):
    lines = [l for l in block.split("\n") if l.strip()]
    # Node id sanity
    for line in lines:
        m = re.match(r"^\s*([A-Za-z0-9_]+)\[", line)
        if m:
            if not re.match(r"^[A-Za-z][A-Za-z0-9_]*$", m.group(1)):
                errors.append(f"block{i}: bad node id {m.group(1)!r}")
        # subgraph / end balance
    if block.count("subgraph") != block.count("\n    end"):
        # count 'end' lines that close subgraphs
        ends = len(re.findall(r"^\s*end\s*$", block, re.M))
        if block.count("subgraph") != ends:
            errors.append(
                f"block{i}: subgraph count {block.count('subgraph')} != end count {ends}"
            )
    # Bracket balance inside labels
    for line in lines:
        if line.strip().startswith("style") or line.strip().startswith("linkStyle"):
            continue
        opens = line.count("[")
        closes = line.count("]")
        if opens != closes:
            errors.append(f"block{i}: unbalanced [] in {line.strip()!r}")
        par_o = line.count("(")
        par_c = line.count(")")
        if par_o != par_c:
            errors.append(f"block{i}: unbalanced () in {line.strip()!r}")
    # No unescaped double quotes inside node labels (would break parsing)
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("subgraph") or stripped.startswith("style") or stripped.startswith("linkStyle"):
            continue
        if '"' in stripped:
            q = stripped.count('"')
            if q % 2 != 0:
                errors.append(f"block{i}: odd quote count in {stripped!r}")
    # Edge lines reference known ids
    ids = set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)\[", block, re.M))
    ids |= set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)\(\(", block, re.M))
    ids |= set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)\(\[\[", block, re.M))
    ids |= set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)\(\(\[", block, re.M))
    ids |= set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)\(\)", block, re.M))
    # Stadium nodes: ID(["label"])
    ids |= set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)\(\[\"", block, re.M))
    # Any node id at the start of a line, regardless of shape
    ids |= set(re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*)(?=\s*[\(\[])", block, re.M))
    # Node ids declared inline on an edge line, e.g. "BT --> End([\"Complete\"])"
    ids |= set(re.findall(r"([A-Za-z][A-Za-z0-9_]*)\s*\(\[\"", block))
    for line in lines:
        s = line.strip()
        if "-->" in s:
            left, right = s.split("-->", 1)
            for side in (left, right):
                side = side.strip()
                m = re.match(r"^([A-Za-z][A-Za-z0-9_]*)", side)
                if m and m.group(1) not in ids:
                    errors.append(f"block{i}: edge references unknown id {m.group(1)!r}")
    # style targets must exist
    for m in re.finditer(r"^style\s+([A-Za-z][A-Za-z0-9_]*)\s", block, re.M):
        if m.group(1) not in ids:
            errors.append(f"block{i}: style targets unknown id {m.group(1)!r}")

# --- Extract ASCII diagrams (fenced blocks with no language) ---
ascii_blocks = [
    b
    for b in re.findall(r"```\n(.*?)```", text, re.S)
    if any(line.strip().startswith("+") for line in b.split("\n"))
]
if not ascii_blocks:
    errors.append("no ascii diagram block found")

for i, block in enumerate(ascii_blocks):
    lines = block.split("\n")
    # find contiguous runs of diagram lines
    run = []
    runs = []
    for line in lines:
        if line.strip().startswith("+") or line.strip().startswith("|"):
            run.append(line)
        else:
            if run:
                runs.append(run)
                run = []
    if run:
        runs.append(run)
    for r_i, run in enumerate(runs):
        widths = {len(l) for l in run}
        if len(widths) > 1:
            errors.append(f"ascii{i}.{r_i}: inconsistent widths {sorted(widths)}")
        for l in run:
            if "\t" in l:
                errors.append(f"ascii{i}.{r_i}: tab character present")
            bad = set(l) - set("+-|^v<> ") - set(
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'\"()[]{}:#=/&*_%$?!;,~@`"
            )
            if bad:
                errors.append(f"ascii{i}.{r_i}: non-ASCII/odd chars {sorted(bad)} in {l!r}")

if errors:
    print("VALIDATION FAILED")
    for e in errors:
        print("  -", e)
    sys.exit(1)

print(f"mermaid blocks validated: {len(blocks)}")
print(f"ascii diagram blocks validated: {len(ascii_blocks)}")
print("OK")
