// Headless interaction test for the responsive-auth prototype.
// Drives the real DOM in Chrome via the DevTools Protocol over CDP.
// Usage: node aidlc-docs/scripts/verify-responsive-auth-behaviour.js
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '../../context-docs/mockups/08-responsive-login-register.html');
const PORT = 9333;
const CDP = 9222;

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

async function waitFor(fn, tries = 60, delay = 250) {
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (v) return v; } catch (e) {}
    await sleep(delay);
  }
  return null;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${CDP}`, '--window-size=1440,900',
    `--user-data-dir=/tmp/cdp-profile-${Date.now()}`,
    `file://${FILE}`,
  ], { stdio: 'ignore' });

  try {
    const target = await waitFor(async () => {
      const list = await getJSON(`http://127.0.0.1:${CDP}/json/list`);
      return list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    });
    if (!target) throw new Error('could not attach to Chrome');

    const WebSocket = require('ws');
    const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
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
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception || {}));
      return r.result.value;
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(1200);

    // ---------- 1. Initial state ----------
    let s = await evaluate(`
      return {
        signinSelected: document.getElementById('tab-signin').getAttribute('aria-selected'),
        registerSelected: document.getElementById('tab-register').getAttribute('aria-selected'),
        registerHidden: document.getElementById('panel-register').hidden,
        signinHidden: document.getElementById('panel-signin').hidden,
        signinTabindex: document.getElementById('tab-signin').tabIndex,
        registerTabindex: document.getElementById('tab-register').tabIndex,
      };
    `);
    check('initial: sign-in tab selected', s.signinSelected === 'true');
    check('initial: create-account tab not selected', s.registerSelected === 'false');
    check('initial: register panel hidden', s.registerHidden === true);
    check('initial: sign-in panel visible', s.signinHidden === false);
    check('initial: roving tabindex — only active tab is 0',
      s.signinTabindex === 0 && s.registerTabindex === -1);

    // ---------- 2. Click the Create account tab ----------
    await evaluate(`document.getElementById('tab-register').click(); return 1;`);
    await sleep(450);
    s = await evaluate(`
      return {
        registerSelected: document.getElementById('tab-register').getAttribute('aria-selected'),
        signinSelected: document.getElementById('tab-signin').getAttribute('aria-selected'),
        registerHidden: document.getElementById('panel-register').hidden,
        signinHidden: document.getElementById('panel-signin').hidden,
        signinTabindex: document.getElementById('tab-signin').tabIndex,
        registerTabindex: document.getElementById('tab-register').tabIndex,
        underlineX: document.getElementById('tab-underline').style.transform,
      };
    `);
    check('tab click: register tab selected', s.registerSelected === 'true');
    check('tab click: sign-in tab deselected', s.signinSelected === 'false');
    check('tab click: register panel shown', s.registerHidden === false);
    check('tab click: sign-in panel hidden', s.signinHidden === true);
    check('tab click: roving tabindex moved', s.signinTabindex === -1 && s.registerTabindex === 0);
    check('tab click: underline moved', /translateX/.test(s.underlineX) && s.underlineX !== 'translateX(0px)');

    // ---------- 3. Arrow-key navigation ----------
    await evaluate(`
      const t = document.getElementById('tab-register');
      t.focus();
      t.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
      return 1;
    `);
    await sleep(350);
    s = await evaluate(`
      return {
        selected: document.getElementById('tab-signin').getAttribute('aria-selected'),
        active: document.activeElement.id,
      };
    `);
    check('ArrowRight wraps to sign-in and activates it', s.selected === 'true');
    check('ArrowRight moves focus to the activated tab', s.active === 'tab-signin');

    await evaluate(`
      const t = document.getElementById('tab-signin');
      t.focus();
      t.dispatchEvent(new KeyboardEvent('keydown', {key:'End', bubbles:true}));
      return 1;
    `);
    await sleep(350);
    s = await evaluate(`return document.getElementById('tab-register').getAttribute('aria-selected');`);
    check('End key jumps to the last tab', s === 'true');

    // ---------- 4. Validation on empty submit ----------
    await evaluate(`
      const t = document.getElementById('tab-register');
      t.focus();
      t.dispatchEvent(new KeyboardEvent('keydown', {key:'Home', bubbles:true}));
      return 1;
    `);
    await sleep(300);
    await evaluate(`document.getElementById('form-signin').requestSubmit(); return 1;`);
    await sleep(300);
    s = await evaluate(`
      const e = document.getElementById('signin-identifier-error');
      const p = document.getElementById('signin-password-error');
      return {
        idText: e.textContent,
        idVisible: e.classList.contains('is-visible'),
        pwVisible: p.classList.contains('is-visible'),
        invalid: document.getElementById('signin-identifier').getAttribute('aria-invalid'),
        live: document.getElementById('live-region').textContent,
        successPresent: !!document.querySelector('.success'),
      };
    `);
    check('empty submit: identifier error shown', s.idVisible === true && s.idText.length > 0, s.idText);
    check('empty submit: password error shown', s.pwVisible === true);
    check('empty submit: aria-invalid set', s.invalid === 'true');
    check('empty submit: live region announced', s.live.length > 0, s.live);
    check('empty submit: no success card', s.successPresent === false);

    // ---------- 5. Error clears on blur after fix ----------
    await evaluate(`
      const i = document.getElementById('signin-identifier');
      i.value = 'aiko@example.com';
      i.dispatchEvent(new Event('blur'));
      return 1;
    `);
    await sleep(200);
    s = await evaluate(`
      const e = document.getElementById('signin-identifier-error');
      return {
        visible: e.classList.contains('is-visible'),
        text: e.textContent,
        invalid: document.getElementById('signin-identifier').getAttribute('aria-invalid'),
      };
    `);
    check('blur after fix: identifier error clears', s.visible === false && s.text === '');
    check('blur after fix: aria-invalid removed', s.invalid === null);

    // ---------- 6. Invalid email / username rejection ----------
    await evaluate(`
      const i = document.getElementById('signin-identifier');
      i.value = 'not an email!!';
      i.dispatchEvent(new Event('blur'));
      return 1;
    `);
    await sleep(200);
    s = await evaluate(`return document.getElementById('signin-identifier-error').textContent;`);
    check('invalid identifier rejected with a plain-language message',
      s.length > 0 && s.indexOf('undefined') === -1 && s.indexOf('[object') === -1, s);

    // ---------- 7. Username accepted on sign-in ----------
    await evaluate(`
      const i = document.getElementById('signin-identifier');
      i.value = 'aiko_t';
      i.dispatchEvent(new Event('blur'));
      return 1;
    `);
    await sleep(200);
    s = await evaluate(`return document.getElementById('signin-identifier-error').textContent;`);
    check('username accepted on sign-in', s === '', `error="${s}"`);

    // ---------- 8. Password show/hide ----------
    await evaluate(`document.querySelector('#form-signin .pw-toggle').click(); return 1;`);
    await sleep(150);
    s = await evaluate(`
      const b = document.querySelector('#form-signin .pw-toggle');
      return {
        type: document.getElementById('signin-password').type,
        label: b.getAttribute('aria-label'),
        pressed: b.getAttribute('aria-pressed'),
        text: b.textContent,
      };
    `);
    check('show/hide: input type becomes text', s.type === 'text');
    check('show/hide: aria-label updated', s.label === 'Hide password', s.label);
    check('show/hide: aria-pressed updated', s.pressed === 'true');
    check('show/hide: button text updated', s.text === 'Hide', s.text);

    await evaluate(`document.querySelector('#form-signin .pw-toggle').click(); return 1;`);
    await sleep(150);
    s = await evaluate(`return document.getElementById('signin-password').type;`);
    check('show/hide: toggles back to password', s === 'password');

    // ---------- 9. Demo notices ----------
    await evaluate(`document.getElementById('forgot-password').click(); return 1;`);
    await sleep(150);
    s = await evaluate(`
      const n = document.getElementById('signin-notice');
      return { visible: n.classList.contains('is-visible'), text: n.textContent };
    `);
    check('forgot password: inline notice shown', s.visible === true && s.text.length > 0, s.text);

    await evaluate(`document.getElementById('google-signin').click(); return 1;`);
    await sleep(150);
    s = await evaluate(`return document.getElementById('signin-notice').textContent;`);
    check('google button: inline notice shown', /google/i.test(s), s);

    // ---------- 10. Register password policy ----------
    await evaluate(`document.getElementById('tab-register').click(); return 1;`);
    await sleep(350);
    await evaluate(`
      document.getElementById('register-name').value = 'Aiko Tanaka';
      document.getElementById('register-email').value = 'aiko@example.com';
      document.getElementById('register-password').value = 'short';
      document.getElementById('form-register').requestSubmit();
      return 1;
    `);
    await sleep(300);
    s = await evaluate(`return document.getElementById('register-password-error').textContent;`);
    check('register: 8-character minimum enforced', /8 characters/i.test(s), s);

    await evaluate(`
      document.getElementById('register-password').value = 'longenough';
      document.getElementById('form-register').requestSubmit();
      return 1;
    `);
    await sleep(300);
    s = await evaluate(`return !!document.querySelector('.success');`);
    check('register: valid form produces the success card', s === true);

    // ---------- 11. Success card content ----------
    s = await evaluate(`
      const c = document.querySelector('.success');
      return {
        text: c ? c.textContent : '',
        hasReset: !!(c && c.querySelector('[data-testid="auth-success-reset-button"]')),
        formHidden: document.getElementById('form-register').closest('section').hidden,
        successVisible: !document.getElementById('success-region').hidden,
      };
    `);
    check('success: states it is a prototype / no account created',
      /no account was created/i.test(s.text), s.text.slice(0, 90));
    check('success: reset link present', s.hasReset === true);
    check('success: form panel hidden while the success card shows',
      s.formHidden === true && s.successVisible === true);

    // ---------- 12. Reset restores the form in place ----------
    await evaluate(`
      const r = document.querySelector('[data-testid="auth-success-reset-button"]');
      if (r) r.click();
      return 1;
    `);
    await sleep(500);
    s = await evaluate(`
      return {
        successGone: document.getElementById('success-region').hidden,
        signinVisible: !document.getElementById('panel-signin').hidden,
        formBack: !!document.getElementById('form-signin'),
        fieldCleared: document.getElementById('signin-identifier').value === '',
      };
    `);
    check('reset: success card removed', s.successGone === true);
    check('reset: form restored in place (no page reload)', s.formBack === true && s.signinVisible === true);
    check('reset: field cleared', s.fieldCleared === true);

    // ---------- 13. XSS safety ----------
    await evaluate(`
      document.getElementById('tab-register').click();
      return 1;
    `);
    await sleep(350);
    await evaluate(`
      document.getElementById('register-name').value = '<img src=x onerror=window.__pwned=1>';
      document.getElementById('register-email').value = 'x@example.com';
      document.getElementById('register-password').value = 'longenough';
      document.getElementById('form-register').requestSubmit();
      return 1;
    `);
    await sleep(400);
    s = await evaluate(`
      const c = document.querySelector('.success');
      return {
        pwned: !!window.__pwned,
        injected: document.querySelectorAll('img').length,
        successText: c ? c.textContent : '',
      };
    `);
    check('XSS: injected markup did not execute', s.pwned === false);
    check('XSS: no injected <img> element created', s.injected === 0);
    check('XSS: payload rendered as literal text',
      s.successText.includes('<img'), s.successText.slice(0, 90));

    // ---------- 14. Reduced motion ----------
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await sleep(300);
    s = await evaluate(`
      const sl = document.querySelector('.scanline');
      const card = document.querySelector('.card');
      const cs = getComputedStyle(sl);
      const cc = getComputedStyle(card);
      return {
        scanDisplay: cs.display,
        cardOpacity: cc.opacity,
        cardAnimation: cc.animationName,
        underlineTransition: getComputedStyle(document.getElementById('tab-underline')).transitionDuration,
      };
    `);
    check('reduced motion: scan line not displayed', s.scanDisplay === 'none', s.scanDisplay);
    check('reduced motion: cards fully visible immediately',
      parseFloat(s.cardOpacity) === 1 && s.cardAnimation === 'none',
      `opacity=${s.cardOpacity} animation=${s.cardAnimation}`);
    check('reduced motion: underline transition disabled',
      /^0s(, 0s)*$/.test(s.underlineTransition), s.underlineTransition);

    // ---------- 15. No network requests beyond the font ----------
    await send('Network.enable');
    const requests = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.method === 'Network.requestWillBeSent') {
        requests.push(msg.params.request.url);
      }
    });
    await evaluate(`location.reload(); return 1;`);
    await sleep(2500);
    const external = requests.filter((u) => !u.startsWith('file://'));
    const nonFont = external.filter((u) => !/fonts\.(googleapis|gstatic)\.com/.test(u));
    check('network: no request outside the font CDN',
      nonFont.length === 0, nonFont.join(', ') || 'none');

    ws.close();
  } catch (err) {
    console.error('ERROR:', err.message);
    results.push({ name: 'harness', ok: false, detail: err.message });
  } finally {
    chrome.kill();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`));
    process.exit(1);
  }
  console.log('ALL INTERACTION CHECKS PASS');
})();
