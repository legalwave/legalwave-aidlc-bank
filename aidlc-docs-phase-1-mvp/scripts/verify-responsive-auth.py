"""Static verification for context-docs/mockups/08-responsive-login-register.html.

Checks the mechanical requirements that can be asserted without a browser:
markup balance, id uniqueness, ARIA wiring, label association, forbidden
APIs, token discipline, verbatim copy, the reduced-motion block, and SRI.

Usage:  python3 aidlc-docs/scripts/verify-responsive-auth.py
Exit 0 = all checks pass, exit 1 = failures.
"""
import re
import sys
from html.parser import HTMLParser

PATH = "context-docs/mockups/08-responsive-login-register.html"

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

failures = []
checks = 0


def strip_comments_and_strings(text):
    """Remove HTML comments and JS/CSS string literals.

    Used so that an API name appearing in a comment ("never innerHTML") or in
    a human-readable string is not mistaken for an actual call.
    """
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    text = re.sub(r"'(?:\\.|[^'\\])*'", "''", text)
    text = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
    return text


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        failures.append(message)


# --------------------------------------------------------------------------
# WCAG 2.1 contrast (NFR-1.3)
# --------------------------------------------------------------------------
def _channel(value):
    c = value / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour):
    """Relative luminance of a #rrggbb colour (WCAG 2.1 formula)."""
    h = hex_colour.lstrip("#")
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def contrast_ratio(fg, bg):
    """Contrast ratio between two #rrggbb colours."""
    l_fg = luminance(fg)
    l_bg = luminance(bg)
    hi, lo = max(l_fg, l_bg), min(l_fg, l_bg)
    return (hi + 0.05) / (lo + 0.05)


def token_value(html, name, theme="dark"):
    """Read a CSS custom property's value for a given theme.

    Dark theme values live in the :root block; the light theme overrides
    them in a @media (prefers-color-scheme: light) :root block. Returns None
    when the token is absent in the requested theme.
    """
    if theme == "light":
        m = re.search(
            r"@media \(prefers-color-scheme: light\)\s*\{\s*:root\s*\{([^}]*)\}",
            html, re.S)
        if not m:
            return None
        scope = m.group(1)
    else:
        m = re.search(r":root\s*\{([^}]*)\}", html, re.S)
        if not m:
            return None
        scope = m.group(1)
    t = re.search(rf"--{re.escape(name)}\s*:\s*(#[0-9A-Fa-f]{{3,8}})", scope)
    return t.group(1) if t else None


