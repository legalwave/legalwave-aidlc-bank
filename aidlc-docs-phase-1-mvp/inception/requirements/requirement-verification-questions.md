# Requirement Verification Questions — LegalWave Frontend Rebrand & Modular Restructure

Please answer every question by filling in the letter choice after each `[Answer]:` tag.
Choose the last option (**X) Other**) if none of the listed options fit, and describe your preference after the `[Answer]:` tag.

> **💡 Recommendation:** Every question below has a recommended answer, marked with a **⭐ Recommended** tag on the option and a pre-filled `[Answer]:` letter. If you are happy with the recommendations, you can leave the answers as-is and just tell me you're done. Change any `[Answer]:` you want to override — the recommendation is only a default, not a constraint.

---

## Question 1
What visual style should the **LegalWave logo** take?

The current branding is a plain amber rounded square containing the kanji `律`. "LegalWave" evokes a wave motif, so the logo could lean into that.

A) **Wave monogram** — An inline SVG combining a stylized wave with a legal/scales motif, in amber on the dark surface. Scales balance the wave. Distinctive and on-theme for "LegalWave".

B) **Wave glyph `波`** — Keep the current kanji-in-square approach but swap `律` for `波` (wave), in an amber rounded square. Minimal change from the existing design, consistent with the Japanese-law theme.

C) **Pure wave mark** — A clean abstract wave/ripple SVG mark (no kanji, no scales). Most minimal and modern; loses the explicit legal reference.

D) **Wave + scales, monogram letters "LW"** — A wave forming the base with an "LW" monogram above it. Most literal reading of the name "LegalWave".

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — The wave-plus-scales monogram is the only option that communicates *both* halves of the name (Legal + Wave) while fitting the existing amber-on-dark palette. It is delivered as inline SVG, so it stays crisp at 28px in the top bar and 48px on the auth screens, and needs no binary asset.

---

## Question 2
How should the **artistic background image** be incorporated?

The current design is a flat dark canvas (`#1F1B1C`). An image could be a decorative backdrop, or the login/register screen only.

A) **Auth screens only, full-bleed** — The background image sits behind the login/register card, with a dark gradient scrim for text legibility. The chat workspace keeps its flat dark surface (best for long reading sessions and performance).

B) **Auth screens + subtle workspace texture** — Full-bleed on login/register, plus a very low-opacity version of the texture behind the app shell. Consistent branding throughout, minimal perf cost.

C) **Everywhere, layered and visible** — The image is visible behind the entire app: auth screens, sidebar, and chat canvas. Most immersive, but risks reducing readability in the chat thread and can look busy.

D) **Auth screens + empty-state only** — Background on login/register and on the chat empty state ("Paste a clause..."), flat elsewhere. Keeps the working surfaces clean while making the first-run experience feel designed.

X) Other (please describe after [Answer]: tag below)

[Answer]: B

**⭐ Recommended: B** — Branding stays consistent across the whole product, so LegalWave does not read as "a nice login screen bolted onto a different app". The workspace texture sits at roughly 4–6% opacity, which is enough to be felt rather than seen, and preserves the readability and contrast of the chat thread — the surface where users spend the most time reading legal analysis.

---

## Question 3
What **artistic motif** should the background image depict?

All options are tuned to the existing dark palette (`#1F1B1C` / `#2A2A2D`) with amber (`#D2973B`) accents, so any of them will sit naturally in the current design.

A) **Abstract wave field** — Layered, flowing wave contours / topographic line-art in muted amber and slate. Directly evokes "LegalWave" and is abstract enough to avoid competing with text.

B) **Japanese seigaiha (青海波) pattern** — The traditional overlapping-wave scale pattern, subtly rendered. Culturally coherent with the Japanese-law subject matter and reads as calm, deliberate, and premium.

C) **Ink wash / sumi-e brush texture** — A soft monochrome ink-wash / brushed-paper texture with a faint wave motion. Traditional, elegant, and very low-distraction.

D) **Faint torii gate silhouette at dusk** — A stylized torii silhouette against a deep gradient sky with water and wave reflections. Most scenic and distinctly Japanese.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — The abstract wave field is the most direct expression of "LegalWave", and abstract line-art sits behind text far more safely than a scenic illustration. Critically, it is a *pattern*, not a photograph: it tiles and scales without a focal point, so it never competes with the login card or the chat content.

