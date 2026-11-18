# Generation Notes — `auth-port` unit

**Deliverable**: the `responsive-auth` design applied to the running React SPA
**Code generation plan**: `aidlc-docs/construction/plans/auth-port-code-generation-plan.md`
**Requirements**: `aidlc-docs/inception/requirements/auth-port/requirements.md`
**Execution plan**: `aidlc-docs/inception/plans/auth-port-execution-plan.md`

These notes record the decisions that a reader of the code alone could not reconstruct,
the defects found during verification, and the deviations that were deliberately accepted.

---

## 1. The three real defects found and fixed during verification

The CDP harness (`verify-auth-port.js`) failed 5 of its first 118 checks. Two were
harness bugs, one was an incorrect assertion, and **two were genuine application
defects** that the harness was written to catch.

### 1.1 The APG focus-follows-selection defect (FR-3.3)

**Symptom.** After pressing ArrowRight on the tab set, the route changed to
`/register` and the correct tab became selected — but `document.activeElement` was
`null`. Focus had been lost to `<body>`.

**Cause.** `AuthTabs` handles the arrow key, calls `onSelect(next)`, and then calls
`tabRefs.current[next]?.focus()`. But selecting a tab **navigates** (decision D2), and
React Router unmounts `LoginPage` and mounts `RegisterPage`. The `focus()` call landed
on the node that was about to be unmounted, so the browser discarded the focus.

**First fix attempted, and why it failed.** The intent was moved into a `useRef` plus a
`useEffect` keyed on `mode`, so the focus would be applied after the re-render. That
still failed, because the component is **remounted**, not re-rendered: React Router
replaces the page component, so `AuthTabs` is unmounted and a fresh instance is
mounted. A fresh instance has a fresh ref, and the ref was already null.

**The fix that worked.** The pending-focus intent is held in a **module-scoped
variable**:

```ts
let pendingFocusMode: AuthMode | null = null
```

Module scope is the correct lifetime: it survives the route swap, and it is discarded
when the auth page is left entirely. The keydown handler records the intent and
navigates; a mount effect reads it and focuses the newly mounted tab.

This is a genuine accessibility defect that would have shipped: a keyboard user
pressing ArrowRight would have had focus thrown to the top of the document, losing
their place in the tab set on every tab change.

### 1.2 The harness's own value-setting bug (not an application defect)

**Symptom.** Three validation checks failed: a username-shaped identifier was
reported invalid, and the error did not clear on blur.

**Cause.** The harness set input values with `el.value = 'aiko'` and dispatched an
`input` event. React 19 installs a **value tracker** on controlled inputs: when the
tracker sees the DOM value already equal to the value being set, it concludes that
`onChange` did not fire, so the component never re-renders and React snaps the input
back to its state — the empty string. The validation then correctly read `''` and
correctly rejected it.

**The fix.** Assign through the **native prototype setter**, which bypasses React's
instance-level override, and then dispatch the bubbling `input` event:

```js
const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
desc.set.call(el, value);
el.dispatchEvent(new Event('input', { bubbles: true }));
```

This is a harness-side correction, not an application change. The application was
behaving correctly throughout.

### 1.3 The harness's incorrect `min()` assertion (not an application defect)

**Symptom.** "the card width is capped with min()" failed, reporting a computed width
of `228px`.

**Cause.** The assertion compared the **computed** width against `228px`. But the D9
cap is `width: min(228px, calc(100% - var(--card-left, 54%) - 12px))`, which *legitimately
resolves* to the full `228px` on a wide viewport — the cap only binds where the
remaining space is narrower. The computed value therefore says nothing about whether
the cap is present.

**The fix.** Assert against the **declared** width, read from the CSSOM:

```js
width:min(228px, calc(100% - var(--card-left, 54%) - 12px))
```

Reading the declaration also required a correction to the CSSOM walker: a plain
`CSSStyleRule` exposes a `cssRules` property too (nested CSS), so a walker that
handled the container case *before* the style case treated every style rule as a
group and skipped it — finding nothing at all.

---

## 2. The two `data-testid` families (FR-8.1, FR-8.2, decision D6)

Decision D6 requires **both** testid families to be emitted: the app's existing set
(`login-form`, `login-form-email-input`, …) and the artifact's set (`auth-signin-form`,
`auth-signin-identifier-input`, …).

An element can carry only **one** `data-testid`. The first implementation emitted
only the app's family on the elements that already existed, and the artifact's family
on the elements the artifact introduced (the tabs, the toggles, the Google buttons).
That left **nine** artifact testids un-emitted, which the static verifier caught
after the contract-preservation checklist was audited.

**The fix.** Where the app's family already owns an element, the artifact's testid
rides on a **wrapper** that encloses it:

```tsx
<div data-testid="auth-signin-form">
  <form data-testid="login-form"> … </form>
</div>
```

For the password fields, `PasswordField` gained an optional `wrapperTestId` prop that
is applied to the `.auth-input-wrap` element, so the component itself carries the
artifact family rather than the caller reaching into it.

The invariant is now asserted in both verifiers:

- the static verifier checks that all 31 testids appear in the sources;
- the CDP harness checks that all 31 appear in the **rendered DOM**, and that the
  artifact's form testid **encloses** the app's form testid on both routes.

---

## 3. The `auth-card` testid moved to the shell (FR-8.1)

`auth-card` was the old centred-card shell's testid. The port replaces that shell
with the two-panel screen, so the testid was initially dropped.

