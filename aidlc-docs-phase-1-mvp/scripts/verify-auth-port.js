// Integration verification for the `auth-port` unit — the responsive-auth
// design applied to the running React SPA.
//
// Usage:
//   npm --prefix frontend run build
//   NODE_PATH=/tmp/cdp-harness/node_modules \
//     node aidlc-docs/scripts/verify-auth-port.js
//
// The harness serves the PRODUCTION BUILD (`frontend/dist`) from its own
// static server. This is deliberate:
//
//   - It tests the artefact that is actually shipped, not the dev server.
//   - The Vite dev server holds an HMR websocket open and re-runs its
//     connect/connected handshake on every reload. Under CDP that produces
//     an endless reload loop in which React never mounts (the #root element
//     stays empty), which made the chat-screen checks flaky.
//
// Set AUTH_PORT_URL to point at an already-running server instead.
//
// Exit 0 = all checks pass, exit 1 = failures.
//
// The techniques here are the ones proven in the source unit's harnesses:
//   - Emulation.setDeviceMetricsOverride to set a TRUE viewport (otherwise
//     clientHeight is reduced by the browser-chrome offset and the page
//     falsely appears to scroll).
//   - Page.reload({ignoreCache:true}) after EVERY viewport change, so that
//     percentage- and min()-based widths re-resolve against the new viewport.
//     Without it a page laid out at the launch width keeps stale geometry and
//     the sweep reports false escapes.
//   - A >= 2.2 s settle after a viewport change, because the annotation cards
//     fade in on a stagger (0.4s / 0.8s / 1.2s delay + 0.62s duration) and a
//     screenshot taken earlier shows only one card.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../../frontend/dist');
const PORT = 9336;
const CDP = 9236;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/**
 * A minimal static file server for the production build.
 *
 * Every unknown path falls back to `index.html`, because the SPA uses
 * history routing — `/register` and `/login` are client-side routes with no
 * file behind them.
 */
function startStaticServer(root, port) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404).end('not found');
      return;
    }
    const body = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function waitFor(fn, tries = 80, delay = 250) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (v) return v; } catch (e) { lastErr = e; }
    await sleep(delay);
  }
  if (lastErr) throw lastErr;
  return null;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

// The 14 widths from the source unit's geometry sweep.
const WIDTHS = [320, 360, 390, 414, 480, 600, 768, 900, 901, 1024, 1280, 1440, 1920, 2560];

