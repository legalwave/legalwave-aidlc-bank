# Requirement Verification Questions — Responsive Login/Register Design (LegalWave)

**Feature**: a standalone, responsive login/register page for LegalWave, delivered as a single self-contained HTML file with inline CSS and JS.
**Date**: 2026-10-31
**Depth**: Standard — the design brief is unusually complete (layout, palette, typography, motion, accessibility, and behaviour are all specified), but several implementation-shaping details are still open: where the file lands, what the contract text actually says, how strict the validation is, and whether this replaces an existing mockup.

Please answer each question by filling in the letter choice after the `[Answer]:` tag. If none of the options match your needs, choose the last option (Other) and describe your preference.

Each question below has a **⭐ Recommended** option — the one I judge best for this deliverable — with the reasoning given after it.

---

## Question 1
**Where should the deliverable file live?**

The repo already contains a mockup prototype directory at `context-docs/mockups/` with 7 files (`01-login.html` … `07-pdf-on-request.html`). The existing `01-login.html` is a *card-only* sign-in mockup built on the older "Legal Assistant" palette, so it does not match this new split-screen design.

A) **`context-docs/mockups/08-responsive-login-register.html`** — continue the existing numbering and mockup convention, leaving `01-login.html` intact as the historical card design (recommended)

B) **Replace `context-docs/mockups/01-login.html`** — overwrite the existing login mockup with this new design, so there is one canonical login mockup

C) **`frontend/public/auth-demo.html`** — ship it inside the built app's static assets so it is served by Vite at runtime

D) **A standalone file at the repository root** (e.g. `legalwave-login.html`) — outside both the mockup folder and the app

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A keeps the deliverable in the one place the repo already uses for exactly this kind of artifact — self-contained visual prototypes — and the numeric prefix communicates that it supersedes the earlier login mockup without destroying it. The existing `01-login.html` still documents the original card-based auth screen, which has historical value alongside the app's own `features/auth/` implementation. Overwriting it (B) loses that record; putting it in `frontend/public/` (C) would make a demo artifact part of the production bundle, which is scope creep for a design deliverable.

---

## Question 2
**How detailed should the contract document's text be?**

The brief specifies "Service Agreement" with Article 12 (Termination) and Article 13 (Governing Law), "short realistic clauses, a few gray skeleton text bars, and highlighted phrases in yellow and green".

A) **Two fully-written articles plus one skeleton bar** — Article 12 and Article 13 each get a real sentence or two of plausible legal English with highlighted phrases, and a third section is rendered as grey skeleton bars to suggest further content (recommended)

B) **Skeleton bars only** — all three sections are grey bars, with only the headings in real text; the "document" reads as a redacted template

C) **Fully written document** — every section is real prose, no skeleton bars at all

D) **Three written articles** — Article 12 and Article 13 as specified, plus a third written article (e.g. Article 11 Payment Terms) so no skeleton bars are needed

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A matches the brief's own wording most literally — it delivers the two named articles as readable, realistic clauses (which is what makes the annotation cards feel anchored to something real) while keeping the grey skeleton bars the brief explicitly asked for. A fully-written document (C, D) loses the "this is a document being scanned" texture that the scan-line and skeleton treatment create, and skeleton-only (B) undercuts the annotation cards, whose verdicts refer to specific clauses the reader can actually see.

---

## Question 3
**How strict should the form validation be?**

The brief asks for "plain-language inline validation messages. Errors say what is wrong and how to fix it."

A) **Validation on submit, plus re-validation on blur after the first submit attempt** — errors appear when the user submits an invalid form, and then update live as the user corrects each field (recommended)

B) **Validation on submit only** — errors appear on submit and clear only when the field is corrected and re-submitted

C) **Live validation from the first keystroke** — every field validates continuously, before the user has finished typing

