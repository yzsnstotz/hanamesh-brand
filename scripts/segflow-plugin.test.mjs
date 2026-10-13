import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, realpath, mkdir, writeFile} from 'node:fs/promises';
import {resolve, relative, isAbsolute, join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// PRODUCT ONLY: program-owned normal Desktop installation and composition.
// No application startup, package installation, profile edits or mocked pages.
const slots = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
const peers = ['ui-renderer', 'ui-sidebar', 'ui-conversation', 'locale', 'ui-theme']
  .map(name => '@deepseek-ai/dsh-client-' + name);
const scenarios = ['light', 'dark', 'unload', 'delayed', 'redeclared',
  ...slots.map(slot => 'missing:' + slot), 'incompatible:kind', 'incompatible:scope'];
const hash = data => createHash('sha256').update(data).digest('hex');
let browser, inputs, output;

test.before(async () => {
  assert.ok(process.env.SEGFLOW_ENV_DIR, 'PRODUCT_ENVIRONMENT: SEGFLOW_ENV_DIR required for product verify only');
  assert.match(process.env.SEGFLOW_PORT_CLIENT ?? '', /^\d+$/,
    'CLIENT_ASSEMBLY: SEGFLOW_PORT_CLIENT must be supplied by the program');
  const root = await realpath(process.env.SEGFLOW_ENV_DIR);
  // Proposed module-owned public test input, specified in product-inputs.md.
  // It contains normal operations/locators and installed paths, never results.
  inputs = JSON.parse(await readFile(join(root, 'hanamesh-brand-inputs.json'), 'utf8'));
  assert.equal(inputs.schema, 1);
  assert.equal(inputs.upstreamTag, 'dsh-v0.2.0-rc.2');
  assert.equal(inputs.upstreamSha, '639ed015397290b3745d163aafe02ffee4aa3f84');
  assert.deepEqual(Object.keys(inputs.cases).sort(), [...scenarios].sort());
  async function contained(path) {
    const value = await realpath(path), rel = relative(root, value);
    assert.ok(rel && rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel),
      'CLIENT_ASSEMBLY: installed package must belong to this program run');
    return value;
  }
  inputs.installedPackageDir = await contained(inputs.installedPackageDir);
  const pkg = JSON.parse(await readFile(join(inputs.installedPackageDir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'hanamesh-brand');
  assert.deepEqual(Object.keys(pkg.dsh), ['client']);
  assert.equal(pkg.exports['./client'].default, './lib/client.js');
  assert.equal(pkg.exports['./client'].node, './lib/client/index.js');
  assert.equal(pkg.exports['./client'].types, './lib/client/index.d.ts');
  assert.equal(inputs.artifact.sourceSha, execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
  }).trim(), 'candidate artifact must be this verified module version');
  const tarball = await contained(inputs.artifact.tarball);
  for (const path of ['lib/client.js', 'lib/client/index.js', 'lib/client/index.d.ts',
    'lib/client/Brand.js', 'lib/client/Brand.d.ts']) {
    const bytes = await readFile(join(inputs.installedPackageDir, path));
    assert.equal(hash(bytes), inputs.artifact.files[path], 'candidate publication bytes: ' + path);
    assert.deepEqual(bytes, execFileSync('tar', ['-xOf', tarball, 'package/' + path]),
      'normal installed files equal the actual submitted tgz: ' + path);
  }
  assert.equal(hash(await readFile(tarball)), inputs.artifact.sha256);
  for (const peer of peers) {
    const dir = await contained(inputs.peerPackageDirs[peer]);
    const actual = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    assert.equal(actual.name, peer); assert.equal(actual.version, '0.2.0-rc.2');
    assert.equal(pkg.peerDependencies[peer], actual.version);
    inputs.peerPackageDirs[peer] = dir;
  }
  output = join(root, 'hanamesh-brand-evidence'); await mkdir(output, {recursive: true});
  const {chromium} = await import('playwright-core'); // proposed dev-only test driver
  browser = await chromium.connectOverCDP('http://127.0.0.1:' + process.env.SEGFLOW_PORT_CLIENT);
});
test.after(async () => { await browser?.close(); }); // disconnect our CDP client, not the service