(async () => {
  // Serve the production build. If AUTH_PORT_URL is set, use that server
  // instead and skip the static one.
  let server = null;
  let APP = process.env.AUTH_PORT_URL;
  if (!APP) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
      console.error(
        `FATAL: no production build found at ${DIST}.\n` +
          `Run: npm --prefix frontend run build`,
      );
      process.exit(2);
    }
    server = await startStaticServer(DIST, PORT);
    APP = `http://127.0.0.1:${PORT}`;
    console.log(`Serving the production build from ${DIST} at ${APP}\n`);
  } else {
    console.log(`Using the server at ${APP}\n`);
  }

  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${CDP}`, '--window-size=1440,900',
    `--user-data-dir=/tmp/cdp-auth-port-profile-${Date.now()}`,
    `${APP}/login`,
  ], { stdio: 'ignore' });

  let ws = null;
  try {
    const target = await waitFor(async () => {
      const list = await getJSON(`http://127.0.0.1:${CDP}/json/list`);
      return list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    });
    if (!target) throw new Error('could not attach to Chrome');

    const WebSocket = require('ws');
    ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
    await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });

    let id = 0;
    const pending = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

    const evaluate = async (expr) => {
      const r = await send('Runtime.evaluate', {
        expression: `(function(){${expr}})()`,
        returnByValue: true, awaitPromise: true,
      });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception || {}));
      }
      return r.result.value;
    };

    const setViewport = async (width, height = 900) => {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: false,
      });
      await sleep(180);
      await send('Page.reload', { ignoreCache: true });
      await sleep(700);
    };

    const goto = async (path) => {
      await evaluate(`
        window.history.pushState({}, '', ${JSON.stringify(path)});
        window.dispatchEvent(new PopStateEvent('popstate'));
      `);
      await sleep(700);
    };

    // Set the value of a CONTROLLED React input from inside the page.
    //
    // A plain `el.value = v` is swallowed by React: React installs a value
    // tracker on the node, and when the tracker sees the DOM value already
    // equal to `v` it concludes that `onChange` did not happen, so the
    // component never re-renders and the input snaps back to its state.
    //
    // The fix is to assign through the NATIVE prototype setter (bypassing
    // React's instance-level override) and then dispatch a bubbling `input`
    // event, which React's delegated listener picks up as a genuine change.
    const setInputValue = async (id, value) => {
      await evaluate(`
        const el = document.getElementById(${JSON.stringify(id)});
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        desc.set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
      `);
      await sleep(150);
    };

    const setTheme = async (theme) => {
      await send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: theme }],
      });
      await sleep(250);
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await sleep(1400);

    // ==================================================================
    // PART 1 — Structure and the testid / id contracts (FR-8.1 … FR-8.3)
    // ==================================================================
    console.log('\n--- PART 1: structure and contracts ---\n');

    const struct = await evaluate(`
      const q = (s) => document.querySelector(s);
      const qa = (s) => Array.from(document.querySelectorAll(s));
      return {
        url: location.pathname,
        hasPage: !!q('.auth-page'),
        hasArt: !!q('.auth-art'),
        hasFormPanel: !!q('.auth-form-panel'),
        hasFormInner: !!q('.auth-form-inner'),
        tablist: !!q('[role="tablist"]'),
        tabs: qa('[role="tab"]').length,
        panels: qa('[role="tabpanel"]').length,
        liveRegion: !!q('[aria-live="polite"]'),
        contract: !!q('.auth-contract'),
        cards: qa('.auth-card').length,
        connectors: !!q('.auth-art-connectors'),
        scanline: !!q('.auth-scanline'),
        headline: (q('.auth-art-headline') || {}).textContent || '',
        subtext: (q('.auth-art-subtext') || {}).textContent || '',
        contractTitle: (q('.auth-contract-title') || {}).textContent || '',
        contractMeta: (q('.auth-contract-meta') || {}).textContent || '',
        clauseNos: qa('.auth-clause-no').map(e => e.textContent.trim()),
        skeletonBars: qa('.auth-contract-skeleton span').length,
        marks: qa('.auth-mark-yellow').length + '/' + qa('.auth-mark-green').length,
        cardRefs: qa('.auth-card-ref').map(e => e.textContent.trim()),
        cardStatutes: qa('.auth-card-statute').map(e => e.textContent.trim()),
        cardVerdicts: qa('.auth-card-verdict').map(e => e.textContent.trim()),
        cardTexts: qa('.auth-card-text').map(e => e.textContent.trim()),
        // The existing app contract
        testids: qa('[data-testid]').map(e => e.getAttribute('data-testid')),
        ids: qa('[id]').map(e => e.id),
        labels: qa('label[for]').map(e => e.getAttribute('for')),
        disclaimer: (q('.auth-disclaimer') || {}).textContent || '',
        // The aria wiring
        tabSelected: qa('[role="tab"]').map(e => e.getAttribute('aria-selected')),
        tabControls: qa('[role="tab"]').map(e => e.getAttribute('aria-controls')),
        tabTabindex: qa('[role="tab"]').map(e => e.getAttribute('tabindex')),
        panelLabelledby: qa('[role="tabpanel"]').map(e => e.getAttribute('aria-labelledby')),
        hiddenPanels: qa('[role="tabpanel"]').map(e => e.hasAttribute('hidden')),
        // Decorative layers must be hidden from the a11y tree
        decorativeHidden: qa('.auth-art-glow, .auth-art-rules, .auth-scanline, .auth-art-connectors, .auth-contract-skeleton')
          .every(e => e.getAttribute('aria-hidden') === 'true'),
      };
    `);

    check('P1: the two-panel shell renders', struct.hasPage && struct.hasArt && struct.hasFormPanel && struct.hasFormInner);
    check('P1: the tablist has 2 tabs and 2 panels', struct.tablist && struct.tabs === 2 && struct.panels === 2, `${struct.tabs} tabs / ${struct.panels} panels`);
    check('P1: the artwork panel renders the contract, the connectors and the scan line', struct.contract && struct.connectors && struct.scanline);
    check('P1: there are 3 annotation cards', struct.cards === 3, `${struct.cards} cards`);
    check('P1: the headline is verbatim', struct.headline === 'Every clause, checked against the statute.', JSON.stringify(struct.headline));
    check('P1: the subtext is verbatim', struct.subtext === 'Upload a contract and see each claim tied to the law it came from.', JSON.stringify(struct.subtext));
    check('P1: the contract title and meta are verbatim', struct.contractTitle === 'Service Agreement' && struct.contractMeta === 'Draft v3 · 14 pages', `${struct.contractTitle} / ${struct.contractMeta}`);
    check('P1: the numbered clauses are 12.1, 12.2, 13.1', JSON.stringify(struct.clauseNos) === JSON.stringify(['12.1', '12.2', '13.1']), struct.clauseNos.join(', '));
    check('P1: the contract has 5 skeleton bars', struct.skeletonBars === 5, `${struct.skeletonBars} bars`);
    check('P1: there are yellow and green highlights', struct.marks === '1/2', struct.marks);
    check('P1: every card carries a clause ref, a statute with e-Gov, and a verdict chip', struct.cardRefs.length === 3 && struct.cardStatutes.length === 3 && struct.cardVerdicts.length === 3);
    check('P1: every statute citation names e-Gov', struct.cardStatutes.every(s => /e-Gov/.test(s)), struct.cardStatutes.join(' | '));
    check('P1: the verdict chips carry text, not colour alone', struct.cardVerdicts.filter(v => v === 'GREEN' || v === 'YELLOW').length === 3, struct.cardVerdicts.join(', '));
    check('P1: the card analysis text is present', struct.cardTexts.every(t => t.length > 10));
    check('P1: the disclaimer is verbatim', struct.disclaimer.includes('Not legal advice · Verdicts are informational'), JSON.stringify(struct.disclaimer.trim()));
    check('P1: the decorative layers are aria-hidden', struct.decorativeHidden);
    check('P1: the live region is present', struct.liveRegion);
    check('P1: aria-selected is set on both tabs', struct.tabSelected.length === 2 && struct.tabSelected.every(v => v === 'true' || v === 'false'), struct.tabSelected.join(', '));
    check('P1: each tab controls a panel', struct.tabControls.length === 2 && struct.tabControls.every(Boolean));
    check('P1: each panel is labelled by its tab', struct.panelLabelledby.length === 2 && struct.panelLabelledby.every(Boolean));
    check('P1: exactly one tab has tabindex 0 (roving tabindex)', struct.tabTabindex.filter(v => v === '0').length === 1, struct.tabTabindex.join(', '));

    // The app's existing testid contract must survive (FR-8.1).
    const REQUIRED_TESTIDS = [
      'login-form', 'login-form-email-input', 'login-form-password-input',
      'login-form-submit-button', 'login-form-register-link',
      'auth-tab-signin', 'auth-tab-register',
      'auth-signin-password-toggle', 'auth-forgot-password-button', 'auth-google-button',
    ];
    for (const tid of REQUIRED_TESTIDS) {
      check(`P1: the "${tid}" testid is present`, struct.testids.includes(tid));
    }
    // The app's existing element ids must survive (FR-8.3).
    for (const elid of ['login-email', 'login-password']) {
      check(`P1: the #${elid} element id is present`, struct.ids.includes(elid));
    }
    // Every input has a label (FR-7.6).
    const inputIds = struct.ids.filter(i => ['login-email', 'login-password'].includes(i));
    check('P1: every sign-in input has a <label for>', inputIds.every(i => struct.labels.includes(i)), struct.labels.join(', '));

    // --- both data-testid families are in the DOM (FR-8.1, FR-8.2, D6) ---
    // The app's family and the artifact's family are BOTH emitted. An
    // element can carry only one `data-testid`, so where the app's family
    // already owns an element, the artifact's testid rides on a wrapper
    // that encloses it.
    const signinTestids = await evaluate(`
      const present = (id) => !!document.querySelector('[data-testid="' + id + '"]');
      const app = ['auth-card','brand','login-form','login-form-email-input',
                   'login-form-password-input','login-form-submit-button',
                   'login-form-register-link'];
      const artifact = ['auth-tab-signin','auth-tab-register','auth-signin-form',
                        'auth-signin-identifier-input','auth-signin-password-input',
                        'auth-signin-password-toggle','auth-signin-submit-button',
                        'auth-forgot-password-button','auth-google-button'];
      return {
        appMissing: app.filter((id) => !present(id)),
        artifactMissing: artifact.filter((id) => !present(id)),
        // The artifact's form testid must ENCLOSE the app's form testid.
        nested: (() => {
          const a = document.querySelector('[data-testid="auth-signin-form"]');
          const b = document.querySelector('[data-testid="login-form"]');
          return !!(a && b && a.contains(b));
        })(),
      };
    `);
    check('P1: every app-family testid is in the sign-in DOM', signinTestids.appMissing.length === 0, signinTestids.appMissing.join(', '));
    check('P1: every artifact-family testid is in the sign-in DOM', signinTestids.artifactMissing.length === 0, signinTestids.artifactMissing.join(', '));
    check('P1: the artifact form testid encloses the app form testid', signinTestids.nested);

    // ==================================================================
    // PART 2 — The /register route and the register contract (FR-5.1, FR-5.2)
    // ==================================================================
    console.log('\n--- PART 2: the /register route ---\n');

    await goto('/register');
    const reg = await evaluate(`
      const q = (s) => document.querySelector(s);
      const qa = (s) => Array.from(document.querySelectorAll(s));
      return {
        url: location.pathname,
        testids: qa('[data-testid]').map(e => e.getAttribute('data-testid')),
        ids: qa('[id]').map(e => e.id),
        tabSelected: qa('[role="tab"]').map(e => e.getAttribute('aria-selected')),
        hiddenPanels: qa('[role="tabpanel"]').map(e => e.hasAttribute('hidden')),
        heading: (q('#panel-register .auth-form-heading') || {}).textContent || '',
        subtext: (q('#panel-register .auth-form-subtext') || {}).textContent || '',
        labels: qa('#panel-register label[for]').map(e => e.getAttribute('for')),
        placeholderPassword: (q('#register-password') || {}).placeholder || '',
        registerVisible: !q('#panel-register').hasAttribute('hidden'),
        signinHidden: q('#panel-signin').hasAttribute('hidden'),
      };
    `);

    check('P2: /register renders', reg.url === '/register', reg.url);
    check('P2: the create-account tab is active on /register', reg.tabSelected[1] === 'true' && reg.tabSelected[0] === 'false', reg.tabSelected.join(', '));
    check('P2: the register panel is visible and the sign-in panel is hidden', reg.registerVisible && reg.signinHidden);
    check('P2: the register heading is verbatim', reg.heading === 'Create your account', JSON.stringify(reg.heading));
    check('P2: the register subtext is verbatim', reg.subtext === 'Start checking contracts against Japanese statutes.', JSON.stringify(reg.subtext));
    for (const tid of ['register-form', 'register-form-name-input', 'register-form-email-input', 'register-form-password-input', 'register-form-submit-button', 'register-form-login-link', 'auth-register-password-toggle', 'auth-google-register-button']) {
      check(`P2: the "${tid}" testid is present`, reg.testids.includes(tid));
    }
    for (const elid of ['register-name', 'register-email', 'register-password']) {
      check(`P2: the #${elid} element id is present`, reg.ids.includes(elid));
    }
    check('P2: every register input has a <label for>', ['register-name', 'register-email', 'register-password'].every(i => reg.labels.includes(i)), reg.labels.join(', '));

    // Both testid families on the register route (FR-8.1, FR-8.2, D6).
    const registerTestids = await evaluate(`
      const present = (id) => !!document.querySelector('[data-testid="' + id + '"]');
      const app = ['auth-card','register-form','register-form-name-input',
                   'register-form-email-input','register-form-password-input',
                   'register-form-submit-button','register-form-login-link'];
      const artifact = ['auth-tab-signin','auth-tab-register','auth-register-form',
                        'auth-register-name-input','auth-register-email-input',
                        'auth-register-password-input','auth-register-password-toggle',
                        'auth-register-submit-button','auth-google-register-button'];
      return {
        appMissing: app.filter((id) => !present(id)),
        artifactMissing: artifact.filter((id) => !present(id)),
        nested: (() => {
          const a = document.querySelector('[data-testid="auth-register-form"]');
          const b = document.querySelector('[data-testid="register-form"]');
          return !!(a && b && a.contains(b));
        })(),
      };
    `);
    check('P2: every app-family testid is in the register DOM', registerTestids.appMissing.length === 0, registerTestids.appMissing.join(', '));
    check('P2: every artifact-family testid is in the register DOM', registerTestids.artifactMissing.length === 0, registerTestids.artifactMissing.join(', '));
    check('P2: the artifact form testid encloses the app form testid', registerTestids.nested);
    check('P2: the password placeholder names the 8-character rule', reg.placeholderPassword === 'At least 8 characters', JSON.stringify(reg.placeholderPassword));

    // ==================================================================
    // PART 3 — Tab navigation and the APG keyboard pattern (FR-3.2, FR-3.3, FR-5.3)
    // ==================================================================
    console.log('\n--- PART 3: tab navigation ---\n');

    await goto('/login');
    await sleep(300);

    // Clicking the register tab must navigate to /register.
    await evaluate(`
      document.querySelector('[data-testid="auth-tab-register"]').click();
    `);
    await sleep(700);
    const afterTabClick = await evaluate(`
      return {
        url: location.pathname,
        selected: Array.from(document.querySelectorAll('[role="tab"]')).map(e => e.getAttribute('aria-selected')),
      };
    `);
    check('P3: clicking the Create account tab navigates to /register', afterTabClick.url === '/register', afterTabClick.url);
    check('P3: the selected tab follows the route', afterTabClick.selected[1] === 'true' && afterTabClick.selected[0] === 'false');

    // The keyboard pattern: ArrowRight from the sign-in tab selects register.
    await goto('/login');
    await sleep(300);
    await evaluate(`
      const t = document.querySelector('[data-testid="auth-tab-signin"]');
      t.focus();
      t.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    `);
    await sleep(700);
    const afterArrow = await evaluate(`
      return {
        url: location.pathname,
        selected: Array.from(document.querySelectorAll('[role="tab"]')).map(e => e.getAttribute('aria-selected')),
        focused: document.activeElement ? document.activeElement.getAttribute('data-testid') : null,
        tabindex: Array.from(document.querySelectorAll('[role="tab"]')).map(e => e.getAttribute('tabindex')),
      };
    `);
    check('P3: ArrowRight moves to the Create account tab', afterArrow.selected[1] === 'true' && afterArrow.selected[0] === 'false', afterArrow.selected.join(', '));
    check('P3: ArrowRight navigates to /register', afterArrow.url === '/register', afterArrow.url);
    check('P3: focus follows the arrow-key selection', afterArrow.focused === 'auth-tab-register', String(afterArrow.focused));
    check('P3: the roving tabindex moves with the selection', afterArrow.tabindex[1] === '0' && afterArrow.tabindex[0] === '-1', afterArrow.tabindex.join(', '));

    // Home and End.
    await goto('/login');
    await sleep(300);
    await evaluate(`
      const t = document.querySelector('[data-testid="auth-tab-signin"]');
      t.focus();
      t.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    `);
    await sleep(600);
    const afterEnd = await evaluate(`return { url: location.pathname }`);
    check('P3: End selects the last tab', afterEnd.url === '/register', afterEnd.url);

    await goto('/register');
    await sleep(300);
    await evaluate(`
      const t = document.querySelector('[data-testid="auth-tab-register"]');
      t.focus();
      t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    `);
    await sleep(600);
    const afterHome = await evaluate(`return { url: location.pathname }`);
    check('P3: Home selects the first tab', afterHome.url === '/login', afterHome.url);

    // ==================================================================
    // PART 4 — The password visibility toggle (FR-3.7, FR-7.7)
    // ==================================================================
    console.log('\n--- PART 4: the password toggle ---\n');

    await goto('/login');
    await sleep(300);
    const pwBefore = await evaluate(`
      const i = document.getElementById('login-password');
      const b = document.querySelector('[data-testid="auth-signin-password-toggle"]');
      return { type: i.type, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), text: b.textContent.trim() };
    `);
    check('P4: the password input starts hidden', pwBefore.type === 'password');
    check('P4: the toggle is labelled "Show password"', pwBefore.label === 'Show password', String(pwBefore.label));
    check('P4: the toggle starts unpressed', pwBefore.pressed === 'false');

    await evaluate(`document.querySelector('[data-testid="auth-signin-password-toggle"]').click();`);
    await sleep(200);
    const pwAfter = await evaluate(`
      const i = document.getElementById('login-password');
      const b = document.querySelector('[data-testid="auth-signin-password-toggle"]');
      return { type: i.type, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), text: b.textContent.trim() };
    `);
    check('P4: clicking the toggle reveals the password', pwAfter.type === 'text', pwAfter.type);
    check('P4: the toggle label becomes "Hide password"', pwAfter.label === 'Hide password', String(pwAfter.label));
    check('P4: the toggle becomes pressed', pwAfter.pressed === 'true');
    check('P4: the toggle text becomes "Hide"', pwAfter.text === 'Hide', pwAfter.text);

    await evaluate(`document.querySelector('[data-testid="auth-signin-password-toggle"]').click();`);
    await sleep(200);
    const pwBack = await evaluate(`return { type: document.getElementById('login-password').type }`);
    check('P4: clicking again hides the password', pwBack.type === 'password', pwBack.type);

    // ==================================================================
    // PART 5 — The validation lifecycle (FR-4.1 … FR-4.9)
    // ==================================================================
    console.log('\n--- PART 5: validation ---\n');

    await goto('/login');
    await sleep(300);

    // Count network requests so we can prove that an invalid submit issues none.
    await send('Network.setBlockedURLs', { urls: ['*api/auth*'] });
    await evaluate(`
      window.__authReqs = 0;
      const origFetch = window.fetch;
      window.fetch = function (...args) { window.__authReqs++; return origFetch.apply(this, args); };
    `);

    await evaluate(`
      document.querySelector('[data-testid="login-form-submit-button"]').click();
    `);
    await sleep(500);

    const invalid = await evaluate(`
      const i = document.getElementById('login-email');
      const p = document.getElementById('login-password');
      const err = document.getElementById('login-email-error');
      return {
        emailInvalid: i.getAttribute('aria-invalid'),
        hasErrorClass: i.classList.contains('has-error'),
        errorText: err.textContent.trim(),
        errorVisible: err.classList.contains('is-visible'),
        describedBy: i.getAttribute('aria-describedby'),
        passwordError: document.getElementById('login-password-error').textContent.trim(),
        liveText: (document.getElementById('live-region') || {}).textContent || '',
        reqs: window.__authReqs,
        focusedId: document.activeElement ? document.activeElement.id : null,
      };
    `);
    check('P5: an empty sign-in submit marks the identifier invalid', invalid.emailInvalid === 'true');
    check('P5: the invalid input carries the has-error class', invalid.hasErrorClass);
    check('P5: the error message is plain language', /email address or username/i.test(invalid.errorText), JSON.stringify(invalid.errorText));
    check('P5: the error element is visible', invalid.errorVisible);
    check('P5: the input is linked to its error via aria-describedby', invalid.describedBy === 'login-email-error', String(invalid.describedBy));
    check('P5: the password error is also shown', invalid.passwordError.length > 0, JSON.stringify(invalid.passwordError));
    check('P5: the error is announced in the live region', /problems? with the form/i.test(invalid.liveText), JSON.stringify(invalid.liveText));
    check('P5: NO network request was issued for an invalid submit (FR-4.9)', invalid.reqs === 0, `${invalid.reqs} request(s)`);
    check('P5: focus moves to the first invalid field', invalid.focusedId === 'login-email', String(invalid.focusedId));

    // A username-shaped identifier is accepted by the client (FR-4.5).
    await setInputValue('login-email', 'aiko');
    await evaluate(`document.querySelector('[data-testid="login-form-submit-button"]').click();`);
    await sleep(400);
    const afterUsername = await evaluate(`
      const i = document.getElementById('login-email');
      return { invalid: i.getAttribute('aria-invalid'), err: document.getElementById('login-email-error').textContent.trim() };
    `);
    check('P5: a username-shaped identifier passes the client rule (FR-4.5)', afterUsername.invalid === null, String(afterUsername.invalid));

    // A malformed identifier is rejected.
    await setInputValue('login-email', 'not an email');
    await evaluate(`document.querySelector('[data-testid="login-form-submit-button"]').click();`);
    await sleep(400);
    const afterBad = await evaluate(`
      const i = document.getElementById('login-email');
      return { invalid: i.getAttribute('aria-invalid'), err: document.getElementById('login-email-error').textContent.trim() };
    `);
    check('P5: a malformed identifier is rejected', afterBad.invalid === 'true');
    check('P5: the rejection message is plain language', /valid email address/i.test(afterBad.err), JSON.stringify(afterBad.err));

    // The error clears on blur once the value is fixed (FR-4.1).
    await setInputValue('login-email', 'aiko@example.com');
    await evaluate(`
      const i = document.getElementById('login-email');
      i.dispatchEvent(new Event('blur', { bubbles: true }));
      i.blur();
    `);
    await sleep(400);
    const afterFix = await evaluate(`
      const i = document.getElementById('login-email');
      return {
        invalid: i.getAttribute('aria-invalid'),
        hasErrorClass: i.classList.contains('has-error'),
        err: document.getElementById('login-email-error').textContent.trim(),
        visible: document.getElementById('login-email-error').classList.contains('is-visible'),
      };
    `);
    check('P5: the error clears on blur once the value is fixed (FR-4.1)', afterFix.invalid === null && !afterFix.hasErrorClass && afterFix.err === '' && !afterFix.visible, JSON.stringify(afterFix));

    // The register password minimum (FR-4.6).
    await goto('/register');
    await sleep(400);
    await setInputValue('register-name', 'Aiko Tanaka');
    await setInputValue('register-email', 'aiko@example.com');
    await setInputValue('register-password', 'short');
    await evaluate(`document.querySelector('[data-testid="register-form-submit-button"]').click();`);
    await sleep(500);
    const shortPw = await evaluate(`
      const i = document.getElementById('register-password');
      return { invalid: i.getAttribute('aria-invalid'), err: document.getElementById('register-password-error').textContent.trim() };
    `);
    check('P5: a password under 8 characters is rejected', shortPw.invalid === 'true');
    check('P5: the password message names the 8-character requirement (FR-4.6)', /at least 8 characters/i.test(shortPw.err), JSON.stringify(shortPw.err));

    // A register email must be an email (FR-4.5).
    await setInputValue('register-email', 'aiko');
    await evaluate(`document.querySelector('[data-testid="register-form-submit-button"]').click();`);
    await sleep(500);
    const badRegEmail = await evaluate(`
      const i = document.getElementById('register-email');
      return { invalid: i.getAttribute('aria-invalid'), err: document.getElementById('register-email-error').textContent.trim() };
    `);
    check('P5: a non-email register identifier is rejected', badRegEmail.invalid === 'true');
    check('P5: the register email message is plain language', /valid email address/i.test(badRegEmail.err), JSON.stringify(badRegEmail.err));

    // ==================================================================
    // PART 6 — The demo-only controls raise a notice (FR-3.10, FR-3.11)
    // ==================================================================
    console.log('\n--- PART 6: the demo notices ---\n');

    await goto('/login');
    await sleep(300);
    await evaluate(`document.querySelector('[data-testid="auth-google-button"]').click();`);
    await sleep(300);
    const googleNotice = await evaluate(`
      const n = document.getElementById('signin-notice');
      return { text: n.textContent.trim(), visible: n.classList.contains('is-visible'), role: n.getAttribute('role'), live: n.getAttribute('aria-live') };
    `);
    check('P6: Continue with Google raises an inline notice', googleNotice.visible && googleNotice.text.length > 0, JSON.stringify(googleNotice.text));
    check('P6: the notice says the feature is not connected', /not connected/i.test(googleNotice.text), JSON.stringify(googleNotice.text));
    check('P6: the notice is a live status region', googleNotice.role === 'status' && googleNotice.live === 'polite');

    await evaluate(`document.querySelector('[data-testid="auth-forgot-password-button"]').click();`);
    await sleep(300);
    const forgotNotice = await evaluate(`
      const n = document.getElementById('signin-notice');
      return { text: n.textContent.trim(), visible: n.classList.contains('is-visible') };
    `);
    check('P6: Forgot password raises an inline notice', forgotNotice.visible && /password reset/i.test(forgotNotice.text), JSON.stringify(forgotNotice.text));

    // ==================================================================
    // PART 7 — Theme invariance of the artwork panel (FR-2.9, FR-6.4)
    // ==================================================================
    console.log('\n--- PART 7: theme invariance ---\n');

    await setViewport(1440, 900);
    await goto('/login');
    await sleep(2200);

    await setTheme('dark');
    await sleep(400);
    const darkTheme = await evaluate(`
      const art = document.querySelector('.auth-art');
      const card = document.querySelector('.auth-card');
      const panel = document.querySelector('.auth-form-panel');
      return {
        artBg: getComputedStyle(art).backgroundColor,
        cardBorder: card ? getComputedStyle(card).borderLeftColor : null,
        cardText: card ? getComputedStyle(card).color : null,
        cardBodyText: (() => { const t = document.querySelector('.auth-card-text'); return t ? getComputedStyle(t).color : null; })(),
        panelBg: getComputedStyle(panel).backgroundColor,
        panelText: getComputedStyle(panel).color,
      };
    `);

    await setTheme('light');
    await sleep(500);
    const lightTheme = await evaluate(`
      const art = document.querySelector('.auth-art');
      const card = document.querySelector('.auth-card');
      const panel = document.querySelector('.auth-form-panel');
      return {
        artBg: getComputedStyle(art).backgroundColor,
        cardBorder: card ? getComputedStyle(card).borderLeftColor : null,
        cardText: card ? getComputedStyle(card).color : null,
        cardBodyText: (() => { const t = document.querySelector('.auth-card-text'); return t ? getComputedStyle(t).color : null; })(),
        panelBg: getComputedStyle(panel).backgroundColor,
        panelText: getComputedStyle(panel).color,
      };
    `);

    check('P7: the artwork panel background is identical in both themes', darkTheme.artBg === lightTheme.artBg, `${darkTheme.artBg} vs ${lightTheme.artBg}`);
    check('P7: the annotation card border is identical in both themes', darkTheme.cardBorder === lightTheme.cardBorder, `${darkTheme.cardBorder} vs ${lightTheme.cardBorder}`);
    check('P7: the annotation card text colour is identical in both themes', darkTheme.cardBodyText === lightTheme.cardBodyText, `${darkTheme.cardBodyText} vs ${lightTheme.cardBodyText}`);
    check('P7: the annotation card inherits a theme-invariant colour (D10)', darkTheme.cardText === lightTheme.cardText, `${darkTheme.cardText} vs ${lightTheme.cardText}`);
    check('P7: the form panel DOES change with the theme', darkTheme.panelBg !== lightTheme.panelBg, `${darkTheme.panelBg} vs ${lightTheme.panelBg}`);

    await setTheme('dark');
    await sleep(300);

    // ==================================================================
    // PART 8 — Geometry sweep (NFR-2.1 … NFR-2.5, FR-1.2, FR-1.3, FR-2.10)
    // ==================================================================
    console.log('\n--- PART 8: geometry sweep (' + WIDTHS.length + ' widths) ---\n');

    const overflow = [];
    const escapes = [];

    for (const w of WIDTHS) {
      await setViewport(w, 900);
      await goto('/login');
      await sleep(2200);  // let the staggered card fade-in settle

      const geo = await evaluate(`
        const art = document.querySelector('.auth-art');
        const panel = document.querySelector('.auth-form-panel');
        const cards = Array.from(document.querySelectorAll('.auth-card'));
        const artRect = art.getBoundingClientRect();
        return {
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          scrollH: document.documentElement.scrollHeight,
          clientH: document.documentElement.clientHeight,
          artRight: artRect.right,
          artLeft: artRect.left,
          cardRight: cards.map(c => c.getBoundingClientRect().right),
          cardWidths: cards.map(c => c.getBoundingClientRect().width),
          artHidden: getComputedStyle(document.querySelector('.auth-art-stage')).display === 'none',
          panelTop: panel.getBoundingClientRect().top,
          artHeight: art.getBoundingClientRect().height,
        };
      `);

      if (geo.scrollW > geo.clientW + 1) {
        overflow.push(`${w}px: scrollW ${geo.scrollW} > clientW ${geo.clientW}`);
      }
      // The annotation cards must stay inside the artwork panel whenever the
      // artwork is visible (i.e. above the 900px breakpoint).
      if (!geo.artHidden) {
        geo.cardRight.forEach((r, i) => {
          if (r > geo.artRight + 1) {
            escapes.push(`${w}px: card ${i + 1} right ${r.toFixed(1)} > art right ${geo.artRight.toFixed(1)} (width ${geo.cardWidths[i].toFixed(1)}px)`);
          }
        });
      }

      // Below the breakpoint the artwork collapses to a ~200px banner and the
      // contract/stage/cards are hidden (FR-1.2, FR-1.3).
      if (w <= 900) {
        if (!geo.artHidden) overflow.push(`${w}px: the artwork stage should be hidden in the banner`);
        if (geo.artHeight > 260) overflow.push(`${w}px: the banner is ${geo.artHeight.toFixed(0)}px tall, expected ~200px`);
      } else {
        if (geo.artHidden) overflow.push(`${w}px: the artwork stage should be visible in the split layout`);
      }
    }

    check('P8: no horizontal overflow at any of the ' + WIDTHS.length + ' widths', overflow.length === 0, overflow.slice(0, 4).join(' | '));
    check('P8: no annotation card escapes the artwork panel at any width', escapes.length === 0, escapes.slice(0, 4).join(' | '));

    // The 901px band specifically — the source artifact's D9 defect lived here.
    await setViewport(901, 900);
    await goto('/login');
    await sleep(2200);
    const d9 = await evaluate(`
      const art = document.querySelector('.auth-art');
      const artRect = art.getBoundingClientRect();
      const cards = Array.from(document.querySelectorAll('.auth-card'));
      return {
        artRight: artRect.right,
        widths: cards.map(c => c.getBoundingClientRect().width),
        rights: cards.map(c => c.getBoundingClientRect().right),
      };
    `);
    check('P8: at 901px the cards are capped below the full 228px (D9)', d9.widths.every(w => w < 228), d9.widths.map(w => w.toFixed(1)).join(', '));
    check('P8: at 901px every card is inside the artwork panel', d9.rights.every(r => r <= d9.artRight + 1), d9.rights.map(r => r.toFixed(1)).join(', ') + ' vs ' + d9.artRight.toFixed(1));

    await setViewport(1440, 900);
    await goto('/login');
    await sleep(2200);
    const d9wide = await evaluate(`
      const cards = Array.from(document.querySelectorAll('.auth-card'));
      return { widths: cards.map(c => c.getBoundingClientRect().width) };
    `);
    check('P8: at 1440px the cards resolve to the full 228px', d9wide.widths.every(w => Math.abs(w - 228) < 1), d9wide.widths.map(w => w.toFixed(1)).join(', '));

    // ==================================================================
    // PART 9 — The 900px breakpoint and the desktop no-scroll rule
    // ==================================================================
    console.log('\n--- PART 9: the breakpoint and the fit ---\n');

    await setViewport(1440, 900);
    await goto('/register');
    await sleep(800);
    const fit = await evaluate(`
      return {
        scrollH: document.documentElement.scrollHeight,
        clientH: document.documentElement.clientHeight,
      };
    `);
    check('P9: the create-account form fits 1440x900 without scrolling', fit.scrollH <= fit.clientH + 1, `scrollH ${fit.scrollH} / clientH ${fit.clientH}`);

    // ==================================================================
    // PART 10 — Reduced motion (FR-7.4, FR-7.5)
    // ==================================================================
    console.log('\n--- PART 10: reduced motion ---\n');

    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await sleep(500);
    const reduced = await evaluate(`
      const scan = document.querySelector('.auth-scanline');
      const card = document.querySelector('.auth-card');
      const underline = document.querySelector('.auth-tab-underline');
      return {
        scanDisplay: getComputedStyle(scan).display,
        cardOpacity: getComputedStyle(card).opacity,
        cardAnimation: getComputedStyle(card).animationName,
        underlineTransition: getComputedStyle(underline).transitionDuration,
        animations: document.getAnimations().length,
      };
    `);
    check('P10: the scan line is not rendered under reduced motion', reduced.scanDisplay === 'none', reduced.scanDisplay);
    check('P10: the annotation cards appear immediately', reduced.cardOpacity === '1' && reduced.cardAnimation === 'none', `${reduced.cardOpacity} / ${reduced.cardAnimation}`);
    check('P10: the tab underline transitions instantly', reduced.underlineTransition === '0s', reduced.underlineTransition);

    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    });
    await sleep(300);

    // ==================================================================
    // PART 11 — No storage or logging of the password (NFR-4.5)
    // ==================================================================
    console.log('\n--- PART 11: the password is never persisted ---\n');

    await goto('/login');
    await sleep(300);
    await evaluate(`
      const i = document.getElementById('login-password');
      i.value = 'SuperSecret123';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await sleep(300);
    const persisted = await evaluate(`
      const dump = {};
      for (let k = 0; k < localStorage.length; k++) {
        const key = localStorage.key(k);
        dump[key] = localStorage.getItem(key);
      }
      return {
        local: dump,
        session: Object.keys(sessionStorage),
        cookie: document.cookie,
      };
    `);
    const storageBlob = JSON.stringify(persisted);
    check('P11: the password does not appear in localStorage', !storageBlob.includes('SuperSecret123'), Object.keys(persisted.local).join(', ') || '(empty)');
    check('P11: the password does not appear in sessionStorage', !JSON.stringify(persisted.session).includes('SuperSecret123'));
    check('P11: the password does not appear in a cookie', !storageBlob.includes('SuperSecret123'));

    // ==================================================================
    // PART 12 — The source artifact's own static rules still hold in the SPA
    // ==================================================================
    console.log('\n--- PART 12: the source artifact invariants ---\n');

    const invariants = await evaluate(`
      const cs = (sel, prop) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el)[prop] : null;
      };
      const clause = document.querySelector('.auth-clause');
      const card = document.querySelector('.auth-card');
      return {
        clausePaddingLeft: clause ? getComputedStyle(clause).paddingLeft : null,
        clauseTextIndent: clause ? getComputedStyle(clause).textIndent : null,
        clauseDisplay: clause ? getComputedStyle(clause).display : null,
        cardWidth: card ? getComputedStyle(card).width : null,
        // The DECLARED width, which is where the D9 min() cap lives. The
        // computed width legitimately resolves to the full 228px at wide
        // viewports, so only the declaration can prove the cap is present.
        cardDeclaredWidth: card ? card.style.width || null : null,
        cardCssRules: (() => {
          const out = [];
          const walk = (rules) => {
            for (const r of Array.from(rules || [])) {
              // A plain CSSStyleRule also exposes a cssRules property
              // (nested CSS), so the STYLE-bearing rules must be handled
              // BEFORE the container check — otherwise every style rule is
              // mistaken for a group and skipped.
              if (r.selectorText && r.style) {
                if (
                  r.selectorText.split(',').some((s) => s.trim() === '.auth-card') &&
                  r.style.width
                ) {
                  out.push(r.style.width);
                }
              }
              if (r.cssRules) {
                // @media / @supports blocks — recurse into them.
                walk(r.cssRules);
              }
            }
          };
          for (const sheet of Array.from(document.styleSheets)) {
            let rules;
            try { rules = sheet.cssRules; } catch (e) { continue; }
            walk(rules);
          }
          return out;
        })(),
        cardColor: card ? getComputedStyle(card).color : null,
        scanAnimation: cs('.auth-scanline', 'animationDuration'),
        cardAnimationDuration: cs('.auth-card', 'animationDuration'),
        cardDelays: Array.from(document.querySelectorAll('.auth-card')).map(c => getComputedStyle(c).animationDelay),
        inputRadius: cs('.auth-input', 'borderRadius'),
        btnRadius: cs('.auth-btn-primary', 'borderRadius'),
        fontSerif: cs('.auth-form-heading', 'fontFamily'),
        fontSans: cs('.auth-input', 'fontFamily'),
        headings: Array.from(document.querySelectorAll('.auth-form-heading')).map(h => h.textContent.trim()),
        scanWillChange: cs('.auth-scanline', 'willChange'),
      };
    `);

    check('P12: the clause uses a hanging indent, not flex', invariants.clauseDisplay !== 'flex' && invariants.clausePaddingLeft === '32px' && invariants.clauseTextIndent === '-32px', `${invariants.clauseDisplay} / ${invariants.clausePaddingLeft} / ${invariants.clauseTextIndent}`);
    check(
      'P12: the card width is capped with min()',
      invariants.cardCssRules.some((w) => /min\s*\(/.test(w)) && invariants.cardCssRules.some((w) => /--card-left/.test(w)),
      JSON.stringify(invariants.cardCssRules),
    );
    check('P12: the card carries the theme-invariant artwork colour (D10)', invariants.cardColor === 'rgb(236, 232, 225)', String(invariants.cardColor));
    check('P12: the scan sweep runs on a 6s loop', invariants.scanAnimation === '6s', String(invariants.scanAnimation));
    check('P12: the card fade is a 0.62s one-shot', invariants.cardAnimationDuration === '0.62s', String(invariants.cardAnimationDuration));
    check('P12: the card stagger is 0.4s / 0.8s / 1.2s', JSON.stringify(invariants.cardDelays) === JSON.stringify(['0.4s', '0.8s', '1.2s']), invariants.cardDelays.join(', '));
    check('P12: the scan line animates transform on an isolated layer', invariants.scanWillChange === 'transform', String(invariants.scanWillChange));
    check('P12: the inputs use a 10px radius', invariants.inputRadius === '10px', String(invariants.inputRadius));
    check('P12: the buttons use a 10px radius', invariants.btnRadius === '10px', String(invariants.btnRadius));
    check('P12: the headings use the serif face', /Newsreader/i.test(invariants.fontSerif || ''), String(invariants.fontSerif));
    check('P12: the inputs use the sans face', /Inter/i.test(invariants.fontSans || ''), String(invariants.fontSans));
    check('P12: the two mode headings are correct', invariants.headings.includes('Welcome back') && invariants.headings.includes('Create your account'), invariants.headings.join(' | '));

    // ==================================================================
    // PART 13 — Theme containment (FR-8.7)
    //
    // The auth screen's light theme must NOT leak into the rest of the app.
    // The global `:root` tokens are dark-only, and the light override is
    // scoped to `.auth-form-panel`. This part proves it on a real page:
    // with a seeded session, the CHAT screen must still render dark under
    // `prefers-color-scheme: light`.
    //
    // The session is seeded with `Page.addScriptToEvaluateOnNewDocument`
    // rather than a `Runtime.evaluate` localStorage write, because the
    // session provider reads the token in a `useState` INITIALISER — a
    // write after boot is never seen.
    // ==================================================================
    console.log('\n--- PART 13: the light theme does not leak into the rest of the app ---\n');

    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        try {
          localStorage.setItem('jlca_token','verify-auth-port-token');
          localStorage.setItem('jlca_user', JSON.stringify({email:'aiko@example.com',name:'Aiko Tanaka'}));
        } catch (e) { /* storage unavailable — the check below will report it */ }
      `,
    });

    // Wait for the document to be fully loaded before reading anything.
    // `Page.navigate` resolves when the navigation is COMMITTED, not when
    // the document has loaded — reading too early yields an empty body and
    // a transparent background, which is what made this part flaky.
    const waitForLoad = async (timeoutMs = 15000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const state = await evaluate(`
          const root = document.getElementById('root');
        return {
            ready: document.readyState,
            hasBody: !!document.body,
            bodyLen: document.body ? document.body.innerHTML.length : 0,
            // The React app mounts into #root — wait for it to have content,
            // not merely for the empty root div to exist.
            rootLen: root ? root.innerHTML.length : 0,
          };
        `);
        // NOTE: `readyState` is deliberately NOT required to be 'complete'.
        // The Vite dev server holds an HMR websocket open, which keeps the
        // document at 'interactive' indefinitely. The React app mounting into
        // #root is the real signal that the page is usable.
        if (state.hasBody && state.rootLen > 500) return state;
        await sleep(150);
      }
      return null;
    };

    const navResult = await send('Page.navigate', { url: `${APP}/` });
    // A failed navigation returns an errorText rather than throwing.
    if (navResult && navResult.errorText) {
      check('P13: the navigation to the chat screen succeeded', false, navResult.errorText);
    }
    await waitForLoad();
    // The SPA may still be redirecting from /login to /; give the router a
    // beat, then reload so the seeded session is picked up on a clean boot.
    await sleep(900);
    await send('Page.reload', { ignoreCache: true });
    await waitForLoad();
    await sleep(1200);
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    });
    await sleep(700);

    const chat = await evaluate(`
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        path: location.pathname,
        hasAuthPage: !!document.querySelector('.auth-page'),
        rootBg: root.getPropertyValue('--bg-canvas').trim(),
        rootInk: root.getPropertyValue('--ink-primary').trim(),
        bodyBg: body.backgroundColor,
        bodyColor: body.color,
        // textContent rather than innerText: innerText is layout-dependent
        // and returns '' for content that is rendered but not currently laid
        // out, which made this check flaky.
        text: (document.body.textContent || '').slice(0, 200),
      };
    `);

    check('P13: the seeded session reaches the chat screen', chat.path === '/', chat.path);
    check('P13: the chat screen is rendered, not the auth screen', !chat.hasAuthPage, String(chat.hasAuthPage));
    // The production build minifies hex colours to lower case, so the
    // comparison is case-insensitive.
    const hexEq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    check('P13: the global canvas token is unchanged by the light theme', hexEq(chat.rootBg, '#1F1B1C'), chat.rootBg);
    check('P13: the global ink token is unchanged by the light theme', hexEq(chat.rootInk, '#F4F1EC'), chat.rootInk);
    check('P13: the chat body stays DARK under prefers-color-scheme: light', chat.bodyBg === 'rgb(31, 27, 28)', chat.bodyBg);
    check('P13: the chat body keeps its light ink on the dark ground', chat.bodyColor === 'rgb(244, 241, 236)', chat.bodyColor);
    // The chat workspace mounts asynchronously (the thread list is fetched),
    // so the text may not be present on the very first read. Wait for it.
    if (!/New chat|Paste a clause/i.test(chat.text)) {
      await sleep(1500);
      const retry = await evaluate(`
        return { text: (document.body.textContent || '').slice(0, 200) };
      `);
      chat.text = retry.text;
    }
    check('P13: the chat workspace content is present', /New chat|Paste a clause/i.test(chat.text), JSON.stringify(chat.text));

    // ==================================================================
    // SUMMARY
    // ==================================================================
    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    console.log('\n============================================');
    console.log(`checks run      : ${results.length}`);
    console.log(`passed          : ${passed}`);
    console.log(`failed          : ${failed}`);
    console.log(failed === 0 ? 'result          : ALL CHECKS PASS' : 'result          : FAILURES PRESENT');
    console.log('============================================\n');

    const failedNames = results.filter((r) => !r.ok).map((r) => r.name);
    if (failedNames.length) {
      console.log('Failed checks:');
      failedNames.forEach((n) => console.log('  - ' + n));
    }
    process.exitCode = failed === 0 ? 0 : 1;
  } catch (err) {
    console.error('HARNESS ERROR:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { if (ws) ws.close(); } catch (e) {}
    try { chrome.kill('SIGKILL'); } catch (e) {}
    try { if (server) server.close(); } catch (e) {}
  }
})();