---

## Question 4
How should the background image be **produced**?

The project has no image assets yet and no `public/` directory.

A) **Hand-authored SVG, committed to the repo** — I write an original SVG illustration matching the chosen motif and palette. It is crisp at any resolution, tiny in size, requires no binary assets, and scales to any viewport. Fully offline and deterministic.

B) **Generated raster image (PNG/WebP) committed to the repo** — I generate a raster background image. Photographic/organic texture is possible, but file size grows and it does not scale as cleanly as SVG.

C) **Pure CSS gradients + layered SVG pattern** — No image file at all; the "artistic background" is composed from CSS radial/linear gradients plus an inline SVG pattern. Smallest possible payload, no assets to manage.

D) **External CDN / stock photo URL** — Reference a hosted image. Requires network access at runtime and an external dependency — generally avoided for a self-hosted MVP.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — An SVG is a few KB versus a raster's hundreds of KB, stays sharp on any display, and is an original asset rather than a licensed stock image. It also means the background renders instantly offline, and I can author it to the exact palette tokens already in `styles.css` so it inherits the design system instead of approximating it.

---

## Question 5
How aggressively should the **project structure** be restructured?

This is the "standard modular structure" requirement. The backend stays untouched.

A) **Feature-based, moderate** — Group by feature with shared infrastructure:
`src/app/` (routing, providers), `src/features/auth/`, `src/features/chat/`, `src/features/settings/`, `src/features/citations/`, `src/shared/` (api client, types, hooks, utils), `src/assets/`. Existing `styles.css` split into per-area CSS files or CSS modules.

B) **Feature-based, deep** — Option A plus tighter separation: `api/` split into `client.ts` / `types.ts` / `endpoints/`, custom hooks (`useAuth`, `useChats`, `useChatStream`) extracted from `Shell.tsx`, `Shell.tsx` decomposed into `Sidebar` / `ChatThread` / `Composer` / `MessageView` components, and a `config/` layer for brand constants.

C) **Layer-based (technical)** — Organize strictly by technical layer: `src/components/`, `src/hooks/`, `src/services/`, `src/pages/`, `src/utils/`, `src/types/`. Conventional and familiar, but features get scattered across many folders.

D) **Minimal reorganisation only** — Keep the current flat layout, just split the single `styles.css` into multiple files and add an `assets/` folder for the logo and background. Lowest churn, but does not really satisfy "transform to a modular standard structure".

X) Other (please describe after [Answer]: tag below)

[Answer]: B

**⭐ Recommended: B** — Option A gives you the folder structure but leaves `Shell.tsx` as a 349-line monolith holding sidebar, thread, composer, streaming state, and message rendering. Option B is what actually makes the codebase *modular* in the sense you asked for: each piece becomes independently testable and replaceable, and the new `/register` page is added as a peer of `/login` rather than growing out of a shared toggle. It is a larger diff, but this is the one-time moment to do it.

---

## Question 6
How should the **CSS** be organized?

The project currently has one 180-line global `styles.css` with all selectors flat in the root namespace.

A) **Per-area CSS files imported by their components** — e.g. `auth.css`, `shell.css`, `markdown.css`, `modal.css`, each imported from the owning feature. No CSS-in-JS, no build-tool change, no class-name collisions in practice because each file is scoped by its feature's markup.

B) **CSS Modules** — Every component gets `*.module.css`, with hashed class names. True scoping and no collision risk, but requires updating every `className` reference.

C) **Keep one global stylesheet, reorganized with clear sections** — Lowest risk (no class-name churn at all), but least modular.

D) **Tailwind CSS** — Introduce Tailwind v4 and convert markup to utility classes. Very common, but it is a dependency and tooling change that rewrites nearly every component's markup.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — You get real per-feature modularity with zero new dependencies and no build-tool changes. CSS Modules would force rewriting every `className` in the codebase for a benefit this project does not need (the class names are already feature-prefixed in practice, and each file is imported only by its own feature). Tailwind would be a large, hard-to-review churn across every component for a visual design that is already settled.

---

## Question 7
How should the **`/login` and `/register` routes** behave with respect to an existing session?

Currently `Guard` redirects to `/login` when there is no token, and `Login` navigates to `/` after success. With two separate pages, each needs its own guard behaviour.