D) **Validation on blur only** — each field validates when it loses focus, whether or not the form was submitted

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is the standard accessible pattern: it avoids yelling at a user who is still mid-typing (the flaw in C), gives immediate feedback on a genuine attempt to submit (B is sluggish — a user fixes one error and must resubmit to discover the next), and only validates a field the user has actually interacted with (D can show errors on a field the user skipped entirely, which is misleading). Errors are announced via `aria-live` and tied to inputs with `aria-describedby`, so they work for screen-reader users as well as sighted ones.

---

## Question 4
**What should the "Continue with Google" button do, given no backend is connected?**

The brief requires a Google button but also states "No real backend is connected."

A) **Non-functional but present** — the button is rendered and styled correctly, and clicking it shows an inline demo notice like "Google sign-in isn't connected in this prototype" (recommended)

B) **Fully non-functional** — the button renders and is styled, but the click handler does nothing at all

C) **Triggers the same demo success message** — clicking it behaves like the email/password submit and shows the demo success state

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is honest about the prototype's limits without leaving a dead control on screen. A button that silently does nothing reads as a bug to anyone reviewing the design; one that explains itself reads as a deliberate placeholder. Option B risks the prototype looking broken during review, and Option C would falsely imply a working OAuth flow that does not exist.

---

## Question 5
**How should the "Keep me signed in" checkbox and "Forgot password?" link behave?**

The brief lists both on the login form.

A) **Checkbox is a working demo toggle; "Forgot password?" shows an inline demo notice** — the checkbox state is reflected in the success message, and the link reveals a "password reset isn't connected in this prototype" notice (recommended)

B) **Both are purely decorative** — the checkbox toggles visually but the link does nothing

C) **The link opens a mailto: for a support address; the checkbox is decorative**

D) **Both show the same generic demo notice**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A keeps each control visibly responsive in a way that demonstrates the intended design, while being clear that neither is wired to a real system. A dead "Forgot password?" link is a common source of confusion in prototypes; a link that explains itself pre-empts it. Option D is weaker because it doesn't distinguish the two controls, and Option C invents a support address that doesn't exist.

---

## Question 6
**Should the success state replace the form, or appear alongside it?**

The brief says "On submit, validate and show a demo success message."

A) **Replace the form panel's contents with a success card** — the heading, fields, and buttons are replaced by a check-mark message with a "Use a different account" reset link (recommended)

B) **Show the success message inline above the form** — the form stays fully visible and usable below the message

C) **Show a toast-style banner** at the top of the form panel, with the form remaining as-is

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A gives an unambiguous end-state that a reviewer can read at a glance, and it leaves the page in a state that clearly demonstrates the intended post-authentication transition. Option B leaves the user staring at a filled-in password field next to a success message, which reads as ambiguous. Option C's transient toast is the least demonstrable of the three — it disappears before a reviewer can screenshot it.

---

## Question 7
**Should the light theme apply to the form panel and the left artwork panel both?**

The brief says the light variant uses cream `#F5F2EC` and deeper amber `#B8741A`, and that "The left artwork panel stays dark in both themes."

A) **Right side (form) switches to cream; left side (artwork) stays dark in both themes** — exactly as the brief states, with the contract page and ruled lines unchanged (recommended)

B) **Everything switches to light** — the artwork panel also becomes cream

C) **Only the page background changes to cream; inputs, buttons, and panels keep the dark treatment**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is the literal reading of the brief and the more considered design choice: the artwork panel is a near-black "stage" for the contract, and keeping it dark in both themes preserves the product's identity and the contrast of the amber glow and scan line. Option B would wash out the artwork entirely, and Option C would produce a half-light, half-dark form that reads as inconsistent rather than intentional.

---

## Question 8
**Should the annotation cards and scan line be visible in the mobile banner?**

Under 900px the brief collapses the artwork to a ~200px banner with "Only the logo remains in the banner."

A) **Logo only** — the banner is exactly as specified: the logo, the ruled-line texture, and the amber glow; no contract, no scan line, no annotation cards (recommended)