The contract-preservation checklist names it explicitly, so it was restored on the new
shell — the `.auth-page` root element:

```tsx
<div className="auth-page" data-testid="auth-card">
```

The testid names the *screen*, which is what it always identified: the thing a test
navigates to in order to interact with the auth form. Its DOM position moved, but its
meaning did not.

---

## 4. The harness tests the production build, not the dev server

The CDP harness originally ran against the Vite **dev server**. That produced
persistent flakiness in the chat-screen checks: the dev server holds an HMR websocket
open, and under CDP the page entered an endless reload loop in which React never
mounted (the `#root` element stayed empty, `bodyLen` 103).

The fix was to serve the **production build** from a small static server built into
the harness. Three consequences:

1. The harness tests the artefact that is actually shipped.
2. The reload loop disappears — there is no HMR client in a production bundle.
3. `document.readyState` is no longer pinned at `interactive` by the open websocket,
   so the wait-for-load logic is straightforward.

Two further adjustments followed:

- The production CSS **minifies hex colours to lower case**, so the token comparisons
  are case-insensitive.
- `textContent` is used instead of `innerText` for the chat content check, because
  `innerText` is layout-dependent and returns `''` for rendered-but-not-laid-out
  content.

The harness is now deterministic: **131/131 checks pass on repeated consecutive runs.**

---

## 5. Deliberate deviations

### 5.1 The demo-only success card is not ported (decision D1)

The source artifact's FR-5.3/FR-5.4 replace the form with an inline success card,
because the artifact has no backend. The SPA does have one, so the port keeps the
**real** submit: `signIn` / `signUp` against `POST /api/auth/login` and
`POST /api/auth/register`, then `navigate(ROUTES.CHAT, { replace: true })`. The
server's error message surfaces in the existing `login-form-error` /
`register-form-error` element.

Only the artifact's *visual* language is borrowed. The success state is not.

### 5.2 "Keep me signed in" is not rendered (decision D4)

The artifact's form carries a "Keep me signed in" checkbox. The app's session
lifetime is fixed by `providers.tsx` — there is no code path that would honour the
control. Rendering a checkbox that does not do what it says would violate NFR-4.7
("no control may misrepresent its effect"), so the control is **not rendered** at
all, rather than rendered as an inert no-op.

### 5.3 "Forgot password?" and "Continue with Google" raise a notice (decision D5)

Neither has a backend. Rather than navigate nowhere, both raise an explicit inline
notice in a `role="status" aria-live="polite"` region:

- "Password reset is not connected in this prototype."
- "Google sign-in is not connected in this prototype."

The notice says plainly that the feature is not connected, so the user is not misled.

### 5.4 The two routes both survive (decision D2)

The artifact is a single page with two tabs. The app has two routes. Both survive:
the tab set is the shared shell, the route determines the active tab, and selecting a
tab navigates between `/login` and `/register`. The artifact's "tab" semantics are
preserved without collapsing the app's routing.

### 5.5 The sign-in identifier accepts a username (FR-4.5, decision D3)

The client-side rule accepts either an email address or a username of at least three
characters. The value is sent unchanged in the `email` key, because the backend's
login contract is not changed by this unit (FR-8.2 / FR-8.5).

---

## 6. The theme-containment mechanism (FR-8.7, decision D9)

The artifact overrides its colour tokens at `:root` inside a
`prefers-color-scheme: light` media query. Doing that in the SPA would restyle the
**whole application** — the chat, the citations and the settings screens are
dark-only and share the 20 global tokens.

The port therefore scopes the light override to **`.auth-form-panel`** — the form half
of the auth screen only:

```css
@media (prefers-color-scheme: light) {
  .auth-form-panel {
    --auth-bg: #F5F2EC;
    --auth-panel: #FBF9F5;
    …
  }
}
```

The artwork panel is always dark in both schemes, so its `--art-*` tokens are declared
**once** on `.auth-page` and are **never redeclared** in the light block. The
annotation cards additionally carry an explicit `color: var(--art-text)` — the source
artifact's D10 fix — so they cannot inherit the theme-swappable text colour.

This is verified three ways:

1. The static verifier asserts the light block's selectors are **only**
   `.auth-form-panel` and that no `--art-*` token is redeclared inside it.
2. The CDP harness asserts the artwork panel's background, card border, card text and
   inherited card colour are **byte-identical** in both themes, while the form panel
   **does** change.
3. The CDP harness's Part 13 seeds a session, navigates to the chat, and asserts that
   the chat body is still `rgb(31, 27, 28)` under `prefers-color-scheme: light` — the
   light theme does not leak out of the auth screen.

---

## 7. Verification summary

| Verifier | Checks | Result |
|---|---|---|
| `verify-auth-port.py` (static) | 172 | ✅ all pass |
| `verify-auth-port.js` (CDP, production build) | 131 | ✅ all pass, deterministic over repeated runs |
| `npm --prefix frontend run build` | `tsc -b` + `vite build` | ✅ 377 modules, no errors |
| `npm --prefix frontend run lint` (oxlint) | 33 files, 116 rules | ✅ 0 errors, 5 warnings — all 5 pre-existing, all in files this unit did not touch |

The static verifier was itself **mutation-tested**: seven deliberate violations were
injected into the sources (an original token re-valued, the light block re-scoped to
`:root`, the `min()` cap dropped, the D10 colour dropped, the hanging indent replaced
with `display:flex`, the reduced-motion block removed, the roving `tabindex` removed)
and **all seven were caught**. A verifier that cannot fail is not a verifier.
