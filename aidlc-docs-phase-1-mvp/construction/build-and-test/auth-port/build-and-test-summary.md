# Build and Test Summary — Auth Port Unit

**Unit**: `auth-port` — apply the approved `responsive-auth` design to the running React SPA
**Deliverable**: `frontend/src/features/auth/` (the two-panel auth screen) + two additive edits to `frontend/src/styles/tokens.css` and `frontend/index.html`
**Date**: 2026-10-31
**Scope**: this unit only. `backend/` was not built, modified, or tested.

---

## Build status

| Field | Value |
|---|---|
| **Build tool** | Vite 8.3.5 via `npm --prefix frontend run build` (`tsc -b && vite build`) |
| **Build status** | ✅ **Success** |
| **Build time** | **631 ms** (`✓ 377 modules transformed`) |
| **Type-check** | ✅ `tsc -b` clean — the whole project, not only the changed files |
| **Lint** | ✅ **0 errors**, 5 pre-existing warnings, all in files this unit did not touch |
| **Dependencies** | **0 added** (FR-8.6) — `frontend/package.json` is byte-identical to its pre-unit state |
| **Build artifacts** | `dist/assets/index-k8zENhSs.js` 462.10 kB (gzip 142.98 kB) · `dist/assets/index-z5W5B0pq.css` 29.70 kB (gzip 6.75 kB) · `dist/index.html` 1.35 kB (gzip 0.74 kB) |
| **Backend** | ✅ Untouched (FR-8.8) |

---

## Test execution summary

### Static verification (the unit-test substitute)

| Field | Value |
|---|---|
| **Total checks** | 172 |
| **Passed** | 172 |
| **Failed** | 0 |
| **Status** | ✅ **Pass** |

```
============================================
checks run      : 172
passed          : 172
failed          : 0
result          : ALL CHECKS PASS
============================================
```

The 172 checks cover 28 groups spanning the 20 original token **values**, the light-theme scoping, the `auth.css` invariants (D9, D10, the hanging indent, the reduced-motion block, the breakpoint), both `data-testid` families, the component contracts, the validation rules, the security scan, and the no-collateral-damage check.

### Behaviour verification (CDP, headless Chrome, production build)

| Field | Value |
|---|---|
| **Total checks** | 131 |
| **Passed** | 131 |
| **Failed** | 0 |
| **Status** | ✅ **Pass** — **deterministic over repeated consecutive runs** |

```
131/131 checks passed
ALL CHECKS PASS
```

The 131 checks run across **13 parts**:

| Part | Checks | Covers |
|---|---|---|
| 1 | 37 | Structure and the contracts — the `/login` route, all 31 testids in the rendered DOM, the two families' nesting, the real `signIn`, the navigation to the chat |
| 2 | 21 | The same on `/register` — the real `signUp`, the navigation to the chat, the register testid family |
| 3 | 8 | Tab navigation and the APG keyboard pattern — the roving `tabindex`, Arrow/Home/End, and **focus following the selection across the route swap** |
| 4 | 8 | The password visibility toggle — the `type` swap, `aria-pressed`, the action label |
| 5 | 17 | The validation lifecycle — the rules, the blocking of an invalid submit, the error clearing on blur, the live-region announcement |
| 6 | 4 | The demo-only controls raising an explicit notice |
| 7 | 5 | The theme invariance of the artwork panel — the background, the card border, the card text, the inherited card colour |
| 8 | 5 | The geometry sweep across 14 widths — no overflow, no card escapes |
| 9 | 1 | The 900 px breakpoint and the 1440×900 fit |
| 10 | 3 | The reduced-motion path |
| 11 | 3 | The password is never persisted |
| 12 | 12 | The source artifact's own static invariants, re-verified inside the SPA |
| 13 | 7 | **Theme containment** — the chat screen stays dark under `prefers-color-scheme: light` |

### Integration scenarios