B) **Logo plus the three annotation cards**, scaled down and stacked in the banner

C) **Logo plus the contract page's top edge**, cropped, so the document is still hinted at

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A follows the brief's explicit "Only the logo remains in the banner" and is the right call at that size — a 200px band cannot legibly carry three annotation cards with verdict chips and reference labels, and the staggered fade-in animation would be distracting on a small screen. The ruled lines and amber glow are retained as texture so the banner still reads as part of the same product rather than a plain header.

---

## Question 9
**How should the tabs be implemented for accessibility?**

The brief requires `aria-selected` on the tabs.

A) **Full ARIA tablist pattern** — `role="tablist"` on the container, `role="tab"` with `aria-selected` and `aria-controls` on the buttons, `role="tabpanel"` on each panel, plus Left/Right arrow-key navigation and correct `tabindex` roving focus (recommended)

B) **`aria-selected` on the tabs only** — the buttons carry `role="tab"` and `aria-selected`, but no `tablist`/`tabpanel` roles and no arrow-key handling

C) **Plain buttons with `aria-selected`** — `aria-selected` on ordinary `<button>` elements with no tab roles at all

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A implements the WAI-ARIA Authoring Practices tab pattern properly, which is what `aria-selected` is designed for — it would be invalid on a button with no tab role. The arrow-key navigation and roving `tabindex` are what make the control genuinely usable by keyboard and screen-reader users rather than merely carrying the attribute the brief names. Option B leaves the relationship between tab and panel unstated, and Option C attaches a tab-specific attribute to a role that has no such state.

---

## Question 10
**Which fonts should the artifact load, and how?**

The brief names Newsreader (serif) and Inter, with Georgia and system-ui fallbacks.

A) **Google Fonts `<link>` with a robust local fallback stack** — Newsreader and Inter load from Google Fonts, with `Georgia, 'Times New Roman', serif` and `system-ui, -apple-system, 'Segoe UI', sans-serif` as fallbacks, so the file still renders correctly offline (recommended)

B) **System fonts only** — no network request at all; use `Georgia, serif` for headings and `system-ui, sans-serif` for body text

C) **Google Fonts `<link>` with `font-display: swap`** — as A, plus the explicit `display=swap` parameter and preconnect hints

D) **Embed the fonts as base64 data URIs** so the file is fully offline-capable with the exact intended faces

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A matches the brief's font choices while remaining robust: the file opens correctly with no network, and simply gets the intended typefaces when it does have one. Option B would visibly lose Newsreader's character, which is central to the design's serif voice. Option D would balloon the file size by hundreds of kilobytes for a design artifact. Option C is a minor refinement of A; it is the better choice if you'd like the swap behaviour made explicit.

---

## Question 11
**Should the artifact include the "e-Gov" attribution in the annotation cards, and how prominently?**

The brief's example card reads "Civil Code, Art. 541 · e-Gov: termination after a failed cure is consistent with statute".

A) **All three cards carry a statute reference with an "e-Gov" source label**, exactly as the example does, using real Civil Code article numbers (recommended)

B) **All three cards carry a statute reference, but only the first mentions "e-Gov"**

C) **Only one card carries a statute reference; the other two show only the verdict and sentence**

D) **No statute references — generic analysis text only**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is what the brief describes and it demonstrates the product's core value proposition — that every verdict is traced to a specific statutory provision, sourced from e-Gov. Using the real Civil Code article numbers (Art. 541 on 解除の通知, for instance) makes the prototype credible and gives the design something meaningful to show. The other options dilute the very thing the product claims to do.

---

## Question 12
**How should the light theme's deeper amber `#B8741A` relate to the left artwork panel?**

The artwork panel keeps its own near-black background `#171615` and amber glow, while the form side uses `#B8741A` for amber elements in light mode. The dark-mode amber `#E3A53A` is specified for the artwork's glow, scan line, and annotation accents.

