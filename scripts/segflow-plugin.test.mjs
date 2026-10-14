import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, realpath, mkdir, writeFile} from 'node:fs/promises';
import {resolve, relative, isAbsolute, join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {budgets, DiagnosticBudget} from '../test/diagnostic-budget.mjs';

// PRODUCT ONLY: program-owned normal Desktop installation and composition.
// No application startup, package installation, profile edits or mocked pages.
const slots = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
const peers = ['ui-renderer', 'ui-sidebar', 'ui-conversation', 'locale', 'ui-theme']
  .map(name => '@deepseek-ai/dsh-client-' + name);
const scenarios = ['light', 'dark', 'unload', 'delayed', 'redeclared',
  ...slots.map(slot => 'missing:' + slot), 'incompatible:kind', 'incompatible:scope', ...slots.map(slot => 'release-missing:' + slot)];
const hash = data => createHash('sha256').update(data).digest('hex');
let browser, inputs, output, activeSignal;
let configuration = budgets(), lastEvidence = {};
let diagnostic = new DiagnosticBudget(configuration, () => lastEvidence);
function ui(label, operation) { return diagnostic.run('uiOperationMs', label, operation, activeSignal); }
function productTest(label, operation) {
  test(label, async t => {
    let operationDone;
    try {
      await diagnostic.run('productCaseMs', label, async signal => {
        activeSignal = signal;
        operationDone = Promise.resolve().then(() => operation({signal}));
        return operationDone;
      }, t.signal);
    } catch (error) {
      if (output) await writeFile(join(output, 'unfinished-' + label.replaceAll(/[^a-zA-Z0-9_-]/g, '_') + '.json'),
        JSON.stringify({code: error.code, message: error.message, budget: error.budget,
          budgetMs: error.budgetMs, evidence: error.evidence ?? lastEvidence, cause: error.cause?.message}, null, 2) + '\n');
      // Abort in-flight calls by disconnecting our transport, never stop CLIENT.
      if (browser) {
        try { await diagnostic.run('teardownMs', 'CDP disconnect after failed/cancelled case', () => browser.close()); }
        catch (release) { throw new AggregateError([error, release], 'CASE_AND_CDP_RELEASE_FAILED'); }
      }
      if (operationDone) {
        try { await diagnostic.run('teardownMs', 'finish cancelled case cleanup', () => operationDone.catch(() => {})); }
        catch (release) { throw new AggregateError([error, release], 'CASE_CLEANUP_UNFINISHED'); }
      }
      throw error;
    } finally { activeSignal = undefined; }
  });
}

test.before(async () => {
  assert.ok(process.env.SEGFLOW_ENV_DIR, 'PRODUCT_ENVIRONMENT: SEGFLOW_ENV_DIR required for product verify only');
  assert.match(process.env.SEGFLOW_PORT_CLIENT ?? '', /^\d+$/,
    'CLIENT_ASSEMBLY: SEGFLOW_PORT_CLIENT must be supplied by the program');
  const root = await realpath(process.env.SEGFLOW_ENV_DIR);
  // Proposed module-owned public test input, specified in product-inputs.md.
  // It contains normal operations/locators and installed paths, never results.
  inputs = JSON.parse(await readFile(join(root, 'hanamesh-brand-inputs.json'), 'utf8'));
  assert.equal(inputs.schema, 1);
  configuration = budgets(inputs.diagnosticBudgets);
  diagnostic = new DiagnosticBudget(configuration, () => lastEvidence);
  console.log('hanamesh-brand diagnostic budgets (ms)', JSON.stringify(configuration));
  assert.equal(inputs.upstreamTag, 'dsh-v0.2.0-rc.2');
  assert.equal(inputs.upstreamSha, '639ed015397290b3745d163aafe02ffee4aa3f84');
  assert.deepEqual(Object.keys(inputs.cases).sort(), [...scenarios].sort());
  async function contained(path) {
    const value = await realpath(path), rel = relative(root, value);
    assert.ok(rel && rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel),
      'CLIENT_ASSEMBLY: installed package must belong to this program run');
    return value;
  }
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
  }).trim();
  // Both products are normal tgz installs of this candidate: release has the
  // observer compiled out; verification adds only the read-only observation.
  for (const candidate of [inputs, inputs.release]) {
    assert.ok(candidate?.artifact, 'CLIENT_ASSEMBLY: normal release and verification artifacts required');
    candidate.installedPackageDir = await contained(candidate.installedPackageDir);
    const pkg = JSON.parse(await readFile(join(candidate.installedPackageDir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'hanamesh-brand'); assert.deepEqual(Object.keys(pkg.dsh), ['client']);
    assert.equal(pkg.exports['./client'].default, './lib/client.js');
    assert.equal(pkg.exports['./client'].node, './lib/client/index.js');
    assert.equal(pkg.exports['./client'].types, './lib/client/index.d.ts');
    assert.equal(candidate.artifact.sourceSha, sourceSha, 'candidate artifact must be this module version');
    const tarball = await contained(candidate.artifact.tarball);
    for (const path of ['lib/client.js', 'lib/client/index.js', 'lib/client/index.d.ts',
      'lib/client/Brand.js', 'lib/client/Brand.d.ts']) {
      const bytes = await readFile(join(candidate.installedPackageDir, path));
      assert.equal(hash(bytes), candidate.artifact.files[path], 'candidate publication bytes: ' + path);
      assert.deepEqual(bytes, execFileSync('tar', ['-xOf', tarball, 'package/' + path]),
        'normal installed bytes equal actual submitted tgz: ' + path);
    }
    assert.equal(hash(await readFile(tarball)), candidate.artifact.sha256);
    for (const peer of peers) {
      const dir = await contained(candidate.peerPackageDirs[peer]);
      const actual = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      assert.equal(actual.name, peer); assert.equal(actual.version, '0.2.0-rc.2');
      assert.equal(pkg.peerDependencies[peer], actual.version);
      candidate.peerPackageDirs[peer] = dir;
    }
  }
  output = join(root, 'hanamesh-brand-evidence'); await mkdir(output, {recursive: true});
  const {chromium} = await import('playwright-core'); // proposed dev-only test driver
  try { browser = await diagnostic.run('cdpConnectMs', 'normal CLIENT CDP connection', async signal => {
    const connected = await chromium.connectOverCDP('http://127.0.0.1:' + process.env.SEGFLOW_PORT_CLIENT,
      {timeout: configuration.cdpConnectMs});
    if (signal.aborted) {
      await diagnostic.run('teardownMs', 'late CDP connection release', () => connected.close());
      throw signal.reason;
    }
    return connected;
  });
  } catch (error) {
    await writeFile(join(output, 'unfinished-CDP.json'), JSON.stringify({code: error.code, message: error.message,
      budget: error.budget, budgetMs: error.budgetMs, evidence: error.evidence ?? lastEvidence,
      cause: error.cause?.message}, null, 2) + '\n');
    throw error;
  }
  for (const context of browser.contexts()) {
    context.setDefaultTimeout(configuration.uiOperationMs);
    context.setDefaultNavigationTimeout(configuration.uiOperationMs);
  }
});
test.after(async () => {
  if (browser) await diagnostic.run('teardownMs', 'final CDP disconnect', () => browser.close());
  assert.deepEqual(diagnostic.resources, {timers: 0, operations: 0}, 'all test deadlines and operations released');
}); // disconnect our CDP client, not the service