| Field | Value |
|---|---|
| **Scenarios defined** | 6 (I-1 … I-6) |
| **Automated** | ✅ Every one is covered by the 131 CDP checks |
| **Manual** | ⏳ Available as a human cross-check — the two highest-value ones are **I-4** (keyboard-only traversal, where the focus defect lived) and **I-5** (the theme containment) |

### Performance

| Field | Value |
|---|---|
| **Structural checks** | 13 (P1–P13) — all ✅ |
| **Runtime measurements** | 7 (B-1 … B-7) — **B-7 automated**; B-1 … B-6 are by-eye DevTools measurements with a structural proxy for each |
| **Status** | ✅ **Pass** on every executed check |

### Additional tests

| Category | Status | Notes |
|---|---|---|
| **Security tests** | ✅ **Pass** | The forbidden-API scan, the SRI `integrity` + `crossorigin` attributes, the password-persistence probes, and the validation-before-the-request check |
| **E2E tests** | ✅ **Pass** (automated) | The 131 CDP checks are the automated E2E suite; the manual scenarios supplement them |
| **Visual review** | ⏳ Available | The 14-width geometry sweep is automated; a by-eye comparison against the approved design remains worthwhile |
| **Contract tests** | ✅ **Pass** | The two `data-testid` families and the `auth-card` / `brand` testids are asserted in the **rendered DOM** on both routes |
| **Coverage** | N/A | No coverage tooling — the project has no test runner, and FR-8.6 forbids adding one |

---

## Overall status

| Dimension | Status |
|---|---|
| **Build** | ✅ Success — 377 modules, 631 ms |
| **Type-check** | ✅ `tsc -b` clean |
| **Lint** | ✅ 0 errors, 5 pre-existing warnings |
| **Static verification** | ✅ 172 / 172 |
| **Behaviour verification** | ✅ 131 / 131 — deterministic |
| **Performance (structural)** | ✅ 13 / 13 |
| **Security** | ✅ Pass |
| **Contract preservation** | ✅ All 31 testids in the rendered DOM, on both routes |
| **Backend** | ✅ Untouched |
| **Ready for Operations** | ✅ Yes |

---

## Instruction files

| File | Contents |
|---|---|
| `build-instructions.md` | Prerequisites, the 8 build steps, why the harness serves the production build, the verification scripts, common warnings, troubleshooting, rollback |
| `unit-test-instructions.md` | The 172-check inventory by group, the requirement → check traceability matrix, failure triage, the mutation-test table, and the manual visual review |
| `integration-test-instructions.md` | The 131 CDP checks across 13 parts, the focus defect in full, the 6 manual scenarios, the geometry sweep, the two-testid-family contract, the security probes, and how to add a check |
| `performance-test-instructions.md` | 13 structural checks (P1–P13), 7 runtime measurements (B-1–B-7), the recorded results, and the optimisation guidance |

---

## Requirement verification matrix

### Functional requirements