A) **Two distinct ambers, scoped by panel** — the artwork uses `#E3A53A` in both themes; the form uses `#E3A53A` in dark mode and `#B8741A` in light mode (recommended)

B) **One amber for the whole page in light mode** — `#B8741A` everywhere including the artwork panel's glow and scan line

C) **Keep `#E3A53A` in the artwork panel and lighten the form's amber only for text-on-cream**, keeping buttons on `#E3A53A` with dark text

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A follows the brief most directly — the specified `#B8741A` is described as the light-mode accent, while `#171615` and the artwork's amber glow are described independently of the theme. Scoping each accent to its panel keeps the artwork panel's identity stable in both themes, which is also what the brief asks for when it says the artwork panel stays dark. Option C would leave a light-mode amber button at a brightness that reads as pale against cream.

---

## Question 13
**Should the contract page's rotation and the annotation cards' fade-in be animated on load, or immediately static?**

The brief specifies the staggered annotation fade-in and the 6s scan line, and says annotations should "fade in one after another" — with `prefers-reduced-motion` showing them immediately.

A) **Staggered fade-in on load with delays (e.g. 0.4s / 0.8s / 1.2s), disabled under `prefers-reduced-motion`** — exactly as the brief describes (recommended)

B) **Fade in on a repeating loop** so the sequence restarts every few seconds

C) **Fade in triggered by a scroll or intersection event** rather than on load

D) **Static from the start, with the scan line as the only motion**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is what the brief describes, and the brief explicitly bounds automatic motion to exactly two things: the scan line and the staggered annotation fade-in — the phrase "one after another" indicates a one-shot sequence, not a loop. Option B adds a repeating animation the brief does not ask for and would compete with the scan line; Option C adds a scroll dependency that would be awkward on a full-height split layout.

---

## Question 14
**Should the prototype be wired into the running React app, or delivered as a standalone artifact only?**

The brief asks for "a single self-contained HTML file with inline CSS and JS" and "No real backend is connected."

A) **Standalone artifact only** — the HTML file is self-contained and independently openable; the React app in `frontend/` is not modified in any way (recommended)

B) **Standalone artifact, plus a route in the React app that embeds it in an `<iframe>`**

C) **Also port the design into the React app's `features/auth/` pages** so the shipped app uses the new design

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is exactly what the brief asks for and keeps the change contained to one new file. The React app already has working sign-in and registration with its own tokens, so porting this design (C) would be a substantial second unit requiring its own requirements analysis and regression checks against the live auth flow — and the palettes differ, so it would mean changing the shipped product's visual identity. Option B adds a route for no stated benefit.

---

## Question 15
**Should the artifact include a visible note that it is a design prototype?**

The brief specifies a footer reading "Not legal advice · Verdicts are informational" but does not mention a prototype disclaimer.

A) **No extra note** — the specified footer is the only footer text; the file's purpose is evident from its location in `context-docs/mockups/` (recommended)

B) **Add a small "Design prototype — not wired to a backend" line** above the specified footer

C) **Add the prototype note as an HTML comment** at the top of the file, visible only in source

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A keeps the rendered design exactly as specified, which matters for a file whose purpose is to be reviewed as a visual artifact. The mockup directory already signals the artifact type, and the "Not legal advice" footer carries the professional tone the brief asks for. Option C is a reasonable middle ground if you'd like the provenance recorded without changing the visual output — it keeps the rendered page pristine while documenting the intent for whoever opens the source.

---

## Question 16
**How much vertical space should the form panel occupy?**

The split is specified as roughly 55% artwork / 45% form, but the form's content height (tabs, heading, up to 3 fields, checkbox row, two buttons, footer) varies between sign-in and create-account.

A) **Both panels are full viewport height (`100vh`); the form panel centres its content vertically** — the layout is a true side-by-side split regardless of content length (recommended)

B) **The form panel grows to fit its content; the page scrolls if the form is taller than the viewport** — the artwork panel is `100vh` and sticky

C) **The form panel is a fixed maximum height with its own internal scroll area**

