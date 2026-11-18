# Build Instructions — Responsive Auth Design Unit

**Unit**: `responsive-auth` — standalone responsive login/register design artifact
**Deliverable**: `context-docs/mockups/08-responsive-login-register.html`
**Date**: 2026-10-31 (refreshed after Revision 1, alignment to the supplied reference design)
**Scope**: this unit only. The React application in `frontend/` and the backend in `backend/` were **not** built, modified, or tested by this unit.

---

## Prerequisites

| Item | Value |
|---|---|
| **Build tool** | **None** — the deliverable is a single self-contained HTML file (FR-8.1) |
| **Runtime** | Any modern browser: Chrome/Edge 90+, Firefox 90+, Safari 15+ |
| **Dependencies** | **Zero** (NFR — FR-8.4). The only external reference is the Google Fonts stylesheet, pinned by SRI (NFR-4.6) |
| **Environment variables** | **None** (FR-8.5) |
| **Verification tooling** | Python 3.8+ (static verifier), Node.js 18+ (CDP behaviour verifier), Chrome/Chromium 90+ with `--remote-debugging-port` |
| **System requirements** | Any OS; ~100 MB disk (Chrome for the behaviour verifier); no build cache, no `node_modules` |
| **Network** | Only for the optional Google Fonts request and for the SRI re-verification step. The artifact is fully functional offline with the local font fallback stack |

**No build step may be added.** FR-8.1/8.2 mandate a single HTML file with inline CSS and JS. Any process that generates, concatenates, or transpiles the artifact would violate the deliverable constraint.

---

## Build steps

### 1. Confirm the deliverable is present and self-contained

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

ls -l context-docs/mockups/08-responsive-login-register.html
```
- **Expected**: one file, ~46 kB — 46,134 bytes on disk (46,053 characters) at the time of writing.

### 2. Confirm there are no external file dependencies

The file must reference **no** local assets — no `<link rel="stylesheet" href="./…">`, no `<script src="./…">`, no `<img src="./…">`.

```bash
grep -nE '<(script|link|img)[^>]*(src|href)=' \
  context-docs/mockups/08-responsive-login-register.html
```
- **Expected**: exactly **three** matches, all in `<head>`, all absolute `https://fonts.googleapis.com` / `https://fonts.gstatic.com` URLs:
  1. `<link rel="preconnect" href="https://fonts.googleapis.com">`
  2. `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
  3. `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter…&family=Newsreader…">` — this one carries the `integrity` and `crossorigin="anonymous"` attributes

Every other resource must be inline (`<style>` / `<script>`) or an inline SVG.

**There must be no `http://` or relative URL.** Check that every `src`/`href` value is either absolute-`https` or an inline fragment:
```bash
python3 - <<'PY'
import re, pathlib
html = pathlib.Path("context-docs/mockups/08-responsive-login-register.html").read_text()
urls = re.findall(r'\b(?:src|href)="([^"]+)"', html)
bad = [u for u in urls if not (u.startswith("https://fonts.") or u.startswith("#"))]
print(f"{len(urls)} url(s) referenced")
for u in urls: print("  ", u)
print("NON-FONT / RELATIVE URLS:", bad if bad else "none")
PY
```
- **Expected**: `none` under `NON-FONT / RELATIVE URLS`. Only `https://fonts.googleapis.com…` and `https://fonts.gstatic.com` may appear.

```bash
grep -cE '<style|<script' context-docs/mockups/08-responsive-login-register.html
```
- **Expected**: `2` — one `<style>` block and one `<script>` block, both inline.

### 3. Verify the inline CSS and JS are well-formed

The browser is the reference parser, but a quick structural check catches accidental truncation:

```bash
python3 - <<'PY'
import re, pathlib
html = pathlib.Path("context-docs/mockups/08-responsive-login-register.html").read_text()
css = re.search(r"<style>(.*?)</style>", html, re.S)
js  = re.search(r"<script>(.*?)</script>", html, re.S)
assert css, "no inline <style> block"
assert js,  "no inline <script> block"
for name, block, opens, closes in (
    ("css", css.group(1), "{", "}"),
    ("js",  js.group(1),  "{", "}"),
):
    print(f"{name}: {block.group(0).count(opens)} {opens} vs {block.group(0).count(closes)} {closes}")
PY
```
- **Expected**: both counts balanced. An imbalance is the signature of a truncated copy-paste.

### 4. Verify the Google Fonts SRI hash is current

The `<link>` carries `integrity="sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s="` and `crossorigin="anonymous"`. Because Google serves **different CSS bytes per User-Agent**, a plain `curl` may not reproduce the pinned hash — the verifier sends a Chrome-like UA.