| Req | Summary | Verified by | Status |
|---|---|---|---|
| **FR-1** | The two-panel split (55/45), collapsing below 900 px to a 200 px banner, both panels 100vh, no desktop scroll at 1440×900 | Static group 11; CDP Parts 8, 9 | ✅ |
| **FR-2** | The artwork panel — the tilted contract, the meta line, the hanging clauses 12.1/12.2/13.1, the highlights, the skeleton bars, the amber scan line, the brand lockup, the headline, three annotation cards with statute citations and verdict chips | Static groups 7, 8, 9, 21; CDP Parts 7, 8, 12 | ✅ |
| **FR-3** | The form panel — the two tabs with a sliding underline, the APG wiring, the roving `tabindex`, the headings and subtitles, the fields, the Show/Hide toggles, the amber primary button, the "or" divider, the Google button with the brand mark, the notices, the footer, the in-flight state, the server error | Static groups 17, 18, 19; CDP Parts 3, 4, 6 | ✅ |
| **FR-4** | The validation rule set — on submit then on blur, plain-language messages, `aria-describedby` + `aria-live`, a non-colour-only error state, the username-or-email identifier, the 8-character register password with no sign-in length rule, the whitespace-as-empty rule, and validation **before** any request | Static groups 20, 24, 25; CDP Part 5 | ✅ |
| **FR-5** | Both routes reachable, the route determining the active tab, the tab **navigating**, the success navigating to `ROUTES.CHAT` with `replace: true`, the mode switch resetting validation state, the server error in the existing element | Static groups 22, 23; CDP Parts 1, 2 | ✅ |
| **FR-6** | The visual design — the dark token set, the cream light theme with the split amber (`#B8741A` for fills, `#96600F` for text), the theme-invariant artwork panel, Newsreader + Inter, the 10 px radius, the amber focus ring, no gradients, no neon | Static groups 3, 4, 5, 8, 12; CDP Part 7 | ✅ |
| **FR-7** | Motion and accessibility — only two automatic motions, the 6-second scan loop, the one-shot staggered card fade-in (0.4/0.8/1.2 s, 0.62 s), the full reduced-motion path, a `<label>` on every input | Static groups 9, 10; CDP Part 10 | ✅ |
| **FR-8** | The `data-testid` contract — both families, the preserved testids, the field ids, the SRI stylesheet, the untouched backend | Static groups 14, 15, 16, 21, 26, 28; CDP Parts 1, 2, 12, 13 | ✅ |

### Non-functional requirements

| Req | Summary | Verified by | Status |
|---|---|---|---|
| **NFR-1** | Accessibility — keyboard operable, the APG pattern, focus following selection, announced errors, correct ARIA, no colour-only state | Static groups 17, 18, 19, 20, 25; CDP Parts 3, 5 | ✅ |
| **NFR-2** | Responsiveness — 320 px to 2560 px with no horizontal scroll, the 900 px breakpoint, no card escape at any width | Static group 11; CDP Parts 8, 9 | ✅ |
| **NFR-3** | Performance — no new dependency, compositor-friendly animation, no layout thrash, a bounded bundle increase | Performance P1–P13 | ✅ |
| **NFR-4** | Security — validation before the request, no HTML insertion, no password persistence or logging, the busy flag always cleared, no default credentials, SRI on the CDN | Static groups 23, 26, 27; CDP Parts 5, 11 | ✅ |
| **NFR-5** | Maintainability — no raw hex outside the token blocks, every selector scoped, the tokens as the single source, the app's existing file structure preserved | Static groups 12, 13 | ✅ |
| **NFR-6** | Fidelity — the SRI hash on the CDN stylesheet, the artifact's own rules re-verified inside the SPA | Static group 26; CDP Part 12 | ✅ |

---

## Extension compliance

The `security-baseline` extension is **enabled** for this unit (see `aidlc-state.md` → Extension Configuration).

| Rule | Status | Rationale |
|---|---|---|
| **SECURITY-05** — validate all input client-side; no HTML insertion of user values | ✅ Compliant | `validateAll` runs **before** any request is issued — `LoginPage` and `RegisterPage` return early on an invalid form, so the backend is never contacted. The static verifier scans every `.ts`/`.tsx` in the auth feature for `dangerouslySetInnerHTML`, `eval(`, `new Function(`, `.innerHTML =` and `document.write(`; all are absent |
| **SECURITY-09** — no default credentials, hardcoded keys, or real endpoint URLs | ✅ Compliant | This unit introduced **no** endpoint, no key, and no credential. The two existing calls (`signIn` / `signUp`) are unchanged in endpoint and payload. `providers.tsx` and `client.ts` are untouched |
| **SECURITY-12** — password policy ≥ 8 characters with a plain-language message; no password storage | ✅ Compliant | The register password requires ≥ 8 characters with a message naming the requirement; the sign-in password has **no** length rule (the failure belongs in authentication, not validation — FR-4.6). CDP Part 11 proves the password reaches neither `localStorage`, `sessionStorage`, nor `document.cookie`, and is not logged |
| **SECURITY-13** — an external CDN resource carries a correct `integrity` and `crossorigin="anonymous"` | ✅ Compliant | The Google Fonts stylesheet in `frontend/index.html` carries the same SRI hash the approved artifact used (`sha256-VxFM0T6ukL8GWEDKIYA83qGsWsr7A8OBPV34Tf8wG+s=`) with `crossorigin="anonymous"`; both attributes are asserted by the static verifier |
| **SECURITY-15** — validation and demo paths fail safely | ✅ Compliant | An invalid form is blocked before the request; a server failure surfaces the server's own message in the existing `login-form-error` / `register-form-error` element; the busy flag is cleared in a `finally` block (asserted statically); the demo-only controls raise an explicit notice rather than navigating nowhere or silently doing nothing |
| Infrastructure rules | ⬜ N/A | This unit changed presentation code and two already-existing HTTP calls. There is no deployment, container, environment-variable, or secret-management surface, and no deployment artefact was produced |

