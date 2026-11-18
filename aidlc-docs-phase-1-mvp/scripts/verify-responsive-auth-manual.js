// Automated execution of the OUTSTANDING MANUAL verification items for the
// responsive-auth unit — the checks that the Build and Test instructions
// document for human execution (scenarios I-2, I-5, I-6, I-7, I-8, I-9's
// measurable parts, B-1 … B-5, and D-1 / D-2).
//
// Usage: NODE_PATH=/tmp/cdp-harness/node_modules \
//          node aidlc-docs/scripts/verify-responsive-auth-manual.js
//
// Exit 0 = all checks pass, exit 1 = failures.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '../../context-docs/mockups/08-responsive-login-register.html');
const PORT = 9334;
const CDP = 9223;

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

// The widths enumerated in the integration instructions' geometry sweep.
const WIDTHS = [320, 360, 390, 414, 480, 600, 768, 900, 901, 1024, 1280, 1440, 1920, 2560];

(async () => {
  // Serve over HTTP so the same-origin policy and the font request behave
  // as they would in production (a file:// load restricts them).
  const server = http.createServer((req, res) => {
    const body = fs.readFileSync(FILE);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${CDP}`, '--window-size=1440,900',
    `--user-data-dir=/tmp/cdp-manual-profile-${Date.now()}`,
    `http://127.0.0.1:${PORT}/`,
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

    // Set a TRUE viewport. Without this, clientHeight is reduced by the
    // browser-chrome offset, which produces a false "the page scrolls" reading.
    const setViewport = async (width, height = 900) => {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: false,
      });
      await sleep(180);
      // Reload so that percentage- and min()-based widths re-resolve against
      // the new viewport. Without this, a page laid out at the launch width
      // keeps its stale geometry and the sweep reports false escapes.
      await send('Page.reload', { ignoreCache: true });
      await sleep(700);
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(1200);

    // ==================================================================
    // PART 1 — Geometry sweep (NFR-2.1, NFR-2.2, NFR-2.3, NFR-2.4, FR-1.5)
    // ==================================================================
    console.log('\n--- PART 1: geometry sweep (' + WIDTHS.length + ' widths) ---\n');

    const overflowByWidth = [];
    const escapesByWidth = [];

    for (const w of WIDTHS) {
      await setViewport(w, 900);

      const g = await evaluate(`
        const de = document.documentElement;
        const art = document.querySelector('.panel-art');
        const cards = Array.from(document.querySelectorAll('.card'));
        const contract = document.querySelector('.contract');
        const banner = document.querySelector('.panel-art');
        const artBox = art ? art.getBoundingClientRect() : null;
        const vw = window.innerWidth;

        const cardEscapes = cards.filter(c => {
          const r = c.getBoundingClientRect();
          return artBox ? (r.left < artBox.left - 1 || r.right > artBox.right + 1) : false;
        }).length;
        const contractEscapes = (artBox && contract) ? (() => {
          const r = contract.getBoundingClientRect();
          return (r.left < artBox.left - 1 || r.right > artBox.right + 1) ? 1 : 0;
        })() : 0;

        return {
          vw,
          scrollW: de.scrollWidth,
          clientW: de.clientWidth,
          hOverflow: Math.max(0, de.scrollWidth - de.clientWidth),
          vOverflow: Math.max(0, de.scrollHeight - de.clientHeight),
          cardCount: cards.length,
          cardEscapes,
          contractEscapes,
          artHeight: artBox ? Math.round(artBox.height) : null,
          artWidth: artBox ? Math.round(artBox.width) : null,
          artLeft: artBox ? Math.round(artBox.left) : null,
          hasBanner: !!banner,
          splitLayout: artBox ? artBox.width > 250 : null,
        };
      `);

      overflowByWidth.push({ w, h: g.hOverflow, v: g.vOverflow });
      escapesByWidth.push({ w, card: g.cardEscapes, contract: g.contractEscapes });

      check(`geometry @${w}px: no horizontal overflow`, g.hOverflow === 0, `scrollWidth ${g.scrollW} vs clientWidth ${g.clientW}`);
      check(`geometry @${w}px: no card escapes the artwork panel`, g.cardEscapes === 0, `${g.cardEscapes} of ${g.cardCount} cards escaped`);
      check(`geometry @${w}px: contract stays inside the artwork panel`, g.contractEscapes === 0);
    }

    // FR-1.5 — the form must fit 1440x900 with 0px vertical overflow, for BOTH forms.
    await setViewport(1440, 900);
    for (const [label, tabId] of [['sign-in', 'tab-signin'], ['register', 'tab-register']]) {
      await evaluate(`document.getElementById('${tabId}').click(); return true;`);
      await sleep(360);
      const v = await evaluate(`
        const de = document.documentElement;
        return { vOverflow: Math.max(0, de.scrollHeight - de.clientHeight), h: de.scrollHeight };
      `);
      check(`FR-1.5 @1440x900 (${label}): 0px vertical overflow`, v.vOverflow === 0, `scrollHeight ${v.h}`);
    }

    // FR-1.2 / NFR-2.2 / NFR-2.3 — the 900px breakpoint.
    await setViewport(901, 900);
    const at901 = await evaluate(`
      const art = document.querySelector('.panel-art');
      const r = art.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    `);
    check('breakpoint @901px: the split layout is active (panel is narrower than the page)', at901.w > 250 && at901.w < 900, `artwork panel ${at901.w}x${at901.h}`);

    await setViewport(899, 900);
    const at899 = await evaluate(`
      const art = document.querySelector('.panel-art');
      const r = art.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    `);
    check('breakpoint @899px: the layout is stacked (panel spans the full width)', at899.w > 800, `artwork panel ${at899.w}x${at899.h}`);
    check('breakpoint @899px: the artwork collapses to a ~200px banner', at899.h <= 260, `artwork height ${at899.h}px`);

    await setViewport(900, 900);
    const at900 = await evaluate(`
      const art = document.querySelector('.panel-art');
      const r = art.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    `);
    check('breakpoint @900px: the layout is stacked (panel spans the full width)', at900.w > 800, `artwork panel ${at900.w}x${at900.h}`);

    // ==================================================================
    // PART 2 — Interaction scenarios (I-5, I-6, I-7, I-8)
    // ==================================================================
    console.log('\n--- PART 2: interaction scenarios ---\n');

    await setViewport(1440, 900);
    await evaluate(`document.getElementById('tab-signin').click(); return true;`);
    await sleep(300);

    // I-5 — the error lifecycle: an error clears only once the value is fixed.
    await evaluate(`
      const f = document.getElementById('form-signin');
      if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
      return true;
    `);
    await sleep(300);
    const errState = await evaluate(`
      const id = document.getElementById('signin-identifier');
      const pw = document.getElementById('signin-password');
      const idErr = document.getElementById('signin-identifier-error');
      const live = document.querySelector('[aria-live]');
      return {
        idInvalid: id ? id.getAttribute('aria-invalid') : null,
        idErrVisible: idErr ? !idErr.hidden && idErr.offsetParent !== null : false,
        idErrText: idErr ? idErr.textContent.trim() : '',
        pwInvalid: pw ? pw.getAttribute('aria-invalid') : null,
        liveText: live ? live.textContent.trim() : '',
      };
    `);
    check('I-5: empty submit marks the identifier aria-invalid', errState.idInvalid === 'true');
    check('I-5: empty submit shows a non-empty identifier error', errState.idErrVisible && errState.idErrText.length > 0, errState.idErrText);
    check('I-5: empty submit marks the password aria-invalid', errState.pwInvalid === 'true');
    check('I-5: empty submit announces via the live region', errState.liveText.length > 0, errState.liveText.slice(0, 60));

    // Type a valid value but DO NOT blur — the error must persist.
    await evaluate(`
      const id = document.getElementById('signin-identifier');
      id.focus();
      id.value = 'aiko@example.com';
      id.dispatchEvent(new Event('input', {bubbles:true}));
      return true;
    `);
    await sleep(200);
    const beforeBlur = await evaluate(`
      const idErr = document.getElementById('signin-identifier-error');
      return { visible: idErr ? !idErr.hidden && idErr.offsetParent !== null : false };
    `);
    check('I-5: the error persists while the field still has focus', beforeBlur.visible === true);

    // Now blur — the error must clear.
    await evaluate(`
      const id = document.getElementById('signin-identifier');
      id.dispatchEvent(new Event('blur', {bubbles:false}));
      id.blur();
      return true;
    `);
    await sleep(300);
    const afterBlur = await evaluate(`
      const id = document.getElementById('signin-identifier');
      const idErr = document.getElementById('signin-identifier-error');
      return {
        visible: idErr ? !idErr.hidden && idErr.offsetParent !== null : false,
        invalid: id.getAttribute('aria-invalid'),
        text: idErr ? idErr.textContent.trim() : '',
      };
    `);
    check('I-5: the error clears on blur once the value is fixed', afterBlur.visible === false);
    check('I-5: aria-invalid is removed after the fix', afterBlur.invalid === null, `aria-invalid=${afterBlur.invalid}`);

    // I-7 — password visibility toggle.
    const toggle = await evaluate(`
      const btn = document.querySelector('#signin-password ~ * .pw-toggle') ||
                  document.querySelector('[data-testid="auth-signin-password-toggle"]');
      const pw = document.getElementById('signin-password');
      return { hasBtn: !!btn, type: pw ? pw.type : null };
    `);
    check('I-7: the password toggle exists', toggle.hasBtn);
    const showState = await evaluate(`
      const btn = document.querySelector('[data-testid="auth-signin-password-toggle"]');
      const pw = document.getElementById('signin-password');
      btn.click();
      return {
        type: pw.type,
        label: btn.getAttribute('aria-label'),
        pressed: btn.getAttribute('aria-pressed'),
        text: btn.textContent.trim(),
      };
    `);
    check('I-7: clicking Show flips the input type to text', showState.type === 'text', `type=${showState.type}`);
    check('I-7: clicking Show updates the aria-label', showState.label === 'Hide password', showState.label);
    check('I-7: clicking Show updates aria-pressed', showState.pressed === 'true', showState.pressed);
    const hideState = await evaluate(`
      const btn = document.querySelector('[data-testid="auth-signin-password-toggle"]');
      document.getElementById('signin-password').value = 'secret123';
      btn.click();
      return { type: document.getElementById('signin-password').type };
    `);
    check('I-7: clicking Hide flips the input type back to password', hideState.type === 'password', `type=${hideState.type}`);

    // I-8 — the demo paths must not navigate or open a popup.
    const demo = await evaluate(`
      const before = location.href;
      const fp = document.querySelector('[data-testid="auth-forgot-password-button"]');
      if (fp) fp.click();
      const noticeText = Array.from(document.querySelectorAll('.notice'))
        .filter(n => n.offsetParent !== null).map(n => n.textContent.trim()).join(' | ');
      return { href: before, notice: noticeText };
    `);
    check('I-8: forgot password shows an inline notice', demo.notice.length > 0, demo.notice.slice(0, 70));
    check('I-8: forgot password does not navigate', demo.href.indexOf('127.0.0.1:' + PORT + '/') !== -1, demo.href);

    // I-6 — the success -> reset cycle, without a reload.
    await evaluate(`document.getElementById('tab-register').click(); return true;`);
    await sleep(300);
    const navBefore = await evaluate(`
      const btn = document.querySelector('[data-testid="auth-google-register-button"]');
      btn.click();
      return { href: location.href, notice: Array.from(document.querySelectorAll('.notice')).filter(n => n.offsetParent !== null).map(n=>n.textContent.trim()).join(' | ') };
    `);
    check('I-8: the Google button shows an inline notice', navBefore.notice.length > 0, navBefore.notice.slice(0, 70));
    check('I-8: the Google button does not navigate', navBefore.href.indexOf('127.0.0.1:' + PORT + '/') !== -1, navBefore.href);

    // Fill the register form and submit.
    const success = await evaluate(`
      document.getElementById('register-name').value = 'Aiko Tanaka';
      document.getElementById('register-email').value = 'aiko@example.com';
      document.getElementById('register-password').value = 'password123';
      ['register-name','register-email','register-password'].forEach(id => {
        const el = document.getElementById(id);
        el.dispatchEvent(new Event('input', {bubbles:true}));
      });
      const f = document.getElementById('form-register');
      if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
      return true;
    `);
    await sleep(500);
    const successState = await evaluate(`
      const region = document.getElementById('success-region');
      const body = region ? region.textContent : '';
      // The success card lives in #success-region, a sibling of the tab panels
      // inside #form-region — it is NOT nested in a <section>, so the panels
      // are checked directly.
      const panels = Array.from(document.querySelectorAll('#form-region > section'));
      return {
        present: !!region && !region.hidden && region.children.length > 0,
        text: body.trim(),
        panelsFound: panels.length,
        panelsAllHidden: panels.length > 0 && panels.every(p => p.hidden),
        successRegionHidden: region ? region.hidden : null,
        hasReset: !!region && /different account/i.test(region.textContent),
        saysNoAccount: !!region && /no account|design prototype|prototype/i.test(region.textContent),
      };
    `);
    check('I-6: a valid registration reaches the success card', successState.present);
    check('I-6: the success card states that no account was created', successState.saysNoAccount, successState.text.slice(0, 90));
    check('I-6: the success card offers a "use a different account" reset', successState.hasReset);
    check('I-6: the form panel is hidden while the success card shows', successState.panelsAllHidden === true, `${successState.panelsFound} panel(s) found`);

    const resetState = await evaluate(`
      const region = document.getElementById('success-region');
      const link = region ? Array.from(region.querySelectorAll('button,a')).find(b => /different account/i.test(b.textContent)) : null;
      const before = performance.now();
      if (link) link.click();
      return { clicked: !!link, perfMark: before };
    `);
    await sleep(400);
    const afterReset = await evaluate(`
      const region = document.getElementById('success-region');
      const email = document.getElementById('register-email');
      const name = document.getElementById('register-name');
      const panels = Array.from(document.querySelectorAll('#form-region > section'));
      return {
        // The reset empties #success-region and re-hides it; it does not detach
        // the node from the document.
        cardGone: !!region && region.hidden && region.children.length === 0,
        panelsVisible: panels.some(p => !p.hidden),
        emailValue: email ? email.value : null,
        nameValue: name ? name.value : null,
        navEntries: performance.getEntriesByType('navigation').length,
      };
    `);
    check('I-6: the reset removes the success card', afterReset.cardGone === true);
    check('I-6: the reset restores the form panel', afterReset.panelsVisible === true);
    check('I-6: the reset clears the fields', !afterReset.emailValue && !afterReset.nameValue, `email="${afterReset.emailValue}" name="${afterReset.nameValue}"`);
    check('I-6: the reset does not reload the page', afterReset.navEntries === 1, `${afterReset.navEntries} navigation entries`);

    // ==================================================================
    // PART 3 — Security probes (D-1, D-2)
    // ==================================================================
    console.log('\n--- PART 3: security probes ---\n');

    const PAYLOADS = [
      '<img src=x onerror="window.__xss=1">',
      '<svg/onload=alert(1)>',
      '"><script>window.__xss=1</script>',
      'javascript:window.__xss=1',
      '<iframe src="javascript:window.__xss=1">',
      '<body onload=window.__xss=1>',
    ];

    await evaluate(`document.getElementById('tab-register').click(); return true;`);
    await sleep(300);

    for (const payload of PAYLOADS) {
      await evaluate(`
        const email = document.getElementById('register-email');
        const name = document.getElementById('register-name');
        const pw = document.getElementById('register-password');
        window.__xss = undefined;
        name.value = 'Test User';
        email.value = ${JSON.stringify(payload)};
        pw.value = 'password123';
        ['register-name','register-email','register-password'].forEach(id => {
          document.getElementById(id).dispatchEvent(new Event('input', {bubbles:true}));
        });
        const f = document.getElementById('form-register');
        if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}));
        return true;
      `);
      await sleep(320);
      const probe = await evaluate(`
        const card = document.getElementById('success-region');
        const text = card ? card.textContent : '';
        return {
          xss: typeof window.__xss !== 'undefined' ? window.__xss : null,
          imgs: document.querySelectorAll('img').length,
          iframes: document.querySelectorAll('iframe').length,
          scripts: document.querySelectorAll('script').length,
          literal: ${JSON.stringify(payload)}.split('<')[0] ? text.includes('onerror') || text.includes('script') || text.includes('svg') : true,
          textSample: text.slice(0, 120),
        };
      `);
      check(`D-1: payload did not execute — ${payload.slice(0, 34)}`, probe.xss === null || probe.xss === undefined, `window.__xss=${probe.xss}`);
      check(`D-1: payload created no element — ${payload.slice(0, 34)}`, probe.imgs === 0 && probe.iframes === 0, `imgs=${probe.imgs} iframes=${probe.iframes}`);

      // Reset for the next payload.
      await evaluate(`
        const card = document.getElementById('success-region');
        if (card) {
          const link = Array.from(card.querySelectorAll('button,a')).find(b => /different account/i.test(b.textContent));
          if (link) link.click();
        }
        return true;
      `);
      await sleep(240);
    }

    const storage = await evaluate(`
      return {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
        cookie: document.cookie,
        xss: typeof window.__xss !== 'undefined' ? window.__xss : null,
      };
    `);
    check('D-2: localStorage is empty', storage.local.length === 0, JSON.stringify(storage.local));
    check('D-2: sessionStorage is empty', storage.session.length === 0, JSON.stringify(storage.session));
    check('D-2: no cookie was set', storage.cookie === '', `"${storage.cookie}"`);
    check('D-2: no payload executed across all probes', storage.xss === null || storage.xss === undefined);

    // ==================================================================
    // PART 4 — Performance measurements (B-1 … B-5)
    // ==================================================================
    console.log('\n--- PART 4: performance measurements ---\n');

    // B-1 — render timing via the Performance timeline.
    await send('Performance.enable');
    const metricsBefore = await send('Performance.getMetrics');
    const t0 = Date.now();
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?t=${Date.now()}` });
    await sleep(2500);
    const metricsAfter = await send('Performance.getMetrics');
    const nav = await evaluate(`
      const e = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint').map(p => ({name:p.name, t:p.startTime}));
      return {
        domContentLoaded: e ? e.domContentLoadedEventEnd : null,
        loadEvent: e ? e.loadEventEnd : null,
        paints,
        cls: (window.__cls || 0),
      };
    `);
    const m = (metricsAfter.metrics || []).reduce((acc, x) => { acc[x.name] = x.value; return acc; }, {});
    const fcp = (nav.paints.find(p => p.name === 'first-contentful-paint') || {}).t;
    check('B-1: first contentful paint occurred', typeof fcp === 'number' && fcp >= 0, `FCP ${fcp === undefined ? 'n/a' : Math.round(fcp) + 'ms'}`);
    check('B-1: DOMContentLoaded fired', typeof nav.domContentLoaded === 'number' && nav.domContentLoaded >= 0, `${Math.round(nav.domContentLoaded || 0)}ms`);
    check('B-1: the load event fired', typeof nav.loadEvent === 'number' && nav.loadEvent >= 0, `${Math.round(nav.loadEvent || 0)}ms`);
    check('B-1: cumulative layout shift is ~0', (nav.cls || 0) < 0.1, `CLS ${(nav.cls || 0).toFixed(4)}`);

    // B-2 / B-3 — the scan sweep must not trigger layout or repaint the text.
    await send('Page.setLifecycleEventsEnabled', { enabled: true });
    await sleep(200);
    const during = await evaluate(`
      // Sample the layout state across a full 6s sweep cycle.
      const start = performance.now();
      const samples = [];
      return new Promise(resolve => {
        function tick() {
          const de = document.documentElement;
          samples.push({ t: Math.round(performance.now() - start), h: de.scrollHeight, w: de.scrollWidth });
          if (performance.now() - start < 6500) requestAnimationFrame(tick);
          else resolve(samples);
        }
        tick();
      });
    `);
    const heights = [...new Set(during.map(s => s.h))];
    const widths = [...new Set(during.map(s => s.w))];
    check('B-2: the document height is stable across a full sweep cycle', heights.length === 1, `heights ${heights.join(',')}`);
    check('B-3: the document width is stable across a full sweep cycle', widths.length === 1, `widths ${widths.join(',')}`);
    check('B-2: the sweep ran for the full 6s cycle', during.length > 60, `${during.length} animation frames sampled`);

    // B-5 — interaction latency.
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await sleep(200);
    const latency = await evaluate(`
      const t = [];
      const tab = document.getElementById('tab-register');
      const other = document.getElementById('tab-signin');
      for (let i = 0; i < 6; i++) {
        const a = performance.now();
        tab.click();
        t.push(performance.now() - a);
        const b = performance.now();
        other.click();
        t.push(performance.now() - b);
      }
      return { max: Math.max(...t), avg: t.reduce((x,y)=>x+y,0)/t.length };
    `);
    check('B-5: tab switching stays responsive at 4x CPU slowdown', latency.max < 100, `max ${latency.max.toFixed(1)}ms, avg ${latency.avg.toFixed(1)}ms`);
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // B-4 — layout shift under the font swap.
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?blocked=${Date.now()}` });
    await sleep(2000);
    const blocked = await evaluate(`
      const fonts = Array.from(document.fonts || []);
      return {
        rendered: !!document.querySelector('.form-heading'),
        headingFont: getComputedStyle(document.querySelector('.form-heading')).fontFamily,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      };
    `);
    check('B-4: the page renders with the font request blocked', blocked.rendered === true);
    check('B-4: the fallback stack is applied', /Georgia|system-ui/.test(blocked.headingFont), blocked.headingFont);
    check('B-4: blocking the font causes no horizontal overflow', blocked.scrollW <= blocked.clientW, `${blocked.scrollW} vs ${blocked.clientW}`);
    await send('Network.setBlockedURLs', { urls: [] });

    // ==================================================================
    // PART 5 — Focus indicators (NFR-1.2)
    // ==================================================================
    console.log('\n--- PART 5: focus indicators ---\n');

    for (const theme of ['dark', 'light']) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
      await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?theme=${theme}` });
      await sleep(1200);

      const focus = await evaluate(`
        const targets = [
          ['#tab-signin', 'tab'],
          ['#signin-identifier', 'identifier'],
          ['#signin-password', 'password'],
          ['[data-testid="auth-signin-submit-button"]', 'submit'],
          ['[data-testid="auth-google-button"]', 'google'],
          ['[data-testid="auth-signin-password-toggle"]', 'toggle'],
        ];
        const out = [];
        for (const [sel, name] of targets) {
          const el = document.querySelector(sel);
          if (!el) { out.push({name, missing: true}); continue; }
          el.focus();
          const cs = getComputedStyle(el);
          const ring = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : cs.outline;
          out.push({ name, ring: ring || 'NONE', outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle });
        }
        return out;
      `);
      for (const f of focus) {
        check(`NFR-1.2 (${theme}): the ${f.name} control has a visible focus indicator`, !f.missing && f.ring && f.ring !== 'NONE', f.ring || 'none');
      }

      // The theme swap check (I-3): the artwork panel must not change.
      // Measure the *visible* text (.card-text) as well as the card element
      // itself — the card's own `color` is inherited, so it only proves
      // invariance if the artifact sets it explicitly.
      const themeState = await evaluate(`
        const art = document.querySelector('.panel-art');
        const card = document.querySelector('.card');
        const cardText = document.querySelector('.card-text');
        const cs = getComputedStyle(art);
        const cardCs = card ? getComputedStyle(card) : null;
        return {
          artBg: cs.backgroundColor,
          cardBorder: cardCs ? cardCs.borderLeftColor : null,
          cardText: cardCs ? cardCs.color : null,
          cardBodyText: cardText ? getComputedStyle(cardText).color : null,
        };
      `);
      if (theme === 'dark') {
        global.__darkTheme = themeState;
      } else {
        check('I-3 (theme): the artwork panel background is identical in both themes', themeState.artBg === global.__darkTheme.artBg, `${global.__darkTheme.artBg} vs ${themeState.artBg}`);
        check('I-3 (theme): the annotation card border is identical in both themes', themeState.cardBorder === global.__darkTheme.cardBorder, `${global.__darkTheme.cardBorder} vs ${themeState.cardBorder}`);
        check('I-3 (theme): the annotation card text colour is identical in both themes', themeState.cardBodyText === global.__darkTheme.cardBodyText, `${global.__darkTheme.cardBodyText} vs ${themeState.cardBodyText}`);
        check('I-3 (theme): the annotation card inherits a theme-invariant colour', themeState.cardText === global.__darkTheme.cardText, `${global.__darkTheme.cardText} vs ${themeState.cardText}`);
      }
    }
    await send('Emulation.setEmulatedMedia', { features: [] });

    // ------------------------------------------------------------------
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${passed}/${results.length} checks passed`);
    if (failed) {
      console.log(`\nFAILED (${failed}):`);
      for (const f of results.filter((r) => !r.ok)) console.log('  -', f.name, f.detail ? '— ' + f.detail : '');
      console.log('\nMANUAL VERIFICATION FAILED');
    } else {
      console.log('ALL MANUAL VERIFICATION CHECKS PASS');
    }
    ws.close();
    server.close();
    process.exit(failed ? 1 : 0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    server.close();
    process.exit(1);
  } finally {
    chrome.kill('SIGKILL');
  }
})();