```bash
python3 aidlc-docs/scripts/verify-font-sri.py
```
- **Expected output**:
  ```
  crossorigin      : anonymous
  fetched          : 11,196 bytes
  computed         : sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=

  result           : HASH MATCHES — the pinned integrity value is current
  ```
- **Exit code**: `0` on match.

> **Why this step is in the build instructions and not just the test instructions**: SRI is a *build-time* integrity pin. If the upstream stylesheet changes, the browser blocks the font request — the page still renders with the local fallback stack, so the failure is **silent** to a human reviewer but visible to a user on a slow connection. Re-verifying the hash is therefore a release step, not only a test.

### 5. Run the static verifier

```bash
python3 aidlc-docs/scripts/verify-responsive-auth.py
```
- **Expected output**:
  ```
  file            : context-docs/mockups/08-responsive-login-register.html
  size            : 44987 bytes
  checks run      : 152
  result          : ALL CHECKS PASS
  ```
- **Exit code**: `0` when all 152 checks pass, `1` otherwise.

### 6. Run the headless behaviour verifier

The verifier speaks the DevTools Protocol over a WebSocket and therefore needs the `ws` package. It is installed **outside** the repository, in `/tmp/cdp-harness`, so that the deliverable's zero-dependency guarantee (FR-8.4) is never polluted by test-harness dependencies.

```bash
# One-time setup
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1 && npm install ws >/dev/null 2>&1
cd - >/dev/null

# Run
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-behaviour.js
```
- **Expected output**: 45 lines prefixed `PASS`, ending with `45/45 checks passed` / `ALL INTERACTION CHECKS PASS`.
- **Exit code**: `0` when every check passes.
- The script launches headless Chrome on `--remote-debugging-port=9222` and serves the file over `http://localhost:9333` so that the same-origin policy behaves as it would in production.
- **`Cannot find module 'ws'`** means `NODE_PATH` was not set. This is not a defect in the artefact.

### 7. Run the integration verifier

This harness automates the items that the Build and Test stage originally left to a human: the 14-width geometry sweep, the success → reset cycle, six XSS payloads, the storage and cookie probes, the runtime performance measurements, the focus indicators in both themes, and the artwork-panel theme-invariance checks.

```bash
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-manual.js
```
- **Expected output**: 115 lines prefixed `PASS`, ending with `115/115 checks passed` / `ALL MANUAL VERIFICATION CHECKS PASS`.
- **Exit code**: `0` when every check passes.
- The script launches headless Chrome on `--remote-debugging-port=9224` and serves the file over `http://127.0.0.1:9334`.
- **`Cannot find module 'ws'`** means `NODE_PATH` was not set. This is not a defect in the artefact.

### 8. Open the artifact for visual review

```bash
xdg-open context-docs/mockups/08-responsive-login-register.html 2>/dev/null \
  || open context-docs/mockups/08-responsive-login-register.html 2>/dev/null \
  || echo "open it manually: file://$PWD/context-docs/mockups/08-responsive-login-register.html"
```

Review in both themes:
- **Dark** — the browser default when `prefers-color-scheme: dark`, or DevTools → Rendering → Emulate CSS `prefers-color-scheme: dark`.
- **Light** — DevTools → Rendering → Emulate CSS `prefers-color-scheme: light`.

> **Load the file over `http://`, not `file://`.** A `file://` load can restrict the Google Fonts request in some browsers, which changes what you are reviewing.

> **Wait ~2 seconds after load before judging the artwork panel.** The three annotation cards fade in on a stagger — the last one has a 1.2 s animation delay plus a 0.62 s duration. A screenshot taken earlier shows one card, or one and a half, and can be mistaken for a rendering bug.

> **Scenario I-9 remains the highest-value manual check** — compare the artwork panel against the supplied reference design. It is the only check that compares the artefact against a *target* rather than against a rule, and it is the one that caught the defects every automated assertion passed.

---

## Build artifacts

| Artifact | Size | Notes |
|---|---|---|
| `context-docs/mockups/08-responsive-login-register.html` | 46,134 B | The deliverable. Self-contained; 0 dependencies; 0 build output |

There is **no** `dist/` directory for this unit and there must not be one. The artifact is the source.

---

## Verification scripts