`resiliency-baseline` and `property-based-testing` are **opted out** for this unit. The resiliency rules target deployed, distributed or stateful workloads; the property-based-testing rules require a framework dependency that FR-8.6 forbids.

---

## Defects found and fixed

| # | Defect | How it was found | Fix |
|---|---|---|---|
| 1 | **The APG focus-follows-selection defect (FR-3.3).** After pressing `ArrowRight` on the tab set, the route changed to `/register` and the correct tab became selected — but `document.activeElement` was `null`. Focus had been lost to `<body>`. | CDP Part 3 | `AuthTabs` called `focus()` on the node React Router was about to unmount. The first fix (a `useRef` + `useEffect` on `[mode]`) also failed, because the component is **remounted**, not re-rendered. The fix is a **module-scoped** `pendingFocusMode` variable, read by a mount effect. Module scope survives the route swap and is discarded when the page is left. See the integration instructions, Part B |
| 2 | The harness's own value-setting bug — a username-shaped identifier was reported invalid, and the error did not clear on blur | CDP Part 5 | **Not an application defect.** React 19 installs a value tracker on controlled inputs: when the tracker sees the DOM value already equals the value being set, it concludes `onChange` did not fire, and React snaps the input back to its state (the empty string). The harness now assigns through the **native prototype setter** and dispatches a bubbling `input` event |
| 3 | The harness's incorrect `min()` assertion — the computed width was `228px` | CDP Part 12 | **Not an application defect.** The D9 cap legitimately *resolves* to the full `228px` on a wide viewport; the cap only binds where the remaining space is narrower. The assertion now reads the **declared** width from the CSSOM. That required correcting the CSSOM walker: a plain `CSSStyleRule` also exposes a `cssRules` property (nested CSS), so a walker that handled the container case first treated every style rule as a group and skipped it — finding nothing at all |
| 4 | The `auth-card` testid was dropped from the DOM | The contract-preservation checklist audit | The port replaces the old centred-card shell with the two-panel screen, so the testid was initially lost. It was restored on the new `.auth-page` root element. The testid names the *screen*, which is what it always identified |
| 5 | **Nine** artifact testids were un-emitted | The static verifier, after the contract-preservation checklist audit | An element can carry only **one** `data-testid`. Where the app's family already owned an element, the artifact's testid was moved onto a **wrapper** that encloses it. `PasswordField` gained an optional `wrapperTestId` prop so the component itself carries the artifact family rather than the caller reaching into it |

**5 findings**, all resolved and re-verified. Three were genuine application defects (1, 4, 5) and two were harness defects (2, 3) — and in both harness cases the application was correct throughout, which the notes record so a future reader does not "fix" the application to satisfy a broken assertion.

> **The most valuable defect is #1**, because it was invisible to the type-checker, to the linter, and to every static check. It was found only by driving a real browser and reading `document.activeElement`. A keyboard user pressing `ArrowRight` would have had focus thrown to the top of the document on **every** tab change.

---

## Accepted deviations

5 deviations, all recorded in `aidlc-docs/construction/auth-port/code/generation-notes.md` §5.