A) **Symmetric — both auto-redirect away when already signed in** — If a token exists, `/login` and `/register` both redirect to `/`. Cleanest: an already-authenticated user never sees an auth form.

B) **Login redirects, register allows re-registration** — Only `/login` redirects when signed in; `/register` stays accessible so a signed-in user can create another account.

C) **Neither auto-redirects** — Both pages always render their form regardless of session state. Simplest and most predictable, but a signed-in user could land on a login form.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — It is the conventional behaviour and it makes the new structure simpler: one `RequireAuth` guard for protected routes and one `RedirectIfAuthenticated` guard for the two auth routes, both reading the same session state. A signed-in user who bookmarks or shares `/login` is taken to their workspace instead of being shown a form that would just bounce them on submit.

---

## Question 8
How should the **branding rename** treat the existing product names?

"LegalWave" replaces the current display name "Legal Assistant". Other strings also reference the old name or the old MCP server key.

A) **Rename everything user-visible** — `index.html` title, login/register copy, sidebar header, top bar, README, and the MCP server key in the settings JSON snippet (`legal-assistant` → `legalwave`). Fully consistent, but changes the MCP key users must configure.

B) **Rename UI only, keep the MCP server key as `legal-assistant`** — All visible branding becomes LegalWave; the MCP server identifier in the settings snippet stays `legal-assistant` to avoid breaking existing MCP client configs.

C) **Rename UI, and use `legalwave` for the MCP key but mention the change** — Same as A, with an explicit note in the settings UI that the MCP server key has changed and existing clients need updating.

X) Other (please describe after [Answer]: tag below)

[Answer]: C

**⭐ Recommended: C** — The MCP server key is a user-facing configuration value, so leaving it as `legal-assistant` while everything else says LegalWave would be a visible inconsistency in the settings screen. Renaming it to `legalwave` and adding a short note tells anyone with an existing MCP client exactly what to update — one key in one config file. Since the MVP has not been publicly released, there is no broad compatibility burden to carry.

---

## Question 9
Should the **existing visual design** be preserved in the rebrand?

Beyond the name, logo, and background, the dark palette, serif/sans typography, amber accent, and severity colours are established in `styles.css` and the mockups.

A) **Preserve the design exactly** — Only swap in the LegalWave name, logo, and background image. Every existing colour, spacing, and component stays pixel-identical. Zero visual regression risk.

B) **Preserve the palette, refine the surfaces** — Keep all colour tokens and typography, but improve the background integration, card translucency/backdrop treatment, and logo placement so the new branding feels intentional rather than pasted on.

C) **Refresh more boldly** — Keep the dark/amber identity but allow layout and surface refinements (e.g. glass-morphism on cards, refined shadows, updated empty state). More visual impact, more review needed.

X) Other (please describe after [Answer]: tag below)

[Answer]: B

**⭐ Recommended: B** — Every colour token, type scale, and severity colour stays exactly as-is, so there is no visual regression risk and the dark/amber identity is preserved. The refinements are limited to surfaces that the new background directly touches — card translucency, backdrop treatment, and logo placement — which is precisely what makes the branding feel deliberate rather than pasted on. Option C would mix a structural restructure with a visual redesign and make review harder for no clear gain.

---

## Question 10
What **verification** is expected after implementation?

The MVP scope explicitly excluded tests beyond smoke checks, and the project has no test runner configured.

A) **Type-check, lint, and production build only** — Run `tsc -b`, `oxlint`, and `vite build`. Confirms the restructure compiles and bundles. No new test dependencies.

B) **A + a Vitest + React Testing Library setup with tests for the auth flows** — Adds a test runner and covers the login/register split, form validation, and route guarding. Introduces new dev dependencies and a testing layer the MVP does not have.

C) **A + manual verification checklist document** — Build artifacts plus a written checklist for manually verifying the new routes, logo, and background across viewports.

X) Other (please describe after [Answer]: tag below)

[Answer]: C

**⭐ Recommended: C** — The restructure is large enough that a green build alone would not prove the new routes and branding work in a browser. This adds a written checklist covering `/login`, `/register`, route guarding, the logo and background rendering, and the chat workspace — the things a build cannot verify — without introducing a test framework the project has never had. Option B is reasonable if you want automated coverage, but it is a meaningful new layer to introduce alongside a rebrand.

---

