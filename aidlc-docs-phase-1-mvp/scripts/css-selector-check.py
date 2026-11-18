import re, glob, os, sys

def selectors(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'@(media|supports)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css, flags=re.S)
    css = re.sub(r'@keyframes\s+[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css, flags=re.S)
    out = []
    for m in re.finditer(r'([^{}]+)\{', css):
        sel = m.group(1).strip()
        if not sel or sel.startswith('@'):
            continue
        for part in sel.split(','):
            p = part.strip()
            if p:
                out.append(p)
    return out

files = sorted(glob.glob('src/**/*.css', recursive=True))
dest = {}
for f in files:
    for s in selectors(open(f).read()):
        dest.setdefault(s, []).append(f)

print("CSS destination files:")
for f in files:
    print("  %-52s %6d bytes" % (f, os.path.getsize(f)))
print()
print("distinct selectors across all files:", len(dest))

# A selector is a cross-file duplicate only if it is defined in 2+ DISTINCT files.
# Repeating the same selector twice within one file is legal CSS (later wins).
cross = {k: sorted(set(v)) for k, v in dest.items() if len(set(v)) > 1}
print("selectors defined in more than one file:", len(cross))
if cross:
    for k, v in cross.items():
        print("   CROSS-FILE DUP:", k, "->", v)
    sys.exit(1)

same_file = {k: v for k, v in dest.items() if len(v) > 1}
print()
print("selectors declared twice within a single file (legal CSS, later rule wins):", len(same_file))
for k, v in same_file.items():
    print("   %-12s x%d in %s" % (k, len(v), sorted(set(v))[0]))
print()
print("OK: no cross-file selector duplication.")