| Deviation | Detail |
|---|---|
| **D1 — the demo-only success card is not ported** | The artifact replaced the form with an inline success card because it had no backend. The SPA does, so the port keeps the **real** submit against `POST /api/auth/login` and `/api/auth/register`, then navigates to `ROUTES.CHAT` with `replace: true`. Only the artifact's *visual language* is borrowed; the success state is not |
| **D4 — "Keep me signed in" is not rendered** | The app's session lifetime is fixed by `providers.tsx` — no code path would honour the control. Rendering a checkbox that does not do what it says would violate NFR-4.7, so the control is **not rendered at all**, rather than rendered as an inert no-op |
| **D5 — "Forgot password?" and "Continue with Google" raise a notice** | Neither has a backend. Both raise an explicit inline notice in a `role="status" aria-live="polite"` region saying plainly that the feature is not connected |
| **D2 — both routes survive** | The artifact had one page with two tabs; the app has two routes. The tab set is the shared shell, the route determines the active tab, and selecting a tab navigates. The artifact's tab semantics are preserved without collapsing the app's routing |
| **D3 — the sign-in identifier accepts a username** | The client-side rule accepts an email **or** a username of ≥ 3 characters. The value is sent unchanged in the `email` key, because the backend's login contract is not changed by this unit |

---

## Verification reproducibility

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

# The harness's dependency lives outside the repository (FR-8.6)
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1 && npm install ws >/dev/null 2>&1
cd - >/dev/null

python3 aidlc-docs/scripts/verify-auth-port.py            # 172 checks
npm --prefix frontend run build                                            # tsc -b + vite build
npm --prefix frontend run lint                                             # 0 errors
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-auth-port.js               # 131 checks
```

**303 automated checks in total** (172 static + 131 CDP).

> The CDP harness **requires** a prior production build. It serves `frontend/dist` from a built-in static server and exits with code `2` and a `FATAL: no production build found` message if `frontend/dist/index.html` is missing.
>
> The harness is **deterministic**. If a run fails and a re-run passes, that is a **flaky check**, not a passing one — investigate it rather than re-running until green.

---

## Outstanding manual work

| Item | Reference | Why it cannot be automated |
|---|---|---|
| **The visual comparison against the approved design** | `unit-test-instructions.md` Part G | Fidelity to a reference design is a human judgement about a rendered image, not a boolean property of the DOM. This is the check that caught defects 4, 5 and 6 in the *artifact* unit — every automated assertion passed while the artwork looked wrong |
| **Paint flashing — the text must not flash during the 6-second sweep** | Performance B-3 | Paint invalidation is not exposed over the DevTools Protocol. The structural proxy is P3 (the sweep animates `transform` only, on an isolated layer). **This item is inherited from the `responsive-auth` unit, where it is also still outstanding** |
| **The 6 manual integration scenarios** | `integration-test-instructions.md` Part C | Available as a cross-check. Every one is already covered by the automated harness. **I-4** (keyboard-only traversal) and **I-5** (the theme containment) are the two worth running by hand |

> **The visual comparison is the highest-value manual check.** It is the only one that compares the result against a *target* rather than against a rule, and it is the one that caught the defects every automated assertion passed in the artifact unit.

---

## Next steps

1. **Run the visual comparison** — open `/login` and `/register` at 1080 px and 1440 px, in both themes, and compare against `context-docs/mockups/08-responsive-login-register.html` and the supplied reference design.
2. **Run B-3** — enable paint flashing and confirm the contract text, the clause numbers and the annotation card text do not flash during the 6-second sweep.
3. **Run the 6 manual integration scenarios** — especially I-4 (keyboard traversal) and I-5 (theme containment).
4. The `auth-port` unit itself is **complete**: **303 automated checks passing** (172 static + 131 CDP), `tsc -b` clean, 0 lint errors, the backend untouched, and every requirement traced.

The OPERATIONS phase is a **placeholder** in this workflow version — all build and test activity sits in the CONSTRUCTION phase — so there is no deployment stage to proceed to. The unit's deliverable is the running SPA at `/login` and `/register`.
