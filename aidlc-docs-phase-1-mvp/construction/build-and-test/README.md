# Build and Test — Instruction Index

Three units have completed the Build and Test stage. Each has its own instruction set, in its own subdirectory, using the canonical filenames prescribed by `.aws-aidlc-rule-details/construction/build-and-test.md`.

| Unit | Directory | Deliverable |
|---|---|---|
| A — frontend | [`frontend/`](frontend/) | The React SPA — LegalWave rebrand, modular restructure, sidebar collapse |
| B — responsive-auth | [`responsive-auth/`](responsive-auth/) | The standalone responsive login/register design artifact |
| C — auth-port | [`auth-port/`](auth-port/) | The approved design applied to the running SPA |

---

## Unit A — `frontend/` — LegalWave rebrand + modular restructure + sidebar collapse

**Deliverable**: the React SPA in `frontend/` (Vite 8.3.5 + TypeScript 7.0.2)

| Document | Contents |
|---|---|
| [`frontend/build-instructions.md`](frontend/build-instructions.md) | Prerequisites, install, configure, build, verify, troubleshooting |
| [`frontend/unit-test-instructions.md`](frontend/unit-test-instructions.md) | Static verification (type-check, lint, CSS regression, token inventory) as the unit-test substitute, plus the manual E2E pointer |
| [`frontend/integration-test-instructions.md`](frontend/integration-test-instructions.md) | 21 scenarios covering the API contract, the route split, and the sidebar's browser-subsystem boundaries |
| [`frontend/performance-test-instructions.md`](frontend/performance-test-instructions.md) | 13 checks — artwork size, bundle size, module count, scroll smoothness, collapse animation cost |
| [`frontend/e2e-test-instructions.md`](frontend/e2e-test-instructions.md) | 92 manual E2E checks across 10 sections, including Section J (sidebar collapse, 35 checks) |
| [`frontend/build-and-test-summary.md`](frontend/build-and-test-summary.md) | Build status, test results, and the overall verdict |

---

## Unit B — `responsive-auth/` — standalone responsive login/register design artifact

**Deliverable**: `context-docs/mockups/08-responsive-login-register.html` — one self-contained HTML file, 46,134 bytes, 0 dependencies, 0 build step

| Document | Contents |
|---|---|
| [`responsive-auth/build-instructions.md`](responsive-auth/build-instructions.md) | The 8 build steps, the verification scripts, common warnings, troubleshooting, rollback |
| [`responsive-auth/unit-test-instructions.md`](responsive-auth/unit-test-instructions.md) | A 32-group inventory of the 152 static checks with runtime counts, the FR/NFR → check traceability matrix, failure triage, and the mandatory visual review |
| [`responsive-auth/integration-test-instructions.md`](responsive-auth/integration-test-instructions.md) | The 160 CDP checks (45 behaviour + 115 integration) grouped by their scenarios and mapped to requirements, the 10 manual scenarios, the 14-width geometry sweep, and the security probes |
| [`responsive-auth/performance-test-instructions.md`](responsive-auth/performance-test-instructions.md) | 13 structural checks (P1–P13) and 6 runtime measurements (B-1–B-6), with the measured values |
| [`responsive-auth/build-and-test-summary.md`](responsive-auth/build-and-test-summary.md) | Build status, test results, the requirement verification matrix, extension compliance, the 10 defects found and fixed, and the outstanding manual work |

### Running the responsive-auth verification suite

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

# 1. Static verification — 152 checks
python3 aidlc-docs/scripts/verify-responsive-auth.py

# 2. SRI re-verification — 1 hash
python3 aidlc-docs/scripts/verify-font-sri.py

# 3. Behavioural verification — 45 checks, headless Chrome via CDP
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1 && npm install ws >/dev/null 2>&1
cd - >/dev/null
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-behaviour.js

# 4. Integration verification — 115 checks: the geometry sweep across 14
#    widths, the success/reset cycle, 6 XSS payloads, the storage probes,
#    the runtime performance measurements, the focus indicators, and the
#    theme-invariance checks
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-responsive-auth-manual.js