D) **Both panels size to the taller of the two, with the page scrolling as needed**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is the cleanest reading of "split screen": both sides are equal-height columns, the artwork fills its side, and the form centres itself, so switching between sign-in and create-account never changes the page's structure or scroll position. Option B creates a jarring layout where the columns have different heights, and Option C introduces a nested scroll region — a known usability and accessibility problem, especially since the create-account form is taller than the sign-in form.

---

## Question 17
**Should the email/username field's placeholder and validation differ between the two modes?**

The brief says the sign-in field accepts "Email or username" while registration accepts email only.

A) **Mode-specific placeholder, label, and validation** — sign-in: "Email or username", accepts either; register: "Email", rejects a non-email value with a plain-language message (recommended)

B) **One shared field labelled "Email"** in both modes; the sign-in placeholder mentions username but validation requires an email

C) **Sign-in accepts anything non-empty; register validates email format**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is the honest reading of the brief: if sign-in accepts a username, the validation must accept it too, and the field must be labelled accordingly rather than claiming to be an email field. Registering with a username that the account system won't have would be a real defect, so the stricter email check belongs on the registration path. Option B creates a mismatch between the label and the validation rule, and Option C lets an email-only registration path accept a username.

---

## Question 18
**Should the password field have a minimum length requirement, and what should it say?**

The brief mentions a Show/Hide toggle and plain-language errors but sets no password rule.

A) **Register requires at least 8 characters, with a message naming the requirement; sign-in enforces no length rule** (recommended)

B) **No length rule in either mode** — sign-in and register validate only that the password is non-empty

C) **Both modes require at least 8 characters**

D) **Register requires 12 characters and at least one letter and one number**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A matches ordinary expectations and keeps the prototype honest: a registration form that accepts any non-empty password would misrepresent the product. Eight characters is the widely-used minimum, and stating it plainly ("Use at least 8 characters") is exactly the "say what is wrong and how to fix it" the brief asks for. Enforcing a length rule on sign-in (C) is wrong — a legacy account might have a shorter password, and the failure belongs in authentication, not validation. Option D's complexity rule is unnecessary for a prototype.

---

## Question 19
**Should the three annotation cards' connector lines be plain CSS, or drawn as inline SVG?**

The brief describes "three annotation cards overlap the document's right edge, each connected by a thin amber line".

A) **Inline SVG overlay for the connector lines**, positioned absolutely over the document, with the cards as HTML positioned on top (recommended)

B) **Pure CSS** — each line is a bordered `<div>` with a horizontal rule and a small rotated segment

C) **A single inline SVG containing the document, the lines, and the cards** — everything drawn as SVG for pixel-precise control

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A gives precise control over the connector geometry while keeping the card content as real HTML — so the verdict chips, reference labels, and sentences stay as selectable, translatable, screen-reader-legible text rather than text baked into a drawing. Option C would render the analysis sentences as vector shapes, which is bad for accessibility and for text rendering quality. Option B is workable but the angled elbow of a connector line is awkward to achieve cleanly with borders alone.

---

## Question 20
**Should the file be validated against a standards checker as part of this unit?**

The deliverable is a single HTML file with inline CSS and JS.

A) **Yes — verify it parses cleanly and check the markup and CSS for common issues** (unclosed tags, duplicate IDs, invalid nesting), and confirm the accessibility attributes are present as specified (recommended)

B) **No — deliver the file as-is once written**

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

**Recommendation rationale**: Option A is cheap and catches the failure modes that are most common in hand-written single-file HTML: an unclosed tag silently swallowing the form, a duplicate `id` breaking `aria-controls` and `<label for>` wiring, or a focus ring that got dropped in the CSS. Since the brief makes specific accessibility promises (`aria-selected`, `aria-label`, labelled inputs, a focus ring), verifying they actually landed in the output is worth the small effort.

---

## Extension Opt-In Prompts

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A 

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B 

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C 

---