class Structure(HTMLParser):
    """Collects tags, ids, and ARIA attributes while tracking balance."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.ids = []
        self.attrs = []          # (tag, {attr: value})
        self.labels = []         # (for_target,)
        self.aria_refs = []      # (attr, value)
        self.unclosed = []

    def handle_starttag(self, tag, attrs):
        a = {k: (v if v is not None else "") for k, v in attrs}
        self.attrs.append((tag, a))
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "label" and "for" in a:
            self.labels.append(a["for"])
        for key in ("aria-controls", "aria-labelledby", "aria-describedby"):
            if key in a and a[key]:
                for ref in a[key].split():
                    self.aria_refs.append((key, ref))
        if tag not in VOID:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.unclosed.append(f"stray </{tag}>")
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
            return
        # tolerate implicit closes, but report mismatches
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for orphan, _ in self.stack[i + 1:]:
                    self.unclosed.append(f"<{orphan}> not closed")
                del self.stack[i:]
                return
        self.unclosed.append(f"stray </{tag}>")


def main():
    global checks
    try:
        html = open(PATH, encoding="utf-8").read()
    except OSError as exc:
        print(f"FAIL: cannot read {PATH}: {exc}")
        return 1

    parser = Structure()
    parser.feed(html)
    parser.close()

    for orphan, _ in parser.stack:
        parser.unclosed.append(f"<{orphan}> not closed")

    # --- markup balance ---
    check(not parser.unclosed, f"unbalanced markup: {parser.unclosed[:5]}")

    # --- duplicate ids ---
    seen = set()
    dupes = []
    for i in parser.ids:
        if i in seen:
            dupes.append(i)
        seen.add(i)
    check(not dupes, f"duplicate id attributes: {sorted(set(dupes))}")

    idset = set(parser.ids)

    # --- ARIA references resolve ---
    unresolved = sorted({ref for _, ref in parser.aria_refs if ref not in idset})
    check(not unresolved, f"ARIA references to missing ids: {unresolved}")

    # --- every input has a label ---
    input_ids = [a["id"] for tag, a in parser.attrs if tag == "input" and a.get("type") != "hidden" and "id" in a]
    labelled = set(parser.labels)
    unlabelled = sorted(set(input_ids) - labelled)
    check(not unlabelled, f"inputs without an associated <label for>: {unlabelled}")

    # --- tab pattern wiring ---
    roles = {}
    for tag, a in parser.attrs:
        r = a.get("role")
        if r:
            roles.setdefault(r, []).append(a)
    check(len(roles.get("tablist", [])) == 1, "expected exactly one role=tablist")
    check(len(roles.get("tab", [])) == 2, f"expected 2 role=tab, found {len(roles.get('tab', []))}")
    check(len(roles.get("tabpanel", [])) == 2, f"expected 2 role=tabpanel, found {len(roles.get('tabpanel', []))}")

    tab_ids = {a.get("id") for a in roles.get("tab", []) if a.get("id")}
    for a in roles.get("tab", []):
        check("aria-selected" in a, f"tab {a.get('id')} missing aria-selected")
        check(a.get("aria-controls") in idset, f"tab {a.get('id')} aria-controls unresolved")
    for a in roles.get("tabpanel", []):
        check(a.get("aria-labelledby") in tab_ids, f"tabpanel {a.get('id')} aria-labelledby not a tab")

    # --- exactly one selected tab, roving tabindex ---
    selected = [a for a in roles.get("tab", []) if a.get("aria-selected") == "true"]
    check(len(selected) == 1, f"expected exactly 1 tab with aria-selected=true, got {len(selected)}")
    zero_tabs = [a for a in roles.get("tab", []) if a.get("tabindex") == "0"]
    check(len(zero_tabs) == 1, f"expected exactly 1 tab with tabindex=0 (roving), got {len(zero_tabs)}")

    # --- password toggle aria-label ---
    toggles = [a for _, a in parser.attrs if "pw-toggle" in a.get("class", "")]
    check(len(toggles) == 2, f"expected 2 password toggles, found {len(toggles)}")
    for t in toggles:
        check(bool(t.get("aria-label")), "password toggle missing aria-label")
        check(t.get("aria-controls") in idset, "password toggle aria-controls unresolved")

    # --- forbidden APIs (SECURITY-05 / NFR-4.2, NFR-4.8, NFR-4.9) ---
    # Strip comments and string literals first, so a token named in a comment
    # ("never innerHTML") is not mistaken for an actual call.
    code = strip_comments_and_strings(html)
    for token in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write",
                  "eval(", "new Function", "insertRow"):
        check(token not in code, f"forbidden API present: {token}")

    # --- no storage / cookie / logging of values ---
    for token in ("localStorage", "sessionStorage", "document.cookie", "console.log",
                  "console.debug", "console.info"):
        check(token not in code, f"forbidden persistence/logging token present: {token}")

    # --- no outbound calls (NFR-3.1, FR-5.5) ---
    for token in ("fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource",
                  "navigator.serviceWorker"):
        check(token not in code, f"outbound call present: {token}")

    # --- form has no real endpoint ---
    for tag, a in parser.attrs:
        if tag == "form":
            check(not a.get("action"), "form has an action attribute")
            check(a.get("method", "get").lower() not in ("post", "put", "patch", "delete"),
                  f"form uses method {a.get('method')}")
            check("novalidate" in a, "form missing novalidate")

    # --- SRI on the font stylesheet (SECURITY-13, NFR-4.6) ---
    # Only the rel="stylesheet" link is the protected resource; the preconnect
    # links are hints that fetch nothing and legitimately carry no integrity.
    font_links = [a for tag, a in parser.attrs
                  if tag == "link" and "fonts.googleapis.com" in a.get("href", "")
                  and a.get("rel") == "stylesheet"]
    check(len(font_links) == 1, f"expected 1 Google Fonts stylesheet link, found {len(font_links)}")
    if font_links:
        fl = font_links[0]
        check("integrity" in fl and fl["integrity"].startswith("sha256-"),
              f"font link missing sha256 integrity (got {fl.get('integrity')!r})")
        check(fl.get("crossorigin") == "anonymous", "font link missing crossorigin=anonymous")

    # --- token discipline: hex literals only inside the token blocks ---
    # NFR-5.2 — every colour resolves to a token. Any hex literal that appears
    # outside a token declaration block is a violation.
    code_only = strip_comments_and_strings(html)
    token_spans = []
    for m in re.finditer(r":root\s*\{[^{}]*\}", code_only):
        token_spans.append(m.span())
    # The light-scheme override is also a token block.
    for m in re.finditer(r"@media \(prefers-color-scheme: light\)\s*\{", code_only):
        start = m.end()
        depth = 1
        i = start
        while i < len(code_only) and depth:
            if code_only[i] == "{":
                depth += 1
            elif code_only[i] == "}":
                depth -= 1
            i += 1
        token_spans.append((m.start(), i))
    check(len(token_spans) >= 2, f"expected a :root block and a light-theme override, found {len(token_spans)}")

    def in_token_span(pos):
        return any(s <= pos < e for s, e in token_spans)

    stray = []
    for m in re.finditer(r"#[0-9A-Fa-f]{3,8}\b", code_only):
        if not in_token_span(m.start()):
            stray.append(m.group(0))
    stray = sorted(set(stray))
    check(not stray, f"colour literals outside the token blocks (NFR-5.2): {stray}")

    # --- required palette present ---
    for token in ("#1E1D1C", "#262524", "#2B2A29", "#3A3836", "#ECE8E1",
                  "#A09B93", "#E3A53A", "#6FBF73", "#E8C24A"):
        check(token.lower() in html.lower(), f"required palette value missing: {token}")
    check("#F5F2EC".lower() in html.lower(), "light-theme cream #F5F2EC missing")
    check("#B8741A".lower() in html.lower(), "light-theme amber #B8741A missing")

    # --- WCAG contrast, both themes (NFR-1.3) ---
    # Text pairs need 4.5:1; non-text UI (focus rings, borders, fills) needs
    # 3:1. The light theme's mandated #B8741A is 3.60:1 on the cream panel, so
    # it is used for FILLS and BORDERS only — accent-coloured TEXT uses the
    # separate --accent-text token, and the button label uses --accent-ink.
    TEXT_PAIRS = {
        "dark": [
            ("body text on canvas", "text", "bg-canvas", 4.5),
            ("body text on panel", "text", "bg-panel", 4.5),
            ("muted text on canvas", "text-muted", "bg-canvas", 4.5),
            ("muted text on panel", "text-muted", "bg-panel", 4.5),
            ("input text on input", "text", "bg-input", 4.5),
            ("link text on panel", "accent-text", "bg-panel", 4.5),
            ("link text on input", "accent-text", "bg-input", 4.5),
            ("button label on button fill", "accent-ink", "accent", 4.5),
        ],
        "light": [
            ("body text on canvas", "text", "bg-canvas", 4.5),
            ("body text on panel", "text", "bg-panel", 4.5),
            ("muted text on canvas", "text-muted", "bg-canvas", 4.5),
            ("muted text on panel", "text-muted", "bg-panel", 4.5),
            ("input text on input", "text", "bg-input", 4.5),
            ("link text on panel", "accent-text", "bg-panel", 4.5),
            ("link text on canvas", "accent-text", "bg-canvas", 4.5),
            ("button label on button fill", "accent-ink", "accent", 4.5),
        ],
    }
    NON_TEXT_PAIRS = {
        "dark": [
            ("focus ring on panel", "accent", "bg-panel", 3.0),
            ("focus ring on input", "accent", "bg-input", 3.0),
            ("button fill on panel", "accent", "bg-panel", 3.0),
            ("checkbox checkmark on fill", "accent-ink", "accent", 3.0),
        ],
        "light": [
            ("focus ring on panel", "accent", "bg-panel", 3.0),
            ("focus ring on canvas", "accent", "bg-canvas", 3.0),
            ("focus ring on input", "accent", "bg-input", 3.0),
            ("button fill on panel", "accent", "bg-panel", 3.0),
            ("checkbox checkmark on fill", "accent-ink", "accent", 3.0),
        ],
    }
    for theme in ("dark", "light"):
        for label, fg_tok, bg_tok, minimum in TEXT_PAIRS[theme] + NON_TEXT_PAIRS[theme]:
            fg = token_value(html, fg_tok, theme)
            bg = token_value(html, bg_tok, theme)
            if fg is None or bg is None:
                check(False,
                      f"contrast {theme}: token missing for {label} "
                      f"(--{fg_tok} / --{bg_tok})")
                continue
            ratio = contrast_ratio(fg, bg)
            check(ratio >= minimum,
                  f"contrast {theme}: {label} is {ratio:.2f}:1 "
                  f"(need {minimum}:1) — {fg} on {bg}")

    # The artwork panel is always dark, so its accent must not follow the
    # form panel's theme swap (FR-2.10, FR-6.3). Theme-invariance means the
    # light-theme block does NOT redeclare the artwork tokens.
    art_accent_dark = token_value(html, "art-accent", "dark")
    art_accent_light = token_value(html, "art-accent", "light")
    check(art_accent_dark is not None,
          "artwork accent token --art-accent is missing from the :root block")
    check(art_accent_light is None,
          "the light theme must not redeclare --art-accent — the artwork "
          "panel stays dark in both themes (FR-2.10)")
    for art_token in ("art-bg", "art-glow", "art-rule", "art-paper", "art-ink",
                      "art-ink-soft", "art-ink-body", "art-skeleton",
                      "scan-core", "art-text", "art-text-muted"):
        check(token_value(html, art_token, "light") is None,
              f"the light theme must not redeclare --{art_token} — the "
              f"artwork panel stays dark in both themes (FR-2.10)")
    if art_accent_dark:
        ratio = contrast_ratio(art_accent_dark, "#1E1D1C")
        check(ratio >= 4.5,
              f"artwork accent {art_accent_dark} on the annotation card is "
              f"{ratio:.2f}:1 (need 4.5:1)")

    # --- verbatim copy (NFR-6.3) ---
    for phrase in ("Every clause, checked against the statute.", "LegalWave",
                   "Sign in", "Create account", "Welcome back", "Create your account",
                   "Keep me signed in", "Forgot password?", "Continue with Google",
                   "Not legal advice · Verdicts are informational",
                   "Service Agreement", "Article 12", "Article 13", "e-Gov"):
        check(phrase in html, f"required copy string missing: {phrase!r}")

    # --- e-Gov statute citations with real Civil Code articles ---
    for art in ("Art. 541", "Art. 132", "Art. 1"):
        check(art in html, f"statute citation missing: {art}")
    check(html.count("e-Gov") >= 3, "each annotation card should carry an e-Gov label")

    # --- annotation card anatomy (matches the reference design) ---
    # Each card carries a clause reference, a statute citation with the e-Gov
    # marker, a verdict chip, and one sentence of analysis.
    check(html.count('class="card-ref"') == 3,
          f"expected 3 clause references, found {html.count('class=\"card-ref\"')}")
    check(html.count('class="card-statute"') == 3,
          f"expected 3 statute citations, found {html.count('class=\"card-statute\"')}")
    check(html.count('class="card-verdict') == 3,
          f"expected 3 verdict chips, found {html.count('class=\"card-verdict')}")
    # The cards are colour-coded by verdict on their left edge, and the colour
    # must also be stated in text (never colour alone).
    check(html.count('class="card green"') == 2,
          "expected 2 GREEN annotation cards")
    check(html.count('class="card yellow"') == 1,
          "expected 1 YELLOW annotation card")

    # --- numbered clauses on the contract page ---
    check(html.count('class="clause-no"') == 3,
          f"expected 3 numbered clauses, found {html.count('class=\"clause-no\"')}")
    for no in ("12.1", "12.2", "13.1"):
        check(f">{no}<" in html, f"clause number missing: {no}")

    # --- Google brand mark on both "Continue with Google" buttons ---
    check(html.count('class="google-mark"') == 2,
          f"expected 2 Google brand marks, found {html.count('class=\"google-mark\"')}")

    # --- verdict chips carry text, not colour alone ---
    check(html.count("GREEN") >= 2, "GREEN chip label missing")
    check(html.count("YELLOW") >= 1, "YELLOW chip label missing")

    # --- reduced motion block (FR-7.4, FR-7.5) ---
    reduced = re.search(r"@media \(prefers-reduced-motion: reduce\)\{.*?\n\}", html, re.S)
    check(reduced is not None, "no prefers-reduced-motion block found")
    if reduced:
        rb = reduced.group(0)
        check(".scanline" in rb, "reduced-motion block does not disable the scan line")
        check("animation:none" in rb or "animation: none" in rb, "reduced-motion block does not disable animation")
        check("transition:none" in rb or "transition: none" in rb, "reduced-motion block does not disable transitions")

    # --- only two automatic motions ---
    animations = re.findall(r"animation:\s*([a-z-]+)", html)
    keyframes = set(re.findall(r"@keyframes\s+([a-z-]+)", html))
    live = {a for a in animations if a not in keyframes and a != "none"}
    check(len(keyframes) == 2, f"expected exactly 2 @keyframes (scan + card fade), found {len(keyframes)}: {keyframes}")
    check(len(live) == 0, f"unexpected animation shorthand outside @keyframes: {live}")

    # --- motion durations (FR-2.4, FR-7.3) ---
    check("6s" in html, "6-second scan line duration not found")
    check(".4s" in html and ".8s" in html and "1.2s" in html, "staggered card delays not found")

    # --- rotation (FR-2.2) ---
    check("-1.6deg" in html, "contract rotation -1.6deg not found")

    # --- breakpoint (FR-1.2) ---
    check("@media (max-width:900px)" in html, "900px breakpoint not found")
    check("200px" in html, "200px mobile banner height not found")

    # --- radius (FR-6.5) ---
    check("--radius:10px" in html.replace(" ", ""), "10px radius token not found")

    # --- viewport meta (NFR-2.1) ---
    check('name="viewport"' in html, "viewport meta tag missing")

    # --- data-testid coverage ---
    testids = re.findall(r'data-testid="([^"]+)"', html)
    check(len(testids) >= 12, f"expected >=12 data-testid attributes, found {len(testids)}")
    check(len(testids) == len(set(testids)), "duplicate data-testid values found")

    # --- aria-live region (FR-4.3) ---
    check('aria-live="polite"' in html, "aria-live region missing")
    check('role="status"' in html, "status role missing")

    # --- decorative elements hidden (FR-7.9) ---
    for cls in ("art-glow", "art-rules", "scanline", "art-connectors"):
        check(re.search(rf'class="{cls}"[^>]*aria-hidden="true"', html) is not None
              or re.search(rf'class="[^"]*\b{cls}\b[^"]*"[^>]*aria-hidden="true"', html) is not None,
              f"{cls} is not marked aria-hidden")

    # --- no prototype notice in the rendered markup (FR-3.14) ---
    # Only the static markup counts; the script's runtime messages are not
    # part of the initial render.
    static_markup = re.sub(r"<script\b.*?</script>", " ", html, flags=re.S | re.I)
    static_markup = re.sub(r"<!--.*?-->", " ", static_markup, flags=re.S)
    static_markup = re.sub(r"<style\b.*?</style>", " ", static_markup, flags=re.S | re.I)
    visible_text = re.sub(r"<[^>]+>", " ", static_markup)
    visible_text = re.sub(r"\s+", " ", visible_text).strip()
    check("prototype" not in visible_text.lower(),
          f"unexpected prototype notice in the rendered markup: {visible_text[:120]!r}")

    # --- report ---
    print(f"file            : {PATH}")
    # The file is UTF-8 and contains multi-byte characters (em-dashes, middle
    # dots, Japanese punctuation), so the character count and the byte count
    # differ. Report both, and label each correctly.
    print(f"size            : {len(html):,} characters")
    print(f"size on disk    : {len(html.encode('utf-8')):,} bytes")
    print(f"checks run      : {checks}")
    if failures:
        print(f"\nFAILED ({len(failures)}):")
        for f in failures:
            print("  -", f)
        return 1
    print("result          : ALL CHECKS PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