# 5. Plan diagram validation
python3 aidlc-docs/scripts/validate-plan-diagrams.py
```

> The `ws` package is installed **outside** the repository on purpose — adding it to the project would violate the deliverable's zero-dependency requirement (FR-8.4). Without `NODE_PATH` both CDP harnesses fail with `Cannot find module 'ws'`.

**Total: 313 automated checks green** — 152 static + 1 SRI + 45 behaviour + 115 integration.

---

## Unit C — `auth-port/` — the approved design applied to the running SPA

**Deliverable**: `frontend/src/features/auth/` — the two-panel auth screen at `/login` and `/register`, plus two additive edits to `frontend/src/styles/tokens.css` and `frontend/index.html`. **0 dependencies added**; the backend untouched.

| Document | Contents |
|---|---|
| [`auth-port/build-instructions.md`](auth-port/build-instructions.md) | The 8 build steps, why the harness serves the production build, the verification scripts, common warnings, troubleshooting, rollback |
| [`auth-port/unit-test-instructions.md`](auth-port/unit-test-instructions.md) | A 28-group inventory of the 172 static checks with runtime counts, the FR/NFR → check traceability matrix, failure triage, the 7-case mutation-test table, and the manual visual review |
| [`auth-port/integration-test-instructions.md`](auth-port/integration-test-instructions.md) | The 131 CDP checks across 13 parts, the APG focus defect in full, the 6 manual scenarios, the 14-width geometry sweep, the two-testid-family contract, and the security probes |
| [`auth-port/performance-test-instructions.md`](auth-port/performance-test-instructions.md) | 13 structural checks (P1–P13) and 7 runtime measurements (B-1–B-7), with the recorded results |
| [`auth-port/build-and-test-summary.md`](auth-port/build-and-test-summary.md) | Build status, test results, the requirement verification matrix, extension compliance, the 5 findings resolved, and the outstanding manual work |

### Running the auth-port verification suite

```bash
cd /home/bs-01337/E2E-AI-Native-Software-Engineering/final-project-mvp

# The CDP harness's dependency lives outside the repository (FR-8.6)
mkdir -p /tmp/cdp-harness && cd /tmp/cdp-harness
npm init -y >/dev/null 2>&1 && npm install ws >/dev/null 2>&1
cd - >/dev/null

# 1. Static verification — 172 checks
python3 aidlc-docs/scripts/verify-auth-port.py

# 2. Type-check + production build — the harness serves frontend/dist
npm --prefix frontend run build

# 3. Lint — 0 errors, 5 pre-existing warnings
npm --prefix frontend run lint

# 4. Behaviour verification — 131 checks, headless Chrome via CDP
NODE_PATH=/tmp/cdp-harness/node_modules \
  node aidlc-docs/scripts/verify-auth-port.js
```

> **The CDP harness requires the production build.** It serves `frontend/dist` from a built-in static server and exits with code `2` and `FATAL: no production build found` if the build has not run. This is deliberate — the Vite dev server's HMR websocket caused an endless reload loop under CDP in which React never mounted.

**Total: 303 automated checks green** — 172 static + 131 CDP, deterministic over repeated consecutive runs.

---

## Verification scripts

All live in `aidlc-docs/scripts/`.

| Script | Serves | Checks |
|---|---|---|
| `verify-responsive-auth.py` | Unit B | 152 |
| `verify-font-sri.py` | Unit B | 1 hash |
| `verify-responsive-auth-behaviour.js` | Unit B | 45 |
| `verify-responsive-auth-manual.js` | Unit B | 115 |
| `verify-auth-port.py` | Unit C | 172 |
| `verify-auth-port.js` | Unit C | 131 |
| `validate-plan-diagrams.py` | All | Mermaid + ASCII blocks |
| `css-selector-check.py` | Unit A | CSS selector duplication |
| `css-regression-check.py` | Unit A | Pre-change selector preservation |
| `build-component-diagram.py` | Unit A | Component diagram generation |