async function pageFor(name) {
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
  assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification?.inspect), 'function',
    'BRAND_LOAD: candidate observation face must come from the normally installed plugin');
  await loadedBytes(page, spec);
  return {page, spec};
}
async function loadedBytes(page, spec) {
  const session = await page.context().newCDPSession(page), parsed = [];
  session.on('Debugger.scriptParsed', value => parsed.push(value));
  try {
    await session.send('Debugger.enable');
    const packages = [['hanamesh-brand', inputs.installedPackageDir],
      ...peers.map(peer => [peer, inputs.peerPackageDirs[peer]])];
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
async function inspect(page) { return page.evaluate(() => window.hanameshBrandVerification.inspect()); }
function clear(state) {
  assert.deepEqual(state.owned, {slots: 0, dictionaries: 0, themeLayers: 0, waits: 0});
  assert.equal(state.otherContributionsPreserved, true);
}
async function appearance(page, spec, palette) {
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
}
async function save(name, page, state) {
  await writeFile(join(output, name.replaceAll(':', '-') + '.json'), JSON.stringify({
    url: page.url(), targetId: inputs.cases[name].targetId, upstreamTag: inputs.upstreamTag,
    artifact: inputs.artifact, resolved: inputs.peerPackageDirs, state,
  }, null, 2) + '\n');
  await page.screenshot({path: join(output, name.replaceAll(':', '-') + '.png'), fullPage: true});
}
// PM supplies normal UI operations, not JS/private imports or generated outcomes.
async function action(page, step) {
  assert.deepEqual(Object.keys(step).sort(), ['name', 'role']);
  const control = page.getByRole(step.role, {name: step.name, exact: true});
  assert.equal(await control.count(), 1); assert.ok(await control.isVisible());
  await control.click();
}
for (const palette of ['light', 'dark']) test('normal Desktop brand appearance and actual API: ' + palette, async () => {
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
async function observe(page, name, signal) {
  const binding = 'hanameshBrandObserve_' + name.replaceAll(':', '_').replaceAll('.', '_');
  const states = [], pending = new Set();
  const abort = () => { for (const wait of pending) wait.reject(signal.reason ?? Error('verification cancelled')); pending.clear(); };
  signal.addEventListener('abort', abort, {once: true});
  await page.exposeFunction(binding, state => {
    states.push(state);
    for (const wait of pending) if (wait.matches(state, states)) { pending.delete(wait); wait.resolve(state); }
  });
  await page.evaluate(binding => {
    const listener = event => window[binding](event.detail);
    window[binding + '_listener'] = listener;
    window.addEventListener('hanamesh-brand:lifecycle', listener);
  }, binding);
  return {states,
    completed(matches) {
      const state = states.find(state => matches(state, states));
      if (state) return Promise.resolve(state);
      if (signal.aborted) return Promise.reject(signal.reason);
      return new Promise((resolve, reject) => pending.add({matches, resolve, reject}));
    },
    async close() {
      signal.removeEventListener('abort', abort);
      for (const wait of pending) wait.reject(Error('observation closed')); pending.clear();
      await page.evaluate(binding => {
        window.removeEventListener('hanamesh-brand:lifecycle', window[binding + '_listener']);
        delete window[binding + '_listener']; delete window[binding];
      }, binding);
    },
  };
}
test('normal disable/unload restores original appearance and releases brand resources', async t => {
  const {page, spec} = await pageFor('unload');
  assert.equal((await inspect(page)).phase, 'active');
  assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: normal disable UI operations required');
  assert.deepEqual(Object.keys(spec.originalText).sort(), [...slots].sort());
  assert.equal(typeof spec.originalColor, 'string');
  const observation = await observe(page, 'unload', t.signal);
  try {
    for (const step of spec.actions) await action(page, step);
    // Wait for the actual completed-disposal event, not immediate zero or a timer.
    const disposed = await observation.completed(state => state.phase === 'disposed'); clear(disposed);
    assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined');
    assert.equal(await page.locator(spec.locators.themeRoot).evaluate(node =>
      getComputedStyle(node).getPropertyValue('--dsw-alias-state-business-primary').trim()), spec.originalColor);
    for (const [slot, original] of Object.entries(spec.originalText))
      assert.equal((await page.locator(spec.locators[slot]).textContent()).trim(), original);
    for (const selector of spec.preservedControls) assert.ok(await page.locator(selector).isVisible());
    await save('unload', page, disposed);
  } finally { await observation.close(); }
});
for (const name of scenarios.filter(name => name.startsWith('missing:') || name.startsWith('incompatible:')))
  test('normal assembled composition explicitly rejects ' + name, async t => {
    const {page, spec} = await pageFor(name);
    assert.equal((await inspect(page)).phase, 'active', 'negative starts from normal candidate composition');
    assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: normal owner configuration operations required');
    const observation = await observe(page, name, t.signal);
    try {
      for (const step of spec.actions) await action(page, step);
      let result;
      if (name.startsWith('missing:')) {
        await observation.completed(state => state.phase === 'waiting' && state.owned.slots < 3);
        result = await page.evaluate(() => {
          try { window.hanameshBrandVerification.validate(); return {accepted: true}; }
          catch (error) { return {accepted: false, code: error.code, message: error.message,
            slot: error.slot, actual: error.actual, expected: error.expected, state: error.brandState}; }
        });
      } else {
        const state = await observation.completed(state => state.phase === 'rejected');
        result = {...state.error, accepted: false, state};
      }
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
      assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined');
      await save(name, page, result);
    } finally { await observation.close(); }
  });
for (const name of ['delayed', 'redeclared']) test('legal public declaration lifecycle: ' + name, async t => {
  const {page, spec} = await pageFor(name);
  const initial = await inspect(page);
  assert.equal(initial.phase, name === 'delayed' ? 'waiting' : 'active');
  const observation = await observe(page, name, t.signal);
  try {
    assert.ok(spec.actions?.length, 'CLIENT_ASSEMBLY: normal provider operations required');
    for (const step of spec.actions) await action(page, step);
    if (name === 'redeclared')
      await observation.completed(state => state.phase === 'waiting' && state.owned.slots < 3);
    const current = await observation.completed((state, history) => state.phase === 'active'
      && (name === 'delayed' || history.indexOf(state) > history.findLastIndex(row => row.phase === 'waiting')));
    assert.equal(observation.states.some(state => state.phase === 'rejected'), false);
    assert.equal(current.owned.slots, 3); assert.equal(current.owned.waits, 3);
    await appearance(page, spec, spec.palette); await save(name, page, [initial, ...observation.states]);
  } finally { await observation.close(); }
});