## Question 11 (Extension Opt-In)
Should the **security baseline** extension be enforced for this project?

**What this extension is.** Enabling it applies a set of blocking constraints for common frontend and API security mistakes — output encoding, input validation, authentication and session handling, secret management, dependency hygiene, and safe error surfacing.

**What this extension is NOT.** Enabling it does not make the app production-certified; it is a set of design-time and review-time constraints.

Note: the project state currently records this extension as **opted out** for the MVP ("User opt-out: MVP"). This question lets you confirm or change that for this work.

A) **No — keep the previous opt-out** — This is a UI rebrand and structural refactor of already-reviewed MVP code; the security posture is unchanged from what was already accepted.

B) **Yes — enforce the security baseline** — Audit the restructured frontend against the baseline rules and treat any findings as blocking. Appropriate if this rebrand is the first step toward a production release.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — The project state already records an explicit user opt-out for the MVP, and this work does not change the security surface: no new endpoints, no new data handling, no dependency additions beyond what already exists. Splitting one route into two and reorganizing files does not alter the threat model. If you are planning a production release next, revisiting this then is the better time.

---

## Question 12 (Extension Opt-In)
Should the **resiliency baseline** extension be applied to this project?

**What this extension is.** Enabling it applies directional, design-time best practices from the AWS Well-Architected Reliability Pillar — fault tolerance, graceful degradation, observability, change management, and recoverability.

**What this extension is NOT.** It does not make the workload production-ready or certify any availability, RTO, or RPO target. It is a first draft of resiliency posture to validate and harden later.

A) **No — skip the resiliency baseline** — Appropriate for a PoC/MVP where rapid iteration matters more than reliability hardening. The restructure should not introduce availability regressions, but no formal resiliency review is needed.

B) **Yes — apply the resiliency baseline** — Steer the design and implementation toward graceful degradation and recoverability, such as resilient image loading and non-blocking failure of decorative assets.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — The resiliency pillar targets distributed-system concerns — multi-AZ failover, RTO/RPO targets, chaos testing, on-call readiness — that a single-process frontend and a local FastAPI backend do not have. The one relevant practice I will apply regardless is graceful degradation of the decorative background: it must never block or obscure the app if it fails to render.

---

## Question 13 (Extension Opt-In)
Should **property-based testing (PBT)** rules be enforced for this project?

**What this extension is.** Enabling it applies rules for property-based tests — asserting invariants over many generated inputs rather than a single example.

A) **No — skip PBT rules** — Suitable for a UI-only restructure and visual rebrand with no significant business logic or serialization round-trips. The backend agent pipeline is where PBT would matter, and it is out of scope here.

B) **Partial — enforce PBT only for pure functions and serialization round-trips** — e.g. the `parseCite` URL parser and any query/grouping helpers introduced by the restructure.

C) **Yes — enforce all PBT rules** — Full property-based testing coverage across all extracted utility functions.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

**⭐ Recommended: A** — This is a UI restructure with one small parser (`parseCite`) and a couple of grouping helpers. The business logic worth property-testing lives in the backend's agent pipeline and statute retrieval, which is out of scope here. With no test runner in the project (see Question 10), enabling PBT would mean introducing a framework plus a QuickCheck-style generator layer for very little benefit.

---

## Summary of Recommendations

| # | Topic | Recommended |
|---|---|---|
| 1 | Logo style | **A** — wave + scales monogram (inline SVG) |
| 2 | Background scope | **B** — auth screens + subtle workspace texture |
| 3 | Background motif | **A** — abstract wave field |
| 4 | Image production | **A** — hand-authored SVG in repo |
| 5 | Structure depth | **B** — feature-based, deep (hooks + decomposed Shell) |
| 6 | CSS organization | **A** — per-area CSS files |
| 7 | Route guards | **A** — symmetric auto-redirect when signed in |
| 8 | Rename blast radius | **C** — rename MCP key to `legalwave` + note |
| 9 | Design preservation | **B** — keep palette, refine surfaces |
| 10 | Verification | **C** — build + manual checklist |
| 11 | Security extension | **A** — keep previous opt-out |
| 12 | Resiliency extension | **A** — skip |
| 13 | PBT extension | **A** — skip |

If you accept all recommendations, reply **"approved"** (or similar) and I will proceed straight to Workflow Planning with the answers as filled in above.
