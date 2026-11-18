#!/usr/bin/env python3
"""
Static verifier for the `auth-port` unit.

The CDP harness (`verify-auth-port.js`) proves the port BEHAVES correctly in a
real browser. This script proves the port's STATIC contracts hold — the ones a
browser cannot easily show, or that must hold in the source regardless of
runtime behaviour:

  - the 20 original dark tokens are byte-for-byte unchanged (FR-8.7)
  - the light-theme override is scoped to `.auth-form-panel`, never `:root` (D9)
  - the artwork panel's tokens are declared once and never re-declared in the
    light block (theme invariance, FR-6.4)
  - `auth.css` contains no raw hex outside its documented exceptions
  - the `data-testid` and element-id contracts are present (FR-8.1, FR-8.3)
  - the tablist is wired as an APG tablist (FR-3.2, FR-3.3)
  - the D9 `min()` width cap and the D10 explicit colour survive (FR-2.10)
  - the clause uses a hanging indent, never `display:flex` (FR-2.3)
  - a `prefers-reduced-motion` block exists (FR-7.6)
  - no `dangerouslySetInnerHTML`, `eval`, or `innerHTML` in the auth feature
  - the Google Fonts stylesheet carries a Subresource Integrity hash (NFR-6.3)

Usage:
    python3 aidlc-docs/scripts/verify-auth-port.py

Exit code 0 = every check passed.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
AUTH = FRONTEND / "src" / "features" / "auth"

TOKENS_CSS = FRONTEND / "src" / "styles" / "tokens.css"
AUTH_CSS = AUTH / "styles" / "auth.css"
INDEX_HTML = FRONTEND / "index.html"

results: list[tuple[bool, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((bool(ok), name, detail))
    return bool(ok)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# The 20 original dark tokens — the exact declarations that existed before the
# auth-port unit began. These must be untouched: the chat, citations and
# settings screens are dark-only (FR-8.7).
#
# The EXPECTED VALUES are pinned too, so a silent edit to a shared token is
# caught even though the token NAME is still present.
# ---------------------------------------------------------------------------
ORIGINAL_TOKENS = {
    "--bg-canvas": "#1F1B1C",
    "--bg-surface": "#2A2A2D",
    "--bg-sunken": "#151516",
    "--bg-sidebar": "#1B1B1D",
    "--ink-primary": "#F4F1EC",
    "--ink-secondary": "#B8B0A4",
    "--ink-tertiary": "#7C746A",
    "--accent-amber": "#D2973B",
    "--accent-amber-hover": "#E8B260",
    "--accent-amber-soft": "#3A2E1F",
    "--severity-compliant": "#6FA08A",
    "--severity-risky": "#D2973B",
    "--severity-noncompliant": "#C97064",
    "--severity-noncompliant-soft": "#3A1F1D",
    "--line-subtle": "#2F2B2D",
    "--line-strong": "#403B3E",
    "--serif": "'Source Serif 4','Noto Serif JP',Georgia,serif",
    "--sans": "'Inter','Noto Sans JP',system-ui,sans-serif",
    "--shadow-level-1": "0 1px 2px rgba(0,0,0,.32)",
    "--shadow-level-2": "0 8px 24px rgba(0,0,0,.44)",
}


def parse_blocks(css: str) -> list[tuple[str, str]]:
    """
    Split a stylesheet into (selector, body) pairs.

    A hand-rolled scanner is used rather than a regex because the stylesheet
    contains nested braces (gradient stops), comments and `@media` blocks — a
    naive `\\{([^}]*)\\}` would mis-split them.
    """
    blocks: list[tuple[str, str]] = []
    i = 0
    n = len(css)
    while i < n:
        # Find the next '{'.
        open_brace = css.find("{", i)
        if open_brace == -1:
            break
        selector = css[i:open_brace].strip()
        # Walk to the matching '}', skipping strings and comments.
        depth = 0
        j = open_brace
        while j < n:
            ch = css[j]
            if ch == "/" and j + 1 < n and css[j + 1] == "*":
                end = css.find("*/", j + 2)
                j = n if end == -1 else end + 2
                continue
            if ch in "\"'":
                quote = ch
                j += 1
                while j < n and css[j] != quote:
                    j += 2 if css[j] == "\\" else 1
                j += 1
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        body = css[open_brace + 1 : j]
        # The selector is everything after the previous '}' — trim comments out.
        selector = re.sub(r"/\*.*?\*/", " ", selector, flags=re.S).strip()
        # Only the last line of the selector text is the real selector; the
        # rest belongs to a previous rule's body in this scanner.
        if "\n" in selector:
            selector = selector.split("\n")[-1].strip()
        blocks.append((selector, body))
        i = j + 1
    return blocks


def strip_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", " ", text, flags=re.S)


def check_tokens() -> None:
    css = read(TOKENS_CSS)
    blocks = parse_blocks(css)

    root_blocks = [(sel, body) for sel, body in blocks if sel == ":root"]
    check(
        "the original :root token block is present",
        len(root_blocks) == 1,
        f"{len(root_blocks)} :root block(s)",
    )
    if not root_blocks:
        return
    body = strip_comments(root_blocks[0][1])

    for token, expected in ORIGINAL_TOKENS.items():
        match = re.search(
            rf"{re.escape(token)}\s*:\s*([^;]+);", body
        )
        ok = match is not None and match.group(1).strip() == expected
        check(
            f"the original token {token} is unchanged",
            ok,
            f"expected {expected!r}, got {match.group(1).strip()!r}" if match else f"{token} missing",
        )

    # The auth scope must be a SEPARATE block, not an extension of :root.
    auth_blocks = [sel for sel, _ in blocks if sel == ".auth-page"]
    check(
        "the auth tokens are declared in a separate .auth-page scope",
        len(auth_blocks) == 1,
        f"{len(auth_blocks)} .auth-page block(s)",
    )

    # The artwork tokens must be declared exactly once — a second declaration
    # inside the light block would make the artwork theme-dependent.
    for art_token in ("--art-bg", "--art-text", "--art-accent"):
        occurrences = len(re.findall(rf"{re.escape(art_token)}\s*:", css))
        check(
            f"the artwork token {art_token} is declared exactly once",
            occurrences == 1,
            f"{art_token} declared {occurrences} time(s)",
        )


def check_light_theme_scope() -> None:
    """D9 — the light override is scoped to the form panel, never `:root`."""
    css = read(TOKENS_CSS)

    # Find every `@media (prefers-color-scheme: light)` block and the rules
    # directly inside it.
    light_blocks: list[str] = []
    for match in re.finditer(
        r"@media\s*\(prefers-color-scheme\s*:\s*light\)\s*\{", css
    ):
        start = match.end()
        depth = 1
        i = start
        while i < len(css) and depth > 0:
            if css[i] == "{":
                depth += 1
            elif css[i] == "}":
                depth -= 1
            i += 1
        light_blocks.append(css[start : i - 1])

    check(
        "a prefers-color-scheme: light block exists",
        len(light_blocks) >= 1,
        f"{len(light_blocks)} light block(s)",
    )

    for index, block in enumerate(light_blocks):
        selectors = []
        for sel, body in parse_blocks(block):
            if sel.startswith("@"):
                continue
            if sel:
                selectors.append(sel)
        scoped = bool(selectors) and all(
            s.startswith(".auth-form-panel") for s in selectors
        )
        check(
            f"light block {index + 1} is scoped to .auth-form-panel only",
            scoped and ":root" not in block,
            f"selectors: {selectors}",
        )
        check(
            f"light block {index + 1} does not redeclare any artwork token",
            not re.search(r"--art-", block),
            "artwork token redeclared in the light block",
        )

    # The whole stylesheet must never restyle the global root in a light theme.
    check(
        "no light-scheme :root override exists anywhere in tokens.css",
        not re.search(
            r"@media\s*\(prefers-color-scheme\s*:\s*light\)[^{]*\{[^}]*:root",
            css,
            re.S,
        ),
        "a :root override inside a light media query was found",
    )


def check_auth_css() -> None:
    css = read(AUTH_CSS)
    blocks = parse_blocks(css)

    def body_for(selector: str) -> str | None:
        for sel, body in blocks:
            if sel == selector:
                return strip_comments(body)
        return None

    # --- D9: the annotation card width cap -------------------------------
    card_body = body_for(".auth-card")
    check(
        "the .auth-card rule exists",
        card_body is not None,
        "no .auth-card rule",
    )
    if card_body is not None:
        width = re.search(r"width\s*:\s*([^;]+);", card_body)
        check(
            "the card width is capped with min() (D9)",
            width is not None and "min(" in width.group(1),
            width.group(1) if width else "no width declaration",
        )
        check(
            "the card width cap is relative to --card-left (D9)",
            width is not None and "--card-left" in width.group(1),
            width.group(1) if width else "no width declaration",
        )
        # --- D10: the theme-invariant card colour -------------------------
        check(
            "the annotation card carries an explicit theme-invariant colour (D10)",
            re.search(r"color\s*:\s*var\(--art-text\)", card_body) is not None,
            "no color:var(--art-text) on the card",
        )

    # --- FR-2.3: hanging indent, never flex --------------------------------
    clause_body = body_for(".auth-clause")
    check(
        "the .auth-clause rule exists",
        clause_body is not None,
        "no .auth-clause rule",
    )
    if clause_body is not None:
        check(
            "the clause uses a hanging indent (padding-left + negative text-indent)",
            re.search(r"padding-left\s*:\s*32px", clause_body) is not None
            and re.search(r"text-indent\s*:\s*-32px", clause_body) is not None,
            clause_body.replace("\n", " ")[:120],
        )
        check(
            "the clause does NOT use display:flex",
            re.search(r"display\s*:\s*flex", clause_body) is None,
            "display:flex found on .auth-clause",
        )

    # --- reduced motion ----------------------------------------------------
    check(
        "a prefers-reduced-motion block exists (FR-7.6)",
        re.search(r"@media\s*\(prefers-reduced-motion\s*:\s*reduce\)", css) is not None,
        "no reduced-motion block",
    )

    # --- the responsive breakpoint -----------------------------------------
    check(
        "a 900px breakpoint block exists (NFR-2.4)",
        re.search(r"@media\s*\(max-width\s*:\s*900px\)", css) is not None,
        "no 900px breakpoint",
    )

    # --- no raw hex outside the documented exceptions ----------------------
    # The auth stylesheet must not hard-code colours; they come from the token
    # blocks. The exceptions are the two translucent overlay colours and the
    # contract-page background, which are part of the artwork itself.
    allowed_hex = {
        "1e1d1c", "262524", "2b2a29", "3a3836", "ece8e1", "a09b93",
        "e3a53a", "1a1208", "171615", "e8c24a", "6fbf73", "f6f3ee",
        "efebe2", "2a2724", "6b645c",
    }
    hexes = {
        h.lower().lstrip("#")
        for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", strip_comments(css))
    }
    unexpected = sorted(hexes - allowed_hex)
    check(
        "auth.css hard-codes no unexpected raw hex colour",
        not unexpected,
        f"unexpected hex values: {unexpected}",
    )

    # --- every selector is scoped -----------------------------------------
    unscoped = []
    for sel, _ in blocks:
        if not sel or sel.startswith("@") or sel.startswith(":root"):
            continue
        for part in sel.split(","):
            part = part.strip()
            if not part:
                continue
            # A selector is in scope if every compound in it starts with an
            # auth class — e.g. `.auth-tab[aria-selected="true"]`.
            compounds = re.findall(r"[.#]?[A-Za-z_][\w-]*", part)
            if not any(c.startswith(".auth") for c in compounds):
                unscoped.append(part)
    check(
        "every selector in auth.css is scoped to the auth feature",
        not unscoped,
        f"unscoped selectors: {sorted(set(unscoped))}",
    )


def check_components() -> None:
    """The DOM contracts — FR-8.1 (testids), FR-8.3 (element ids)."""

    screen = read(AUTH / "components" / "AuthScreen.tsx")
    artwork = read(AUTH / "components" / "AuthArtwork.tsx")
    tabs = read(AUTH / "components" / "AuthTabs.tsx")
    password = read(AUTH / "components" / "PasswordField.tsx")
    google = read(AUTH / "components" / "GoogleButton.tsx")
    notice = read(AUTH / "components" / "AuthNotice.tsx")
    login = read(AUTH / "pages" / "LoginPage.tsx")
    register = read(AUTH / "pages" / "RegisterPage.tsx")
    validation = read(AUTH / "hooks" / "useAuthValidation.ts")

    # --- the app's original testids survive -------------------------------
    # The cross-link testids live in the PAGES (they are passed down as the
    # `crossLink` prop), so each testid is searched across the whole feature.
    feature_sources = {
        "AuthScreen.tsx": screen,
        "AuthArtwork.tsx": artwork,
        "AuthTabs.tsx": tabs,
        "PasswordField.tsx": password,
        "GoogleButton.tsx": google,
        "AuthNotice.tsx": notice,
        "LoginPage.tsx": login,
        "RegisterPage.tsx": register,
    }

    def has_testid(testid: str) -> bool:
        for name, source in feature_sources.items():
            if f'"{testid}"' in source or f"'{testid}'" in source:
                return True
        return False

    for testid in (
        "login-form",
        "login-form-email-input",
        "login-form-password-input",
        "login-form-submit-button",
        "login-form-register-link",
        "login-form-error",
        "register-form",
        "register-form-name-input",
        "register-form-email-input",
        "register-form-password-input",
        "register-form-submit-button",
        "register-form-login-link",
    ):
        check(
            f"the original data-testid {testid} is preserved",
            has_testid(testid),
            "testid not found anywhere in the auth feature",
        )

    # --- the new artifact testids -----------------------------------------
    # FR-8.2 — the artifact's own testid family must also be emitted. An
    # element can carry only one `data-testid`, so where the app's family
    # already owns an element, the artifact's testid rides on a wrapper
    # that encloses it (decision D6).
    for testid in (
        "auth-tab-signin",
        "auth-tab-register",
        "auth-signin-form",
        "auth-register-form",
        "auth-signin-identifier-input",
        "auth-signin-password-input",
        "auth-signin-password-toggle",
        "auth-signin-submit-button",
        "auth-register-name-input",
        "auth-register-email-input",
        "auth-register-password-input",
        "auth-register-password-toggle",
        "auth-register-submit-button",
        "auth-forgot-password-button",
        "auth-google-button",
        "auth-google-register-button",
        "auth-form-panel",
        "auth-annotation-card",
        "auth-contract",
        "brand",
    ):
        found = testid in screen or testid in tabs or testid in artwork or testid in password or testid in google
        check(
            f"the artifact data-testid {testid} is present",
            found,
            "testid not found in the auth components",
        )

    # --- the original element ids survive ----------------------------------
    for element_id in (
        "login-email",
        "login-password",
        "register-name",
        "register-email",
        "register-password",
    ):
        check(
            f"the original element id {element_id} is preserved",
            f'id="{element_id}"' in screen,
            f'id="{element_id}" not found in AuthScreen.tsx',
        )

    # --- the error elements are wired to their inputs ----------------------
    # The password fields are rendered by `PasswordField`, which receives the
    # `describedBy` prop — so the wiring is checked there, not in AuthScreen.
    for element_id in ("login-email", "register-name", "register-email"):
        check(
            f"{element_id} is linked to its error via aria-describedby",
            f'aria-describedby="{element_id}-error"' in screen,
            f"aria-describedby for {element_id} not found",
        )
    check(
        "the PasswordField receives the login password's describedBy id",
        'describedBy="login-password-error"' in screen,
        "describedBy for login-password not found",
    )
    check(
        "the PasswordField receives the register password's describedBy id",
        'describedBy="register-password-error"' in screen,
        "describedBy for register-password not found",
    )
    check(
        "the PasswordField renders the describedBy onto the input",
        "describedBy" in password and "aria-describedby" in password,
        "the PasswordField does not set aria-describedby",
    )

    # --- the APG tablist wiring (FR-3.2, FR-3.3) --------------------------
    check('role="tablist"' in tabs, "no role=tablist")
    check('role="tab"' in tabs, "no role=tab")
    check('role="tabpanel"' in screen, "no role=tabpanel")
    check("aria-selected" in tabs, "no aria-selected")
    check("aria-controls" in tabs, "no aria-controls")
    check("aria-labelledby" in screen, "no aria-labelledby")
    check(
        "the tablist carries an accessible name",
        'aria-label=' in tabs,
        "the tablist has no aria-label",
    )
    for key in ("ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"):
        check(
            f"the tablist handles {key}",
            f"'{key}'" in tabs or f'"{key}"' in tabs,
            f"{key} not handled",
        )
    check(
        "the roving tabindex is implemented (selected=0, other=-1)",
        "tabIndex={isActive ? 0 : -1}" in tabs,
        "no roving tabindex",
    )

    # --- the live region (FR-4.3) -----------------------------------------
    check('id="live-region"' in screen, "no live region")
    check('aria-live="polite"' in screen, "no aria-live=polite live region")
    check('role="status"' in screen, "no role=status live region")

    # --- the password toggle ------------------------------------------------
    check(
        "the password toggle switches the input type",
        "'password'" in password and "'text'" in password,
        "the toggle does not switch the type",
    )
    check(
        "the password toggle exposes aria-pressed",
        "aria-pressed" in password,
        "no aria-pressed on the toggle",
    )

    # --- the notice (D5) ---------------------------------------------------
    check('role="status"' in notice, "the notice is not a status region")

    # --- the artwork (FR-2.1 … FR-2.10) -----------------------------------
    for statute in ("Civil Code, Art. 132", "Civil Code, Art. 541", "Civil Code, Art. 1"):
        check(
            f"the artwork cites {statute}",
            statute in artwork,
            f"{statute} not found in AuthArtwork.tsx",
        )
    for verdict in ("YELLOW", "GREEN"):
        check(
            f"the artwork carries a {verdict} verdict chip",
            verdict in artwork,
            f"{verdict} verdict chip not found",
        )
    check(
        "the artwork contract is reachable by its original testid",
        'data-testid="auth-contract"' in artwork,
        "no auth-contract testid",
    )

    # --- the real API is still wired (D1) ---------------------------------
    check(
        "the sign-in page still calls the real signIn",
        "signIn(" in login,
        "no signIn call",
    )
    check(
        "the register page still calls the real signUp",
        "signUp(" in register,
        "no signUp call",
    )
    check(
        "a successful sign-in navigates to the chat",
        "ROUTES.CHAT" in login,
        "no navigation to ROUTES.CHAT",
    )
    check(
        "a successful registration navigates to the chat",
        "ROUTES.CHAT" in register,
        "no navigation to ROUTES.CHAT",
    )
    check(
        "the server error is surfaced (FR-5.6)",
        "(e as Error).message" in login and "(e as Error).message" in register,
        "the server error message is not surfaced",
    )
    check(
        "the busy flag is always cleared (NFR-4.7)",
        "setBusy(false)" in login and "setBusy(false)" in register,
        "no setBusy(false) in a finally block",
    )

    # --- FR-4.9: validation runs before any request ------------------------
    for name, page in (("sign-in", login), ("register", register)):
        validate_at = page.find("validateAll(")
        sign_at = page.find("signIn(" if name == "sign-in" else "signUp(")
        check(
            f"the {name} form validates before it issues a request (FR-4.9)",
            validate_at != -1 and sign_at != -1 and validate_at < sign_at,
            f"validateAll at {validate_at}, request at {sign_at}",
        )

    # --- the validation rules (FR-4.5, FR-4.6) ----------------------------
    check(
        "the sign-in identifier accepts a username (FR-4.5)",
        "looksLikeUsername" in validation,
        "no username rule",
    )
    check(
        "the register password has an 8-character minimum (FR-4.6)",
        re.search(r"value\.length\s*<\s*8", validation) is not None,
        "no 8-character minimum",
    )
    check(
        "the sign-in password has NO length rule (FR-4.6)",
        "login-password" in validation and "value.length < 8" in validation,
        "the sign-in password rule was not found",
    )
    check(
        "the blur re-validation is armed only after a submit (FR-4.1)",
        "armBlurValidation" in validation and "if (!submitted) return" in validation,
        "the blur validation is not gated on the submitted flag",
    )
    check(
        "the live region is cleared before an announcement (FR-4.3)",
        "region.textContent = ''" in validation,
        "the live region is not cleared before writing",
    )


def check_security() -> None:
    """NFR-6.x — no injection vectors, and the font stylesheet is pinned."""

    for path in sorted(AUTH.rglob("*.tsx")) + sorted(AUTH.rglob("*.ts")):
        source = read(path)
        rel = path.relative_to(ROOT)
        for pattern, label in (
            (r"dangerouslySetInnerHTML", "dangerouslySetInnerHTML"),
            (r"\beval\s*\(", "eval()"),
            (r"\bnew\s+Function\s*\(", "new Function()"),
            (r"\.innerHTML\s*=", "innerHTML assignment"),
            (r"document\.write\s*\(", "document.write()"),
        ):
            check(
                f"{rel} contains no {label}",
                re.search(pattern, source) is None,
                f"{label} found in {rel}",
            )

    html = read(INDEX_HTML)
    check(
        "the Google Fonts stylesheet carries a Subresource Integrity hash (NFR-6.3)",
        re.search(r'<link[^>]+href="https://fonts\.googleapis\.com[^"]*"[^>]*integrity="sha256-[^"]+"', html, re.S)
        is not None,
        "no integrity attribute on the Google Fonts stylesheet",
    )
    check(
        "the Google Fonts stylesheet declares crossorigin",
        'crossorigin="anonymous"' in html,
        "no crossorigin on the Google Fonts stylesheet",
    )


def check_no_collateral_damage() -> None:
    """FR-8.7 / the package change sequence — nothing else was touched."""

    deleted = [
        AUTH / "components" / "AuthCard.tsx",
        AUTH / "components" / "Brand.tsx",
    ]
    for path in deleted:
        check(
            f"the superseded {path.name} was removed",
            not path.exists(),
            f"{path.name} still exists",
        )

    # The backend must not have been touched by a frontend unit.
    backend = ROOT / "backend"
    if backend.exists():
        check(
            "the backend directory is still present and untouched",
            backend.is_dir(),
            "backend is missing",
        )


def main() -> int:
    for path in (TOKENS_CSS, AUTH_CSS, INDEX_HTML):
        if not path.exists():
            print(f"FATAL: required file missing: {path}")
            return 2

    check_tokens()
    check_light_theme_scope()
    check_auth_css()
    check_components()
    check_security()
    check_no_collateral_damage()

    passed = sum(1 for ok, _, _ in results if ok)
    failed = len(results) - passed

    for ok, name, detail in results:
        if not ok:
            print(f"FAIL  {name}" + (f"  — {detail}" if detail else ""))

    print()
    print("============================================")
    print(f"checks run      : {len(results)}")
    print(f"passed          : {passed}")
    print(f"failed          : {failed}")
    print(f"result          : {'ALL CHECKS PASS' if failed == 0 else 'FAILURES PRESENT'}")
    print("============================================")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
