"""Re-verify the SRI hash pinned on the Google Fonts stylesheet.

Google Fonts content-negotiates on the User-Agent header and returns different
CSS bytes per browser, so no single hash is authoritative everywhere. The
artifact pins the hash for the Chrome/Firefox-agreeing response and relies on
the local font fallback stack elsewhere.

This script re-fetches that response and confirms the pinned value still
matches, so an upstream change is caught rather than silently breaking fonts.

Usage:  python3 aidlc-docs/scripts/verify-font-sri.py
Exit 0 = hash still valid (or the network is unavailable and this is skipped),
exit 1 = hash mismatch.
"""
import base64
import hashlib
import re
import sys
import urllib.error
import urllib.request

PATH = "context-docs/mockups/08-responsive-login-register.html"

# The Chrome UA that produced the pinned hash. Chrome and Firefox agree on
# the response bytes; Safari differs and is covered by the local fallback.
CHROME_UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
             "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

FONT_HREF = ("https://fonts.googleapis.com/css2"
             "?family=Inter:wght@400;500;600"
             "&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600"
             "&display=swap")


def pinned_integrity(html):
    m = re.search(
        r'<link[^>]*href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*integrity="(sha256-[^"]+)"',
        html)
    if not m:
        m = re.search(
            r'<link[^>]*integrity="(sha256-[^"]+)"[^>]*href="https://fonts\.googleapis\.com/css2[^"]*"',
            html)
    return m.group(1) if m else None


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": CHROME_UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def main():
    try:
        html = open(PATH, encoding="utf-8").read()
    except OSError as exc:
        print(f"FAIL: cannot read {PATH}: {exc}")
        return 1

    pinned = pinned_integrity(html)
    if not pinned:
        print("FAIL: no sha256 integrity attribute found on the Google Fonts stylesheet link")
        return 1
    print(f"pinned integrity : {pinned}")

    if "crossorigin" not in html.split("fonts.googleapis.com/css2")[1].split(">")[0]:
        print("FAIL: the stylesheet link is missing crossorigin=\"anonymous\"")
        return 1
    print("crossorigin      : anonymous")

    try:
        body = fetch(FONT_HREF)
    except (urllib.error.URLError, OSError) as exc:
        print(f"SKIP: network unavailable ({exc}) — cannot re-verify the hash")
        return 0

    digest = base64.b64encode(hashlib.sha256(body).digest()).decode()
    computed = f"sha256-{digest}"
    print(f"fetched          : {len(body):,} bytes")
    print(f"computed         : {computed}")

    if computed != pinned:
        print("\nFAILED: the upstream stylesheet changed.")
        print("  The pinned integrity hash no longer matches, so browsers would")
        print("  refuse the stylesheet. Update the integrity attribute in")
        print(f"  {PATH}, and note the browser-variant caveat in")
        print("  aidlc-docs/construction/responsive-auth/code/generation-notes.md")
        return 1

    print("\nresult           : HASH MATCHES — the pinned integrity value is current")
    print("note             : this hash is authoritative for Chrome/Firefox.")
    print("                   Safari receives different bytes and falls back to")
    print("                   the local font stack (documented deviation).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
