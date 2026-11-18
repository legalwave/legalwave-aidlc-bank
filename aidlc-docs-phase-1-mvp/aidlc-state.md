# AI-DLC State
- Project type: Brownfield (LegalWave MVP complete; frontend rebrand + modular restructure complete; sidebar collapse feature complete and verified; responsive auth design unit complete and approved; **auth-port unit complete and verified** — the approved responsive-auth design applied to the running React SPA; **chat-streaming unit — Workspace Detection complete, Requirements Analysis in progress**)
- Current phase: **INCEPTION** — new `chat-streaming` unit opened for the background-streaming + persistence + live-sidebar feature
- **Active unit**: `chat-streaming` — INCEPTION / Requirements Analysis
- **Units delivered**: (1) `frontend/` rebrand + modular restructure · (2) `frontend/` sidebar collapse feature · (3) `responsive-auth` standalone design artifact · (4) `auth-port` — the design applied in the SPA — *complete and verified* · (5) `chat-streaming` — *in progress*
- **Standing guardrails**: (a) never run `git commit` or `git push` on the user's behalf — changes are left uncommitted for review; (b) `frontend/` and `backend/` are separate GitHub repos under the `legalwave` organisation and are out of scope for repository/remote/branch operations.
## Extension Configuration
| Extension | Enabled | Decided At | Note |
|---|---|---|---|
| security-baseline | No | Requirements Analysis | User opt-out retained (MVP); threat model unchanged by rebrand |
| resiliency-baseline | No | Requirements Analysis | User opt-out; single-process app, no distributed-system concerns |
| property-based-testing | No | Requirements Analysis | User opt-out; UI restructure, no test runner in project |
| security-baseline (responsive-auth unit) | Yes | Requirements Analysis | Enabled — SECURITY-05/09/12/13/15 bite directly on this artifact (XSS, password policy, SRI for the required Google Fonts CDN). Infrastructure rules N/A |
| resiliency-baseline (responsive-auth unit) | No | Requirements Analysis | Opt-out — every rule targets a deployed/distributed/stateful workload; a static file has no workload to make resilient |
| property-based-testing (responsive-auth unit) | No | Requirements Analysis | Opt-out — PBT-09 requires a framework dependency, conflicting with "self-contained"; only example-based validation logic exists |
| security-baseline (auth-port unit) | Yes | Requirements Analysis | Enabled — SECURITY-05 (validation before any request), -09 (no default credentials/keys), -12 (8-character password minimum; no password storage/logging), -13 (SRI on the Google Fonts CDN), -15 (fail-safe submit) all bite directly. Infrastructure rules N/A |
| resiliency-baseline (auth-port unit) | No | Requirements Analysis | Opt-out — every rule targets a deployed/distributed/stateful workload; this unit changes presentation code and two already-existing HTTP calls, with no new workload or data store |
| property-based-testing (auth-port unit) | No | Requirements Analysis | Opt-out — PBT-09 requires a framework dependency and FR-8.6 forbids adding one; the project has no test runner. Verification is by the existing static/build tooling plus a CDP harness kept outside the repository |
## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection — chat-streaming unit (brownfield; backend `routes.py`/`agent.py`/`models.py` + frontend `useChatStream.ts`/`useChats.ts`/`client.ts`/`ChatPage.tsx` scanned; root cause of all three defects identified — the `AbortController` in `useChatStream.ts:96` aborts on route change, the backend writes the assistant message only at stream end (`routes.py:197-204`), and `useChats.ts` refreshes only on mount)
- [x] Requirements Analysis — chat-streaming unit — IN PROGRESS (`aidlc-docs/inception/requirements/chat-streaming/`)
- [x] Workspace Detection — responsive auth unit (brownfield; standalone artifact, not an app change)
- [x] Requirements Analysis (standard depth — `aidlc-docs/inception/requirements/sidebar-collapse/requirements.md`)
- [x] Requirements Analysis — responsive auth unit (`aidlc-docs/inception/requirements/responsive-auth/requirements.md`; 20 design questions answered A, 3 extension opt-ins decided by the model on the user's delegation)
- [x] Reverse Engineering — skipped (MVP already reverse-engineered into `api-contract.md`)
- [x] User Stories — skipped (internal restructure + narrow route split; acceptance criteria in requirements)
- [x] Workflow Planning (`aidlc-docs/inception/plans/sidebar-collapse-execution-plan.md`)
- [x] Workflow Planning — responsive auth unit (`aidlc-docs/inception/plans/responsive-auth-execution-plan.md`; 14 stages — 11 executed, 3 skipped, 1 placeholder; Mermaid + ASCII diagrams validated)
- [x] Application Design — skipped (structure specified in FR-1; no new components/services beyond extraction)
- [x] Units Generation — skipped (single cohesive frontend unit)
- [x] Application Design — responsive auth unit — SKIP (no component/service boundaries; one self-contained file)
- [x] Units Generation — responsive auth unit — SKIP (single cohesive deliverable, no data model, no endpoint, no package boundary)
- [x] Workspace Detection — auth-port unit (brownfield; the SPA and backend were scanned, `aidlc-state.md` resumed)
- [x] Requirements Analysis — auth-port unit (`aidlc-docs/inception/requirements/auth-port/requirements.md`; standard depth; 9 integration decisions D1–D9 recorded with reasoning; 3 extension opt-ins decided by the model on the user's delegation)
- [x] Reverse Engineering — auth-port unit — SKIP (`api-contract.md` plus the completed `responsive-auth` unit already capture the architecture and the design being ported)
- [x] User Stories — auth-port unit — SKIP (one persona, one screen; acceptance criteria captured in FR-1…FR-8 / NFR-1…NFR-6)
- [x] Workflow Planning — auth-port unit (`aidlc-docs/inception/plans/auth-port-execution-plan.md`; 10 stages — 5 executed, 4 skipped, 1 placeholder; Mermaid + ASCII diagrams validated)
- [x] Application Design — auth-port unit — SKIP (the components and their contracts are fully determined by the source artifact and FR-1…FR-8)
- [x] Units Generation — auth-port unit — SKIP (single cohesive unit; all changes share one dependency graph inside `features/auth/` and must land atomically)

### 🟢 CONSTRUCTION PHASE
- [x] Code Generation: sidebar collapse feature — 9 internal steps, T1–T9
  - [x] Part 1 — Planning (`aidlc-docs/construction/plans/sidebar-collapse-code-generation-plan.md`)
  - [x] Part 2 — Generation
- [x] Build and Test (sidebar collapse) — 12/12 static checks pass; 21 integration scenarios and 92 E2E checks written, awaiting manual execution
- [x] Defect-fix pass (2026-10-31) — findings 13–16 fixed and re-verified after the user report
- [x] Rail simplification pass (2026-10-31) — finding 17 fixed: the per-chat shortcuts removed from the collapsed rail
- [x] Functional Design — responsive auth unit — SKIP (validation rules already fully specified with their messages in FR-4)
- [x] NFR Requirements — responsive auth unit — SKIP (NFR-1…NFR-6 already captured in the requirements document)
- [x] NFR Design — responsive auth unit — SKIP (implementation patterns fully determined by NFR-1…NFR-6)
- [x] Infrastructure Design — responsive auth unit — SKIP (static file; no runtime, container, env vars, or deployment)
- [x] Code Generation — responsive auth unit — COMPLETE (Part 1 planning → Part 2 generation of `context-docs/mockups/08-responsive-login-register.html`)
  - [x] Part 1 — Planning (`aidlc-docs/construction/plans/responsive-auth-code-generation-plan.md`; 14 steps; 89/89 requirements traced, 0 uncovered)
  - [x] Part 2 — Generation (14/14 steps, 93/93 checkboxes; 152 static checks + SRI re-verification + 45 CDP behaviour checks all pass; 8 defects found and fixed during generation)
  - [x] Revision 1 — alignment to the supplied reference design (user review): contract meta line, numbered clauses, em-dash article headings, warm edge glow, two-line card anatomy with verdict-coloured left edges, connector retargeting, headline measure, form copy, password placeholder, and the Google brand mark. 152 static checks pass; geometry verified across 10 viewport widths (320–2560px) with zero overflow
  - [x] Defect-fix pass (2026-10-31) — **D9 and D10** found by the new integration harness and fixed: the annotation cards escaped the artwork panel at 901–1000px (fixed with a `min()` width cap against the space remaining, plus a `--card-left` per card), and `.card` inherited the theme-swapped text colour (fixed with an explicit `color:var(--art-text)`). Both now covered by permanent assertions
- [x] Build and Test — responsive auth unit — COMPLETE (**313 automated checks green**: 152 static + 1 SRI hash + 45 CDP behaviour + 115 CDP integration; 13 performance structural checks; 56 state renders reviewed across 2 themes × 4 widths × 7 states)
  - Build instructions → `aidlc-docs/construction/build-and-test/responsive-auth/build-instructions.md`
  - Unit test instructions → `aidlc-docs/construction/build-and-test/responsive-auth/unit-test-instructions.md` (32-group inventory of the 152 checks + FR/NFR traceability)
  - Integration test instructions → `aidlc-docs/construction/build-and-test/responsive-auth/integration-test-instructions.md` (160 CDP checks mapped to 15 scenarios, 10 manual scenarios, geometry sweep, security probes)
  - Performance test instructions → `aidlc-docs/construction/build-and-test/responsive-auth/performance-test-instructions.md` (P1–P13 structural, B-1–B-6 runtime)
  - Build-and-test summary → `aidlc-docs/construction/build-and-test/responsive-auth/build-and-test-summary.md`
- [x] Code Generation — auth-port unit — COMPLETE
  - [x] Part 1 — Planning (`aidlc-docs/construction/plans/auth-port-code-generation-plan.md`; 16 steps across S1–S11, with the contract preservation checklist and full FR/NFR traceability)
  - [x] Part 2 — Generation (steps 6–16; 76/76 checkboxes; 172 static + 131 CDP checks all pass; **5 findings resolved** — 3 genuine application defects and 2 harness defects)
- [x] Build and Test — auth-port unit — COMPLETE (**303 automated checks green**: 172 static + 131 CDP; `tsc -b` clean; 0 lint errors, 5 pre-existing warnings; the backend untouched)
  - Build instructions → `aidlc-docs/construction/build-and-test/auth-port/build-instructions.md`
  - Unit test instructions → `aidlc-docs/construction/build-and-test/auth-port/unit-test-instructions.md` (28-group inventory of the 172 checks + FR/NFR traceability + the 7-case mutation-test table)
  - Integration test instructions → `aidlc-docs/construction/build-and-test/auth-port/integration-test-instructions.md` (131 CDP checks across 13 parts, the focus defect in full, 6 manual scenarios, the geometry sweep, the two-testid-family contract, the security probes)
  - Performance test instructions → `aidlc-docs/construction/build-and-test/auth-port/performance-test-instructions.md` (P1–P13 structural, B-1–B-7 runtime)
  - Build-and-test summary → `aidlc-docs/construction/build-and-test/auth-port/build-and-test-summary.md`
  - Generation notes → `aidlc-docs/construction/auth-port/code/generation-notes.md`
### 🟡 OPERATIONS PHASE
- [x] Operations — **PLACEHOLDER, no action required.** Per `.aws-aidlc-rule-details/operations/operations.md`: "All build and test activities have been moved to the CONSTRUCTION phase. The AI-DLC workflow currently ends after the Build and Test phase in CONSTRUCTION." There is no deployment, monitoring, or incident-response stage to execute in this workflow version
- [x] **Build and Test — responsive auth unit — APPROVED** by the user (2026-10-31). The instruction set and the 198 automated results are accepted; the human-execution items (10 integration scenarios, 5 runtime performance measurements, 2 security probes) remain open and are carried forward as post-delivery work
- [x] **Post-approval verification pass (2026-10-31)** — the outstanding human-execution items were automated in `aidlc-docs/scripts/verify-responsive-auth-manual.js` (**115/115 PASS**). The suite grew to **313 automated checks**. Two real defects were found and fixed (D9, D10). Only **I-9** (artwork vs. the supplied reference design) and **B-3** (paint flashing) remain genuinely manual
- [x] **Build and Test — auth-port unit — COMPLETE** (2026-10-31). **303 automated checks green** (172 static + 131 CDP), `tsc -b` clean, 0 lint errors, the backend untouched. The instruction set is in `aidlc-docs/construction/build-and-test/auth-port/`
- [x] **Post-Build-and-Test verification (2026-10-31)** — the CDP harness was switched from the Vite dev server to the **production build**, which removed the HMR reload loop that made it flaky. It is now deterministic over repeated consecutive runs. The static verifier was **mutation-tested** with 7 deliberate violations — all 7 caught
- [x] **WORKFLOW COMPLETE** — all four units built, verified, and documented
## Execution Plan Summary — Responsive Auth Design Unit
- **Total Stages**: 14 (11 executed, 3 skipped, 1 placeholder)
- **Stages Executed**: Code Generation (incl. Revision 1), Build and Test — **all complete**
- **Stages to Skip**: Reverse Engineering (no shared code/API/dependency with the app), User Stories (one persona, one screen; acceptance criteria already in FR-4/FR-5/NFR-1), Application Design (no component or service boundaries), Units Generation (single cohesive file), Functional Design (validation rules fully specified), NFR Requirements/Design (NFR-1…NFR-6 already written), Infrastructure Design (no infra surface)
- **Risk Level**: Low — one new file, zero existing files touched, rollback is a single `rm`. Top risks: R1 SRI hash correctness, R2 visual fidelity drift, R3 light-theme contrast regression, R4 incomplete reduced-motion path
- **Plan**: `aidlc-docs/inception/plans/responsive-auth-execution-plan.md`
- **Code Generation outcome**: All 14 steps executed, plus Revision 1 aligning the artifact to the supplied reference design. R1 mitigated by an SRI re-verification script (hash confirmed current); R3 **materialised and resolved** — the mandated `#B8741A` measured 3.60:1 as light-theme text and 3.78:1 behind white ink, so the accent was split into `--accent` (fills/borders), `--accent-text` (text, `#96600F`) and `--accent-ink` (`#1A1208`), plus a theme-invariant `--art-accent` for the always-dark artwork panel. R2 and R4 were closed by headless rendering at three viewports and the reduced-motion CDP check. 152 static + 45 behaviour checks pass.
- **Build and Test outcome**: **313 automated checks green** (152 static + 1 SRI hash + 45 CDP behaviour + 115 CDP integration) plus 13 performance structural checks and 56 reviewed state renders. 89/89 requirements traced, 0 uncovered. The previously-outstanding human items are now automated; only **I-9** (artwork vs. the supplied reference design) and **B-3** (paint flashing) remain genuinely manual — I-9 is the highest-value one, because it is the only check that compares the artefact against a *target* rather than against a rule, and it is the check that caught the rendering defects every automated check passed. Instructions in `aidlc-docs/construction/build-and-test/responsive-auth/`.
- **Accepted deviations**: 6, all recorded in `aidlc-docs/construction/responsive-auth/code/generation-notes.md` §12 (the SRI/Safari font fallback is the material one).
## Execution Plan Summary — Sidebar Collapse Feature
- **Total Stages**: 14 (9 executed, 5 skipped, 1 placeholder)
- **Stages to Execute**: Code Generation, Build and Test
- **Stages to Skip**: Reverse Engineering (already mapped in `api-contract.md`), User Stories (acceptance criteria already in FR-1…FR-7), Application Design (no new component/service boundaries), Units Generation (single cohesive unit, 4 files), Functional Design (no new business logic), NFR Requirements/Design (already specified and quantified), Infrastructure Design (no infra changes)
- **Risk Level**: Low–Medium (8-entry risk register in the execution plan; highest risks are R1 grid-transition jank and R4 the `Ctrl+B` shortcut firing while typing)
- **Plan**: `aidlc-docs/inception/plans/sidebar-collapse-execution-plan.md`
## Key Outcomes — Auth Port Unit
- **FR-1** — The auth screen is a 55/45 two-column split that collapses below 900 px to a single column with a 200 px artwork banner. Both panels are 100vh; both forms fit 1440×900 with **0 px overflow**
- **FR-2** — The artwork panel ported in full: the tilted contract with the meta line, the hanging clauses 12.1/12.2/13.1, the yellow and green highlights, five skeleton bars, the warm amber edge glow, the 6-second scan sweep, and three annotation cards with clause refs, e-Gov statute citations and verdict chips
- **FR-3** — The form panel uses the full WAI-ARIA APG tablist pattern (roving `tabindex`, Arrow/Home/End, automatic activation), a sliding underline, Show/Hide password toggles, an amber primary button, an "or" divider, a Google button with the brand mark, and the disclaimer footer
- **FR-4** — The full validation rule set, unchanged in substance but re-hosted: on submit then on blur, plain-language messages, `aria-describedby` + `aria-live`, a non-colour-only error state, email **or** username on sign-in, an 8-character minimum on register only, and validation **before** any request
- **FR-5** — Both routes survive. The tab set is the shared shell, the route determines the active tab, selecting a tab **navigates**, and a successful sign-in or registration navigates to `ROUTES.CHAT` with `replace: true` exactly as before
- **FR-6** — The theme-containment mechanism: the light override is scoped to `.auth-form-panel`, so the chat, citations and settings screens stay dark-only. The 20 global `:root` token values are unchanged
- **FR-7 / FR-8** — Motion and accessibility carried over intact, including the full `prefers-reduced-motion` path; **both** `data-testid` families emitted (31 testids in the rendered DOM on both routes); **0 dependencies added**; the backend untouched
- **Build and Test** — **303 automated checks green** (172 static + 131 CDP against the production build, deterministic over repeated runs); `tsc -b` clean; 0 lint errors; 13 performance structural checks; **5 findings resolved** — 3 genuine application defects (the APG focus defect, the dropped `auth-card` testid, 9 un-emitted artifact testids) and 2 harness defects

## Key Outcomes — Responsive Auth Design Unit
- **FR-1** — 55/45 split between a dark artwork panel and a light form panel; collapses to a single column below 900px, where the artwork becomes a 200px logo-only banner. Both forms fit 1440×900 with **0px overflow**
- **FR-2** — The artwork panel: a tilted "Service Agreement" contract page (meta "Draft v3 · 14 pages") with **numbered clauses 12.1, 12.2 and 13.1** hanging in the margin, yellow/green highlighted phrases, five skeleton bars, a warm amber edge glow, a 6-second scan sweep, faint ruled lines, a radial glow, and three annotation cards — each carrying a clause reference **and** a Civil Code statute citation with an e-Gov marker, a GREEN/YELLOW chip, and a verdict-coloured left edge
- **FR-3** — A tabbed sign-in / create-account form using the full WAI-ARIA APG tablist pattern (roving `tabindex`, arrow/Home/End navigation, automatic activation) with a sliding underline, Show/Hide password toggles, a "Keep me signed in" checkbox, an amber primary button, an "or" divider, a "Continue with Google" outline button carrying the Google brand mark, and the "Not legal advice · Verdicts are informational" footer
- **FR-4** — The full validation rule set with plain-language messages, an `aria-live` announcement region, `aria-invalid` / `aria-describedby` wiring, and an error lifecycle that clears on blur once the value is fixed
- **FR-5** — A success card that states no account was created, with an in-place "use a different account" reset that restores the form without a page reload
- **FR-6** — A two-theme token system: the dark palette in `:root`, a cream light theme that overrides **only** the form-panel tokens, and artwork tokens scoped out so the left panel stays dark in both themes. All 12 artwork colours are theme-invariant
- **NFR** — 0 dependencies, 0 build step, 0 changes to `frontend/` or `backend/`; every text pair ≥ 4.5:1 and every non-text pair ≥ 3:1 in both themes; no `innerHTML`, no storage, no cookies, no network call beyond the font CDN; the only outbound request is the SRI-protected Google Fonts stylesheet
- **FR-7 / FR-8** — Motion (6s scan sweep, one-shot 620ms card fade-in, 260ms underline slide) with a full `prefers-reduced-motion: reduce` path; deliverable is a single self-contained HTML file (46,134 bytes on disk) with 3 external references, all to the Google Fonts CDN
- **Build and Test** — **313 automated checks green** (152 static + 1 SRI hash + 45 CDP behaviour + 115 CDP integration) plus 13 performance structural checks and 56 reviewed state renders; 89/89 requirements traced, 0 uncovered; **10 defects found and fixed** across Code Generation, Revision 1 and the post-approval verification pass. Only I-9 (artwork vs. the reference design) and B-3 (paint flashing) remain for human execution

## Key Outcomes — Sidebar Collapse Feature
- **FR-1** — 56px collapsed icon rail carrying only the expand toggle, the brand logo, and the new-chat button — no per-chat shortcuts, since identical icons at 56px cannot be told apart. The full panel stays mounted, so the chat list keeps its scroll position and nothing refetches
- **FR-2** — Two toggles, one per visual state: `«` in the sidebar header, `»` in the rail, with exactly one visible at a time. Both carry `aria-expanded`, a dynamic `aria-label`/`title`, and `data-testid="sidebar-toggle-button"`, so the sidebar can always be reopened
- **FR-3** — 200ms `cubic-bezier(.4,0,.2,1)` transition on `grid-template-columns`; the chat area reflows in step; synchronised 160ms fade-and-slide prevents clipped text
- **FR-4** — `Ctrl+B` / `Cmd+B` shortcut, guarded so it never fires while typing in an input, textarea, or contenteditable element; toggles the drawer below 768px and the rail above it
- **FR-5** — Persisted under `localStorage` key `lw_sidebar_collapsed` (`'1'` = collapsed); `jlca_token` / `jlca_user` untouched
- **FR-6** — Below 768px the sidebar becomes an overlay drawer with a scrim; `Escape` closes it; the desktop preference and the drawer state are independent
- **FR-7** — `prefers-reduced-motion: reduce` honoured — the sidebar jumps to its end state with no movement; the collapsed panel is also `aria-hidden` + `inert`, so it leaves the accessibility tree and the tab order
- **NFR** — 0 new dependencies, 0 backend modifications, 0 CSS selector regressions (184 pre-change selectors, 0 lost), `tokens.css` byte-identical, 0 raw hex in the new rules

## Key Outcomes — LegalWave Rebrand (previous unit, complete)
- **FR-1** — 34-file feature-based structure under `frontend/src/` (`app/`, `config/`, `features/{auth,chat,citations,settings}/`, `shared/`, `styles/`, `assets/`); 0 legacy files, 0 cross-file CSS duplication
- **FR-2/FR-3** — `/login` and `/register` are separate routes with separate endpoints; `RequireAuth` / `RedirectIfAuthenticated` guards
- **FR-4** — "LegalWave" centralised in `config/brand.ts`; zero occurrences of "Legal Assistant" in shipped source
- **FR-5/FR-6** — `logo.svg` (2,942 B) and `wave-field.svg` (4,856 B); all 20 design tokens preserved
- **FR-7** — MCP server key renamed `legal-assistant` → `legalwave`, with a visible change note
- **FR-8** — `frontend/README.md` rewritten to match the shipped code

---

## Delivery Summary — all units

| # | Unit | Deliverable | Verification | Status |
|---|---|---|---|---|
| 1 | LegalWave rebrand + modular restructure | `frontend/src/` — 34-file feature-based structure; `logo.svg` (2,942 B); `wave-field.svg` (4,856 B); `/login` and `/register` split into separate routes | 12/12 static checks; 20 design tokens preserved; 0 legacy files; 0 cross-file CSS duplication | ✅ Complete |
| 2 | Sidebar collapse feature | 56px icon rail; dual toggles; `Ctrl+B` shortcut with a text-field guard; `localStorage` key `lw_sidebar_collapsed`; mobile drawer below 768px; reduced-motion path | 12/12 static checks; 184 pre-change CSS selectors, 0 lost; `tokens.css` byte-identical; 0 raw hex | ✅ Complete |
| 3 | Responsive auth design unit | `context-docs/mockups/08-responsive-login-register.html` — 46,134 B, self-contained, 0 dependencies | **313 automated checks green** (152 static + 1 SRI + 45 CDP behaviour + 115 CDP integration); 13 performance structural checks; 56 state renders; 89/89 requirements traced | ✅ Complete — **approved** 2026-10-31 |
| 4 | Auth port unit | `frontend/src/features/auth/` — the two-panel auth screen (55/45 split, APG tablist, dark artwork panel + theme-scoped form panel); `auth.css` (16.9 kB); 2 additive edits to `tokens.css` and `index.html`; **0 dependencies added**; the backend untouched | **303 automated checks green** (172 static + 131 CDP against the production build, deterministic); `tsc -b` clean; 0 lint errors, 5 pre-existing warnings; 13 performance structural checks; 5 findings resolved (3 application defects, 2 harness defects) | ✅ Complete |

### Carried forward (not closed by the approval)

Human-execution items documented in `aidlc-docs/construction/build-and-test/responsive-auth/`.
Most were automated in the post-approval verification pass; these remain:

- **I-9 — the artwork panel compared against the supplied reference design.** Still the highest-value check: it is the only one that compares the artefact against a *target* rather than against a rule, and it is the one that caught the rendering defects every automated assertion passed. It also found D9 and D10 in the post-approval pass.
- **B-3 — paint flashing.** The contract text, the clause numbers and the annotation card text must not flash during the 6-second sweep. Paint invalidation is not exposed over the DevTools Protocol, so this cannot be automated. The structural proxy is P4 — the sweep animates `transform` only, on an isolated layer.

Everything else — the other 9 manual scenarios, B-1, B-2, B-4, B-5, B-6, and both security probes — is now covered by `verify-responsive-auth-manual.js`.

### Carried forward from the auth-port unit

Human-execution items documented in `aidlc-docs/construction/build-and-test/auth-port/`.
Every automated check passed; these remain by-eye only:

- **The visual comparison against the approved design.** The only check that compares the result against a *target* rather than against a rule — and the class of check that caught defects 4, 5 and 6 in the artifact unit while every automated assertion passed.
- **B-3 — paint flashing.** Inherited from the `responsive-auth` unit, where it is also still outstanding. The structural proxy is P3 — the sweep animates `transform` only, on an isolated layer.
- **The 6 manual integration scenarios** — every one is already covered by the automated harness; **I-4** (keyboard-only traversal, where the focus defect lived) and **I-5** (the theme containment) are the two worth running by hand.

### Re-running the verification suite

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-responsive-auth.py            # 152 checks
python3 aidlc-docs/scripts/verify-font-sri.py                   # SRI hash
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-behaviour.js   # 45 checks
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-manual.js     # 115 checks
python3 aidlc-docs/scripts/validate-plan-diagrams.py            # diagrams
```

**313 automated checks in total** for the `responsive-auth` unit.

### Re-running the verification suite — auth-port unit

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
python3 aidlc-docs/scripts/verify-auth-port.py                # 172 checks
npm --prefix frontend run build                                            # tsc -b + vite build
npm --prefix frontend run lint                                             # 0 errors
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-auth-port.js                 # 131 checks
```

**303 automated checks in total** for the `auth-port` unit.

> The `auth-port` CDP harness serves the **production build** and therefore **requires** `npm --prefix frontend run build` to have run first. It exits with code `2` and `FATAL: no production build found` if `frontend/dist/index.html` is missing.

The `ws` package for the two CDP harnesses is installed **outside** the repository at `/tmp/cdp-harness` on purpose — adding it would violate the deliverable's zero-dependency requirement (FR-8.4).

---

## API contract enforcement (Phase 1 of the three-repository split)

**Status**: complete and verified.

The API contract was previously prose-only (`inception/api-contract.md`) and the
frontend's types were hand-written from it. TypeScript types are erased at
runtime, so nothing checked that the frontend's declared types still matched
what the backend returned.

The contract is now **machine-enforced** through a generated chain:

```
backend/app/routes.py + backend/app/schemas.py
        └──▶ backend/openapi.json                         (committed)
                  └──▶ frontend/src/shared/api/types.ts    (committed, generated)
```

| Link | Enforced by |
|---|---|
| routes + schemas → spec | `backend/scripts/export-openapi.py --check` |
| spec → frontend types | `frontend/scripts/generate-frontend-types.py --check` |

Both checks run in CI. `backend/openapi.json` (12 paths, 17 schemas, 8 stream
events) is the authoritative contract; `inception/api-contract.md` now states
the **intent** and points to the spec as the shape of record.

### Artefacts added

| Artefact | Purpose |
|---|---|
| `backend/app/schemas.py` | Every response shape, declared once. All 10 routes carry `response_model=`. |
| `backend/scripts/export-openapi.py` | Writes the spec; `--check` fails when stale. Folds the NDJSON stream events into an `x-stream-events` extension. |
| `backend/openapi.json` | The committed contract. |
| `frontend/scripts/generate-frontend-types.py` | JSON Schema → TypeScript; `--check` fails when stale. |
| `frontend/src/shared/api/types.ts` | Now a **generated** file. |

### Defects the enforcement found

Two real contract discrepancies, both fixed **in the backend** — the backend
owns the API and should declare the constraints it already enforces.

1. `MessageOut.role` was `str`; it is always `"user"` or `"assistant"`.
   Now `Literal["user", "assistant"]`.
2. `ApiKeyOut.last_used_at` / `revoked_at` were `str | None = None`, which
   Pydantic treats as *optional* — a field with a default is omitted from the
   OpenAPI `required` array, so the frontend's type gained an `undefined`
   case the API never sends. Now declared `str | None` with **no default**:
   required, and nullable.

### Verification

| Check | Result |
|---|---|
| `npx tsc -b` | ✅ exit 0 — zero errors (was 2) |
| `npm run lint` | ✅ 0 errors, 5 pre-existing warnings |
| `npm run build` | ✅ 377 modules, built in 421 ms |
| Both `--check` modes | ✅ current |
| `--check` mutation tests | ✅ 3 deliberate violations injected, 3 caught |
| Spec paths vs. prose contract | ✅ 12 paths, identical set |

### Re-running the contract checks

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp
(cd backend && uv run python scripts/export-openapi.py --check)
python3 frontend/scripts/generate-frontend-types.py --check
```

To change the API, edit the backend's route or schema, then regenerate both:

```bash
(cd backend && uv run python scripts/export-openapi.py)
python3 frontend/scripts/generate-frontend-types.py
```

**Next phase**: the three-repository split (`legalwave-frontend`,
`legalwave-backend`, `legalwave-docs`), with history preserved. The generator
already looks for the spec in both the monorepo and the split-repo layout, so
it will work unchanged after the split.