| Script | Purpose | Checks | Exit |
|---|---|---|---|
| `aidlc-docs/scripts/verify-responsive-auth.py` | Static analysis: tag balance, id uniqueness, ARIA reference resolution, label association, forbidden APIs (`innerHTML`, `eval`, `document.write`), token discipline, verbatim copy, reduced-motion block, SRI attribute presence, and **computed WCAG contrast** for every text and non-text pair in both themes | 152 | 0 / 1 |
| `aidlc-docs/scripts/verify-font-sri.py` | Re-fetches the Google Fonts stylesheet and recomputes the SHA-256 against the pinned `integrity` value | 1 hash | 0 / 1 |
| `aidlc-docs/scripts/verify-responsive-auth-behaviour.js` | Headless Chrome via the DevTools Protocol: drives the real DOM to test the tablist pattern, validation lifecycle, password visibility, the success/reset cycle, XSS resistance, reduced motion, and outbound network calls. Requires `NODE_PATH=/tmp/cdp-harness/node_modules` (the `ws` package) | 45 | 0 / 1 |
| `aidlc-docs/scripts/verify-responsive-auth-manual.js` | The geometry sweep across 14 widths, the success/reset cycle, 6 XSS payloads, the storage and cookie probes, the runtime performance measurements, the focus indicators in both themes, and the artwork theme-invariance checks. Requires `NODE_PATH=/tmp/cdp-harness/node_modules` (the `ws` package) | 115 | 0 / 1 |
| `aidlc-docs/scripts/validate-plan-diagrams.py` | Validates the Mermaid and ASCII diagrams in the execution and code-generation plans | diagrams | 0 / 1 |

All five live in `aidlc-docs/scripts/`. The first four are unit-specific to this deliverable; the fifth is shared with the plan documentation.

---

## Common warnings

| Warning | Meaning | Action |
|---|---|---|
| `HASH MATCHES` note about Safari | Safari receives different CSS bytes from Google and therefore fails the SRI check, falling back to the local font stack | **Expected.** Documented as an accepted deviation (`generation-notes.md` §10). No action unless the fallback itself is broken |
| Font request blocked in the Network panel | The browser blocked the stylesheet because the SRI hash did not match | **Action required** — re-run `verify-font-sri.py`; if the upstream bytes changed, the pinned hash must be updated deliberately, and the change recorded as a deviation |
| `checks run : 152` with `ALL CHECKS PASS` | Everything is fine | None |

---

## Troubleshooting

### The verifier reports failures

1. Read the failing lines — each carries the assertion message and, for contrast checks, the measured ratio.
2. Re-read the relevant requirement in `aidlc-docs/inception/requirements/responsive-auth/requirements.md`.
3. Fix the **artifact**, not the verifier. The verifier encodes FR-1…FR-8 and NFR-1…NFR-6 directly; changing it to make a check pass invalidates the check.
4. Re-run all three scripts in order: static → SRI → behaviour.

### The behaviour verifier cannot launch Chrome

- **"Could not connect to CDP"** — Chrome did not start on port 9222. Check that no other process holds the port:
  ```bash
  ss -ltnp | grep 9222 || echo "port free"
  ```
  The script waits for the endpoint to appear; a stale process from a previous run is the usual cause. Kill it and re-run.
- **Chrome is missing** — install Chromium/Chrome, or point the script at an existing binary via the `CHROME` environment variable if it supports one. Otherwise run the manual E2E checklist in `e2e-test-instructions.md` as the substitute.

### A check fails only in one theme

The two themes are separate token scopes. The light theme overrides **only** the form-panel tokens inside `@media (prefers-color-scheme: light)`; the artwork tokens are deliberately **not** redeclared there (FR-6.3 / NFR-1.3 theme-invariance).

If an artwork colour appears to change with the theme, a token has been redeclared in the light block by mistake. The static verifier asserts that `--art-accent` and the other 11 artwork tokens are **absent** from the light block — that assertion is the regression guard.

### Contrast fails after a colour change

Use the measured-contrast helper inside the static verifier rather than eyeballing a colour. The verifier computes the WCAG 2.1 relative luminance and the contrast ratio for every declared text and non-text pair in both themes.

The important nuance discovered during this build: the mandated light-theme amber `#B8741A` **is** valid as a *fill* (4.90:1 against `#1A1208` ink) but **not** as *text* (3.60:1 on the cream panel). That is why the accent is split into three tokens:

| Token | Role | Light value |
|---|---|---|
| `--accent` | fills, borders, rules | `#B8741A` |
| `--accent-text` | accent-coloured **text** | `#96600F` (5.02:1) |
| `--accent-ink` | **text on** an amber fill | `#1A1208` (4.90:1) |

Splitting the token is the fix; darkening `#B8741A` further would break the brief's mandated palette (NFR-6.2).

---

## Rollback

This unit added **one** file and touched **zero** existing files. Rollback is:

```bash
rm context-docs/mockups/08-responsive-login-register.html
```

Nothing in `frontend/` or `backend/` depends on it.