async function pageFor(name) { return ui('product page identity/ready: ' + name, async () => {
  const spec = inputs.cases[name];
  assert.ok(spec.targetId && spec.ready && spec.locators, 'CLIENT_ASSEMBLY: incomplete normal case input ' + name);
  const matches = [];
  for (const context of browser.contexts()) for (const page of context.pages()) {
    const session = await context.newCDPSession(page);
    try {
      const {targetInfo} = await session.send('Target.getTargetInfo');
      if (targetInfo.targetId === spec.targetId && targetInfo.type === 'page') matches.push(page);
    } finally { await session.detach(); }
  }
  assert.equal(matches.length, 1, 'CLIENT_ASSEMBLY: program-selected Desktop target ' + name);
  const page = matches[0];
  assert.equal(new URL(page.url()).protocol, 'dsh-app:');
  assert.equal(new URL(page.url()).host, 'app');
  assert.equal(new URL(page.url()).pathname, '/');
  assert.ok(spec.preservedControls.length >= 2, 'welcome/sidebar observations must be supplied');
  // Ready is a real, visible application surface chosen by PM, not a CDP page count.
  assert.ok(await page.locator(spec.ready).isVisible(), 'CLIENT_ASSEMBLY: normal application surface absent ' + name);
  assert.equal(await page.locator('[data-dsh-boot]').count(), 0, 'CLIENT_ASSEMBLY: boot has not handed off');
  assert.equal(spec.release ?? false, name.startsWith('release-missing:'));
  if (name.startsWith('release-missing:'))
    assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined', 'release mode has no test global');
  else assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification?.inspect), 'function',
    'BRAND_LOAD: candidate observation face must come from the normally installed plugin');
  lastEvidence = {case: name, targetId: spec.targetId, url: page.url(), stage: 'normal-frame-visible'};
  await loadedBytes(page, spec);
  return {page, spec};
}); }
async function loadedBytes(page, spec) {
  const session = await page.context().newCDPSession(page), parsed = [];
  session.on('Debugger.scriptParsed', value => parsed.push(value));
  try {
    await session.send('Debugger.enable');
    const candidate = spec.release ? inputs.release : inputs;
    const packages = [['hanamesh-brand', candidate.installedPackageDir],
      ...peers.map(peer => [peer, candidate.peerPackageDirs[peer]])];
    for (const [name, dir] of packages) {
      const url = spec.bundleUrls[name];
      assert.ok(url && new URL(url).protocol === 'dsh-app:', 'CLIENT_ASSEMBLY: normal bundle URL ' + name);
      const rows = parsed.filter(row => row.url === url);
      assert.equal(rows.length, 1, 'BRAND_LOAD: one actually executed normal bundle ' + name);
      const {scriptSource} = await session.send('Debugger.getScriptSource', {scriptId: rows[0].scriptId});
      const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      const path = name === 'hanamesh-brand' ? pkg.exports['./client'].default : 'lib/client.js';
      assert.equal(hash(scriptSource), hash(await readFile(join(dir, path))), 'BRAND_LOAD: resolved bytes ' + name);
    }
  } finally { await session.detach(); }
}
async function inspect(page) { return ui('read actual brand state', async () => {
  const state = await page.evaluate(() => window.hanameshBrandVerification.inspect());
  lastEvidence = {...lastEvidence, state}; return state;
}); }
function clear(state) {
  assert.deepEqual(state.owned, {slots: 0, dictionaries: 0, themeLayers: 0, waits: 0});
  assert.equal(state.otherContributionsPreserved, true);
}
async function appearance(page, spec, palette) { return ui('actual brand appearance', async () => {
  for (const [slot, text] of slots.map((slot, index) => [slot, ['H', 'HanaMesh', 'H'][index]])) {
    const node = page.locator(spec.locators[slot]);
    assert.equal(await node.count(), 1, 'visible slot occupant ' + slot);
    assert.ok(await node.isVisible()); assert.equal((await node.textContent()).trim(), text);
  }
  const color = await page.locator(spec.locators.themeRoot).evaluate(node =>
    getComputedStyle(node).getPropertyValue('--dsw-alias-state-business-primary').trim());
  assert.equal(color, palette === 'light' ? '#7059e8' : '#a99aff');
  for (const selector of spec.preservedControls) assert.ok(await page.locator(selector).isVisible(),
    'original welcome/sidebar control remains available: ' + selector);
}); }
async function save(name, page, state) { return ui('actual screenshot/evidence: ' + name, async () => {
  await writeFile(join(output, name.replaceAll(':', '-') + '.json'), JSON.stringify({
    url: page.url(), targetId: inputs.cases[name].targetId, upstreamTag: inputs.upstreamTag,
    artifact: (inputs.cases[name].release ? inputs.release : inputs).artifact,
    resolved: (inputs.cases[name].release ? inputs.release : inputs).peerPackageDirs, state,
  }, null, 2) + '\n');
  await page.screenshot({path: join(output, name.replaceAll(':', '-') + '.png'), fullPage: true, timeout: configuration.uiOperationMs});
}); }
// PM supplies normal UI operations, not JS/private imports or generated outcomes.
async function action(page, step) { return ui('normal UI operation: ' + step.name, async () => {
  assert.deepEqual(Object.keys(step).sort(), ['name', 'role']);
  const control = page.getByRole(step.role, {name: step.name, exact: true});
  assert.equal(await control.count(), 1); assert.ok(await control.isVisible());
  await control.click({timeout: configuration.uiOperationMs});
}); }
for (const palette of ['light', 'dark']) productTest('normal Desktop brand appearance and actual API: ' + palette, async () => {
  const {page, spec} = await pageFor(palette);
  const state = await inspect(page);
  assert.equal(state.phase, 'active');
  assert.deepEqual(state.owned, {slots: 3, dictionaries: 1, themeLayers: 1, waits: 3});
  for (const key of slots) {
    const node = state.declarations.find(node => node.name === key);
    assert.ok(node); assert.equal(node.kind, 'single'); assert.equal(node.scope, 'root');
    assert.ok(node.declaredBy, 'real provider declaration owner');
  }
  assert.equal(state.locale, palette === 'light' ? 'en' : 'zh');
  assert.equal(state.brandHeadline, palette === 'light'
    ? 'HanaMesh, connect your creations' : 'HanaMesh，让创造相连');
  await appearance(page, spec, palette); await save(palette, page, state);
});
async function observe(page, name, signal, eventName = 'hanamesh-brand:lifecycle') {
  const binding = 'hanameshBrandObserve_' + name.replaceAll(/[^a-zA-Z0-9]/g, '_');
  const states = [], pending = new Set();
  let parsingError;
  let session, closed = false;
  const receive = event => {
    if (closed || event.name !== binding) return;
    let detail;
    try { detail = JSON.parse(event.payload); } catch (error) {
      parsingError = error;
      for (const wait of pending) wait.reject(error); pending.clear(); return;
    }
    const state = eventName === 'hanamesh-brand:rejected' ? {...detail.state, error: detail} : detail;
    states.push(state); lastEvidence = {...lastEvidence, state};
    for (const wait of pending) if (wait.matches(state, states)) { pending.delete(wait); wait.resolve(state); }
  };
  const abort = () => {
    // Stop receiving and reject local waiters immediately. Remote cleanup is
    // awaited by close() under its own budget even when the case was cancelled.
    closed = true; session?.off('Runtime.bindingCalled', receive);
    for (const wait of pending) wait.reject(signal.reason ?? Error('verification cancelled')); pending.clear();
  };
  async function close() {
    closed = true; signal.removeEventListener('abort', abort);
    session?.off('Runtime.bindingCalled', receive);
    for (const wait of pending) wait.reject(Error('observation closed')); pending.clear();
    if (!session) return;
    // Runtime.removeBinding releases the CDP subscription; detach also releases
    // its agent if the renderer became unavailable. Only test-owned keys removed.
    const results = await Promise.allSettled([
      diagnostic.run('teardownMs', 'remove DOM subscription: ' + name, () => page.evaluate(({binding, eventName}) => {
        window.removeEventListener(eventName, window[binding + '_listener']);
        delete window[binding + '_listener']; delete window[binding];
      }, {binding, eventName})),
      diagnostic.run('teardownMs', 'remove CDP binding: ' + name, () => session.send('Runtime.removeBinding', {name: binding})),
    ]);
    await diagnostic.run('teardownMs', 'detach observation CDP session: ' + name, () => session.detach());
    const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
    if (errors.length) throw new AggregateError(errors, 'OBSERVATION_RELEASE_FAILED: ' + name);
  }
  signal.addEventListener('abort', abort, {once: true});
  try {
    await ui('install read-only event subscription: ' + name, async child => {
      session = await page.context().newCDPSession(page);
      if (child.aborted) { await session.detach(); throw child.reason; }
      session.on('Runtime.bindingCalled', receive);
      await session.send('Runtime.enable');
      await session.send('Runtime.addBinding', {name: binding});
      if (child.aborted) throw child.reason;
      await page.evaluate(({binding, eventName}) => {
        const listener = event => window[binding](JSON.stringify(event.detail));
        window[binding + '_listener'] = listener; window.addEventListener(eventName, listener);
      }, {binding, eventName});
      if (child.aborted || closed) {
        await close(); throw child.reason ?? Error('observation cancelled during installation');
      }
    });
  } catch (error) {
    try { await close(); } catch (release) { throw new AggregateError([error, release], 'OBSERVATION_SETUP_FAILED'); }
    throw error;
  }
  return {states, close,
    completed(matches) {
      if (parsingError) return Promise.reject(parsingError);
      if (signal.aborted || closed) return Promise.reject(signal.reason ?? Error('observation closed'));
      const state = states.find(state => matches(state, states));
      if (state) return Promise.resolve(state);
      return diagnostic.run('lifecycleSignalMs', 'actual completed lifecycle signal: ' + name, child =>
        new Promise((resolve, reject) => {
          const abort = () => { pending.delete(wait); reject(child.reason); };
          const wait = {matches, resolve: state => { child.removeEventListener('abort', abort); resolve(state); },
            reject: error => { child.removeEventListener('abort', abort); reject(error); }};
          if (child.aborted) { reject(child.reason); return; }
          pending.add(wait); child.addEventListener('abort', abort, {once: true});
        }), signal);
    },
  };
}
async function withObservation(observation, operation) {
  let failure;
  try { return await operation(); } catch (error) { failure = error; throw error; }
  finally {
    try { await observation.close(); } catch (release) {
      if (failure) throw new AggregateError([failure, release], 'CASE_AND_OBSERVATION_RELEASE_FAILED');
      throw release;
    }
  }
}
function dialogs(page) {
  const messages = [], failures = [], pending = new Set();
  const listener = dialog => {
    messages.push(dialog.message());
    const done = diagnostic.run('uiOperationMs', 'dismiss native brand error dialog', () => dialog.dismiss(), activeSignal)
      .catch(error => failures.push(error)).finally(() => pending.delete(done));
    pending.add(done);
  };
  page.on('dialog', listener);
  return {messages, failures, completed: () => Promise.all([...pending]),
    async close() { page.off('dialog', listener); await Promise.all([...pending]); }};
}
productTest('normal disable/unload restores original appearance and releases brand resources', async t => {
  const {page, spec} = await pageFor('unload');
  assert.equal((await inspect(page)).phase, 'active');
  assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: normal disable UI operations required');
  assert.deepEqual(Object.keys(spec.originalText).sort(), [...slots].sort());
  assert.equal(typeof spec.originalColor, 'string');
  const observation = await observe(page, 'unload', t.signal);
  await withObservation(observation, async () => {
    for (const step of spec.actions) await action(page, step);
    // Wait for the actual completed-disposal event, not immediate zero or a timer.
    const disposed = await observation.completed(state => state.phase === 'disposed'); clear(disposed);
    await ui('unload actual restored UI', async () => {
    assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined');
    assert.equal(await page.locator(spec.locators.themeRoot).evaluate(node =>
      getComputedStyle(node).getPropertyValue('--dsw-alias-state-business-primary').trim()), spec.originalColor);
    for (const [slot, original] of Object.entries(spec.originalText))
      assert.equal((await page.locator(spec.locators[slot]).textContent()).trim(), original);
    for (const selector of spec.preservedControls) assert.ok(await page.locator(selector).isVisible());
    });
    await save('unload', page, disposed);
  });
});
for (const name of scenarios.filter(name => name.startsWith('missing:') || name.startsWith('incompatible:')))
  productTest('normal assembled composition explicitly rejects ' + name, async t => {
    const {page, spec} = await pageFor(name);
    assert.equal((await inspect(page)).phase, 'active', 'negative starts from normal candidate composition');
    assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: normal owner configuration operations required');
    const observation = await observe(page, name, t.signal, 'hanamesh-brand:rejected');
    const native = dialogs(page);
    try { await withObservation(observation, async () => {
      for (const step of spec.actions) await action(page, step);
      let result;
      const state = await observation.completed(state => state.phase === 'rejected');
      result = {...state.error, accepted: false, state};
      assert.equal(result.accepted, false); assert.ok(result.message.includes(result.slot));
      if (name.startsWith('missing:')) {
        assert.equal(result.code, 'BRAND_SLOT_MISSING'); assert.equal(result.slot, name.slice(8));
      } else {
        const field = name.split(':')[1];
        assert.equal(result.code, 'BRAND_SLOT_INCOMPATIBLE'); assert.equal(result.slot, slots[2]);
        assert.equal(result.actual[field], field === 'kind' ? 'chain' : 'session');
        assert.deepEqual(result.expected, {kind: 'single', scope: 'root'});
      }
      assert.equal(result.state.phase, 'rejected'); clear(result.state);
      await native.completed();
      assert.equal(native.failures.length, 0); assert.equal(native.messages.length, 1);
      assert.ok(native.messages[0].includes(result.slot));
      await ui('rejection removes observation face', async () =>
        assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined'));
      await save(name, page, result);
    }); } finally { await native.close(); }
  });
for (const name of ['delayed', 'redeclared']) productTest('legal public declaration lifecycle: ' + name, async t => {
  const {page, spec} = await pageFor(name);
  const initial = await inspect(page);
  assert.equal(initial.phase, name === 'delayed' ? 'waiting' : 'active');
  assert.equal(initial.compatibilityCheck, 'passed', 'pending after a completed formal first commit is legal');
  const observation = await observe(page, name, t.signal);
  await withObservation(observation, async () => {
    assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: normal provider operations required');
    for (const step of spec.actions) await action(page, step);
    if (name === 'redeclared')
      await observation.completed(state => state.phase === 'waiting' && state.owned.slots < 3);
    const current = await observation.completed((state, history) => state.phase === 'active'
      && (name === 'delayed' || history.indexOf(state) > history.findLastIndex(row => row.phase === 'waiting')));
    assert.equal(observation.states.some(state => state.phase === 'rejected'), false);
    assert.equal(current.owned.slots, 3); assert.equal(current.owned.waits, 3);
    await appearance(page, spec, spec.palette); await save(name, page, [initial, ...observation.states]);
  });
});

for (const slot of slots) productTest('release mode normal React commit rejects missing slot without observer: ' + slot, async t => {
  const name = 'release-missing:' + slot, {page, spec} = await pageFor(name);
  await appearance(page, spec, spec.palette);
  assert.deepEqual(Object.keys(spec.originalText).sort(), [...slots].sort());
  assert.equal(typeof spec.originalColor, 'string');
  const native = dialogs(page);
  let observation;
  try {
    observation = await observe(page, name, t.signal, 'hanamesh-brand:rejected');
    await withObservation(observation, async () => {
      assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: disable provider and normally re-enable brand required');
      // Same production first-commit behavior; no probe, validate call, private
      // loader import or synthesized slot/DOM event is invoked by this suite.
      for (const step of spec.actions) await action(page, step);
      const state = await observation.completed(state => state.phase === 'rejected');
      assert.equal(state.error.code, 'BRAND_SLOT_MISSING'); assert.equal(state.error.slot, slot);
      assert.ok(state.error.message.includes(slot)); clear(state);
      await native.completed();
      assert.equal(native.failures.length, 0); assert.equal(native.messages.length, 1);
      assert.ok(native.messages[0].includes(slot));
      await ui('release rejection leaves no observer and restores actual UI', async () => {
        assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined');
        assert.equal(await page.locator(spec.locators.themeRoot).evaluate(node =>
          getComputedStyle(node).getPropertyValue('--dsw-alias-state-business-primary').trim()), spec.originalColor);
        for (const [key, original] of Object.entries(spec.originalText))
          assert.equal((await page.locator(spec.locators[key]).textContent()).trim(), original);
        for (const selector of spec.preservedControls) assert.ok(await page.locator(selector).isVisible());
      });
      await save(name, page, state);
    });
  } finally { await native.close(); }
});
