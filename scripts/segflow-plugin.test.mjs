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
const HOST = Object.freeze({upstreamSha: 'd743267388641bc76f17c45ce8b4c231aed1d32c',
  desktop: '0.2.1-alpha.2', dsh: '0.2.1-alpha.2', cordis: '4.0.5-alpha.1', pnpm: '11.28.5'});
// Historical PACKAGE SDK is a reference, never a claimed Desktop identity.
const SDK_REFERENCE = Object.freeze({tag: 'dsh-v0.2.0-rc.2', sha: '639ed015397290b3745d163aafe02ffee4aa3f84'});
const hash = data => createHash('sha256').update(data).digest('hex');
let browser, inputs, output, activeSignal, resetCase;
let configuration = budgets(), lastEvidence = {};
let diagnostic = new DiagnosticBudget(configuration, () => lastEvidence);
function ui(label, operation) { return diagnostic.run('uiOperationMs', label, operation, activeSignal); }
function productTest(label, operation) {
  test(label, async t => {
    let operationDone;
    try {
      await diagnostic.run('productCaseMs', label, async signal => {
        activeSignal = signal;
        operationDone = Promise.resolve().then(async () => {
          let primary;
          try { return await operation({signal}); } catch (error) { primary = error; throw error; }
          finally {
            if (resetCase) {
              const reset = resetCase; resetCase = undefined;
              try { await diagnostic.run('teardownMs', 'normal product case reset', async resetSignal => {
                activeSignal = resetSignal; await reset();
              }); } catch (release) {
                if (primary) throw new AggregateError([primary, release], 'CASE_AND_NORMAL_RESET_FAILED');
                throw release;
              }
            }
          }
        });
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
  // It contains normal operations and installed paths, never supplied UI results.
  try { inputs = JSON.parse(await readFile(join(root, 'hanamesh-brand-inputs.json'), 'utf8')); }
  catch (cause) { throw new Error('CLIENT_INPUT_NOT_PREPARED: normal PM environment must generate hanamesh-brand-inputs.json; no CDP/brand assertion executed', {cause}); }
  assert.equal(inputs.schema, 2);
  configuration = budgets(inputs.diagnosticBudgets);
  diagnostic = new DiagnosticBudget(configuration, () => lastEvidence);
  console.log('hanamesh-brand diagnostic budgets (ms)', JSON.stringify(configuration));
  assert.deepEqual(inputs.sdkReference, SDK_REFERENCE, 'reference only; not an installed-host assertion');
  assert.equal(inputs.host.upstreamSha, HOST.upstreamSha);
  assert.deepEqual(Object.keys(inputs.cases).sort(), [...scenarios].sort());
  async function contained(path) {
    const value = await realpath(path), rel = relative(root, value);
    assert.ok(rel && rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel),
      'CLIENT_ASSEMBLY: installed package must belong to this program run');
    return value;
  }
  // Public packaging identity plus the actual runtime manifests. No old SDK
  // values may stand in for what the fixed Desktop really contains.
  inputs.host.checkoutDir = await contained(inputs.host.checkoutDir);
  assert.equal((await readFile(join(inputs.host.checkoutDir, 'packaging/upstream.sha'), 'utf8')).trim(), HOST.upstreamSha);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {cwd: inputs.host.checkoutDir, encoding: 'utf8'}).trim(), inputs.host.forkCommit);
  execFileSync('git', ['merge-base', '--is-ancestor', HOST.upstreamSha, 'HEAD'], {cwd: inputs.host.checkoutDir});
  for (const [key, name] of [['desktop', '@deepseek-ai/dsh-desktop'], ['dsh', '@deepseek-ai/dsh'],
    ['cordis', '@deepseek-ai/cordis'], ['pnpm', 'pnpm']]) {
    const dir = await contained(inputs.host.packageDirs[key]);
    const actual = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    assert.equal(actual.name, name); assert.equal(actual.version, HOST[key], 'actual fixed host ' + key);
    inputs.host.packageDirs[key] = dir;
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
    assert.equal(pkg.name, '@hanamesh/brand'); assert.deepEqual(Object.keys(pkg.dsh), ['client', 'bundle']);
    assert.equal(pkg.exports['./client'].default, './lib/client.js');
    assert.equal(pkg.exports['./client'].node, './lib/client/index.js');
    assert.equal(pkg.exports['./client'].types, './lib/client/index.d.ts');
    assert.equal(candidate.artifact.sourceSha, sourceSha, 'candidate artifact must be this module version');
    assert.equal(candidate.installation.peerMode, 'strict');
    assert.equal(candidate.installation.runtimeVersion, HOST.dsh);
    assert.ok(Array.isArray(candidate.installation.argv), 'CLIENT_INSTALL_EVIDENCE_MISSING: actual strict argv required');
    assert.ok(candidate.installation.argv.some(arg => ['--strict-peer-dependencies', '--config.strict-peer-dependencies=true'].includes(arg)));
    assert.equal(candidate.installation.argv.some(arg => /^--(force|legacy-peer-deps|ignore-peer|no-strict-peer|override)/.test(arg)), false);
    assert.deepEqual(candidate.installation.versionExemptions, [], 'normal install without a version exemption');
    const installLog = await contained(candidate.installation.log);
    assert.equal(hash(await readFile(installLog)), candidate.installation.logSha256);
    assert.equal(candidate.installation.exitCode, 0,
      'HOST_STRICT_INSTALL_FAILED: retain real incompatible-version/peers and rollback evidence for PM; no override/exemption');
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
      assert.equal(actual.name, peer);
      assert.equal(pkg.peerDependencies[peer], '0.2.1-alpha.2', 'target-aligned plugin declaration; runtime identity checked separately');
      assert.equal(actual.version, candidate.resolved[peer].version, 'read real installed resolved version');
      assert.equal(hash(await readFile(join(dir, 'package.json'))), candidate.resolved[peer].manifestSha256);
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
  assert.ok(spec.targetId && Array.isArray(spec.setup) && spec.setup.length
    && Array.isArray(spec.reset) && spec.reset.length,
    'CLIENT_ASSEMBLY: actual selected target and normal setup/reset required: ' + name);
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
  resetCase = async () => { for (const step of spec.reset) await action(page, step); };
  assert.equal(new URL(page.url()).protocol, 'dsh-app:');
  assert.equal(new URL(page.url()).host, 'app');
  assert.equal(new URL(page.url()).pathname, '/');
  assert.ok(await page.locator('body').isVisible(), 'CLIENT_ASSEMBLY: normal app body absent');
  assert.equal(await page.locator('[data-dsh-boot]').count(), 0, 'CLIENT_ASSEMBLY: boot has not handed off');
  assert.equal(spec.release ?? false, name.startsWith('release-missing:'));
  lastEvidence = {case: name, targetId: spec.targetId, url: page.url(), stage: 'actual-loaded-bundles'};
  await loadedBytes(page, spec);
  // These are ordinary Plugin Manager/settings/fixture UI actions. Locked or
  // absent controls fail with their real reason; never use a private Context.
  for (const step of spec.setup) await action(page, step);
  if (spec.release) assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined');
  else await diagnostic.run('lifecycleSignalMs', 'normal setup phase: ' + name, () => page.waitForFunction(phase =>
    window.hanameshBrandVerification?.inspect().phase === phase,
    name === 'delayed' ? 'waiting' : 'active', {timeout: configuration.lifecycleSignalMs}), activeSignal);
  if (name !== 'delayed') {
    await bindPresentation(page, spec);
    // Observe actual fallback text/color in this same client with brand normally
    // disabled, then restore it. They are observations, not supplied answers.
    assert.ok(spec.baseline?.disable?.length && spec.baseline?.restore?.length,
      'CLIENT_BASELINE_OPERATION_MISSING: normal brand disable/restore not provided');
    for (const step of spec.baseline.disable) await action(page, step);
    await ui('capture real unbranded UI', async () => {
      spec.originalText = Object.fromEntries(await Promise.all(slots.map(async slot =>
        [slot, (await page.locator(spec.locators[slot]).textContent()).trim()])));
      spec.originalColor = await page.locator(spec.locators.themeRoot).evaluate(node =>
        getComputedStyle(node).getPropertyValue('--dsw-alias-state-business-primary').trim());
    });
    for (const step of spec.baseline.restore) await action(page, step);
    if (!spec.release) await diagnostic.run('lifecycleSignalMs', 'baseline restore phase: ' + name, () => page.waitForFunction(() =>
      window.hanameshBrandVerification?.inspect().phase === 'active', undefined,
      {timeout: configuration.lifecycleSignalMs}), activeSignal);
  }
  return {page, spec};
}); }
async function loadedBytes(page, spec) {
  const session = await page.context().newCDPSession(page), parsed = [];
  session.on('Debugger.scriptParsed', value => parsed.push(value));
  try {
    await session.send('Debugger.enable');
    const graph = await page.evaluate(() => window.__DSH_BOOT__); // documented public boot graph; read only
    assert.ok(graph?.entries?.length && graph?.batches?.length, 'CLIENT_ASSEMBLY: actual boot graph absent');
    const candidate = spec.release ? inputs.release : inputs;
    const packages = [['@hanamesh/brand', candidate.installedPackageDir],
      ...peers.map(peer => [peer, candidate.peerPackageDirs[peer]])];
    const sources = new Map();
    // Public combo transport replaces source-map trailers; executable bytes
    // remain unchanged. Record raw package hashes and matching transport bytes.
    const executable = text => text.replace(/^\/\/[#@] sourceMappingURL=.*$/gm, '').trimEnd();
    for (const [name, dir] of packages) {
      assert.equal(graph.entries.filter(entry => entry.id === name).length, 1, 'actual boot entry ' + name);
      const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      const entry = pkg.exports['./client'];
      const path = typeof entry === 'string' ? entry : entry.default;
      const bytes = await readFile(join(dir, path)), expected = executable(bytes.toString('utf8'));
      const urls = new Set([graph.entries.find(entry => entry.id === name).url,
        ...graph.batches.filter(batch => batch.entries.includes(name)).map(batch => batch.url)]
        .map(url => new URL(url, page.url()).href));
      let matched = false;
      for (const row of parsed.filter(row => urls.has(row.url))) {
        if (!sources.has(row.scriptId)) sources.set(row.scriptId,
          (await session.send('Debugger.getScriptSource', {scriptId: row.scriptId})).scriptSource);
        const source = executable(sources.get(row.scriptId)), offset = source.indexOf(expected);
        if (offset >= 0 && source.indexOf(expected, offset + expected.length) === -1) {
          assert.equal(hash(source.slice(offset, offset + expected.length)), hash(expected), 'actual factory transport bytes');
          lastEvidence = {...lastEvidence, loaded: {...lastEvidence.loaded,
            [name]: {url: row.url, packageSha256: hash(bytes), executableSha256: hash(expected)}}};
          matched = true; break;
        }
      }
      assert.ok(matched, 'BRAND_LOAD: actual single/combo execution must contain installed default bytes: ' + name);
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
async function appearance(page, spec, palette) {
  if (!spec.locators) await bindPresentation(page, spec);
  return ui('actual brand appearance', async () => {
  for (const [slot, text] of slots.map((slot, index) => [slot, ['H', 'HanaMesh', 'H'][index]])) {
    const node = page.locator(spec.locators[slot]);
    assert.equal(await node.count(), 1, 'visible slot occupant ' + slot);
    assert.ok(await node.isVisible()); assert.equal((await node.textContent()).trim(), text);
  }
  const color = await page.locator(spec.locators.themeRoot).evaluate(node =>
    getComputedStyle(node).getPropertyValue('--dsw-alias-state-business-primary').trim());
  if (lastEvidence.case === 'delayed') {
    // Required brand slots are initially absent in this case. The observer
    // compares every token with the real public snapshot taken before apply.
    const state = await inspect(page);
    assert.equal(state.owned.themeLayers, 0);
    assert.equal(state.otherContributionsPreserved, true);
  } else {
    assert.equal(typeof spec.originalColor, 'string', 'normal disable/restore baseline is required');
    assert.equal(color, spec.originalColor, 'Brand must preserve the observed original host color');
  }
  for (const selector of spec.preservedControls) assert.ok(await page.locator(selector).isVisible(),
    'original welcome/sidebar control remains available: ' + selector);
}); }
async function save(name, page, state) { return ui('actual screenshot/evidence: ' + name, async () => {
  await writeFile(join(output, name.replaceAll(':', '-') + '.json'), JSON.stringify({
    url: page.url(), targetId: inputs.cases[name].targetId, host: inputs.host, sdkReference: inputs.sdkReference,
    loaded: lastEvidence.loaded,
    artifact: (inputs.cases[name].release ? inputs.release : inputs).artifact,
    resolved: (inputs.cases[name].release ? inputs.release : inputs).peerPackageDirs, state,
  }, null, 2) + '\n');
  await page.screenshot({path: join(output, name.replaceAll(':', '-') + '.png'), fullPage: true, timeout: configuration.uiOperationMs});
}); }
// Public UI only: source-backed controls, with desired switch state so reset
// is deterministic. No command execution, profile writes, or guessed JS ports.
async function action(page, step) { return ui('normal UI operation: ' + step.name, async () => {
  assert.deepEqual(Object.keys(step).sort(), step.select !== undefined ? ['name', 'role', 'select']
    : step.checked === undefined ? ['name', 'role'] : ['checked', 'name', 'role']);
  const control = page.getByRole(step.role, {name: step.name, exact: true});
  assert.equal(await control.count(), 1, 'CLIENT_PUBLIC_OPERATION_UNAVAILABLE: ' + step.name);
  assert.ok(await control.isVisible());
  assert.ok(await control.isEnabled(), 'CLIENT_PUBLIC_OPERATION_LOCKED: ' + step.name + '; ' + await control.getAttribute('title'));
  if (step.select !== undefined) {
    assert.equal(step.role, 'combobox'); await control.selectOption(step.select, {timeout: configuration.uiOperationMs});
    assert.equal(await control.inputValue(), step.select); return;
  }
  if (step.checked !== undefined) {
    assert.equal(typeof step.checked, 'boolean');
    assert.ok(['switch', 'checkbox', 'radio'].includes(step.role));
    if (await page.getByRole(step.role, {name: step.name, exact: true, checked: step.checked}).count() === 1) return;
  }
  await control.click({timeout: configuration.uiOperationMs});
  if (step.name === 'Brand fixture: declare') {
    assert.equal(await page.getByRole('region', {name: 'Brand declaration fixture', exact: true}).getByRole('alert').count(), 0,
      'CLIENT_FIXTURE_DECLARATION_FAILED: inspect actual fixture error');
    const rows = JSON.parse(await page.getByRole('status', {name: 'Brand fixture declarations', exact: true}).textContent());
    const name = lastEvidence.case;
    const missing = name?.startsWith('release-missing:') ? name.slice(16) : name?.startsWith('missing:') ? name.slice(8) : undefined;
    assert.deepEqual(rows.map(row => row.name).sort(), slots.filter(slot => slot !== missing).sort(), 'actual fixture declaration roster');
    for (const row of rows) {
      assert.equal(row.kind, name === 'incompatible:kind' && row.name === slots[2] ? 'chain' : 'single');
      assert.equal(row.scope, name === 'incompatible:scope' && row.name === slots[2] ? 'session' : 'root');
    }
  }
  if (step.checked !== undefined) await page.getByRole(step.role, {name: step.name, exact: true, checked: step.checked})
    .waitFor({state: 'visible', timeout: configuration.uiOperationMs});
}); }
async function bindPresentation(page, spec) { return ui('observe actual brand containers and retained UI', async () => {
  const observed = await page.evaluate(() => {
    const path = element => {
      const parts = [];
      for (let el = element; el && el !== document.body; el = el.parentElement) {
        const peers = [...el.parentElement.children].filter(item => item.tagName === el.tagName);
        parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + (peers.indexOf(el) + 1) + ')');
      }
      return 'body > ' + parts.join(' > ');
    };
    const spans = [...document.querySelectorAll('span')];
    const mark = size => spans.filter(el => el.textContent === 'H' && el.style.display === 'inline-grid'
      && el.style.width === size + 'px');
    const names = spans.filter(el => el.childElementCount === 0 && el.textContent === 'HanaMesh' && el.closest('[aria-hidden="true"]'));
    const marks = [mark(24), names, mark(34)];
    const controls = [...document.querySelectorAll('button')].filter(el =>
      ['New session', '新建会话', 'Collapse sidebar', '收起侧边栏'].includes(el.getAttribute('aria-label')));
    return {counts: marks.map(rows => rows.length), slots: marks.map(rows => rows.length === 1 ? path(rows[0].parentElement) : null),
      controls: controls.map(path), controlNames: controls.map(el => el.getAttribute('aria-label'))};
  });
  assert.deepEqual(observed.counts, [1, 1, 1], 'real expanded sidebar and blank-session hero must display all brand occupants');
  assert.ok(observed.controls.length >= 2, 'actual original sidebar/new-session controls absent');
  assert.ok(observed.controlNames.some(name => ['New session', '新建会话'].includes(name)));
  assert.ok(observed.controlNames.some(name => ['Collapse sidebar', '收起侧边栏'].includes(name)));
  spec.locators = Object.fromEntries(slots.map((slot, i) => [slot, observed.slots[i]]));
  spec.locators.themeRoot = 'body'; spec.preservedControls = observed.controls;
}); }
for (const palette of ['light', 'dark']) productTest('normal Desktop brand appearance and actual API: ' + palette, async () => {
  const {page, spec} = await pageFor(palette);
  const state = await inspect(page);
  assert.equal(state.phase, 'active');
  assert.deepEqual(state.owned, {slots: 3, dictionaries: 1, themeLayers: 0, waits: 3});
  for (const key of slots) {
    const node = state.declarations.find(node => node.name === key);
    assert.ok(node); assert.equal(node.kind, 'single'); assert.equal(node.scope, 'root');
    assert.ok(node.declaredBy, 'real provider declaration owner');
    assert.equal(/fixture|negative-declarer/.test(node.declaredBy), false, 'positive compatibility uses genuine providers');
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
      assert.equal(native.failures.length, 0); assert.equal(native.messages.length, 0);
      await ui('plugin-local precise error is visible', async () => {
        const panel = page.locator('[data-hanamesh-brand-error]');
        assert.equal(await panel.isVisible(), true);
        assert.ok((await panel.textContent()).includes(result.slot));
      });
      await ui('rejection removes observation face', async () =>
        assert.equal(await page.evaluate(() => typeof window.hanameshBrandVerification), 'undefined'));
      assert.ok(spec.restoreProviders?.length, 'CLIENT_PROVIDER_RESTORE_UNAVAILABLE');
      for (const step of spec.restoreProviders) await action(page, step);
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
    assert.ok(spec.restoreProviders?.length, 'CLIENT_PROVIDER_RESTORE_UNAVAILABLE');
    for (const step of spec.restoreProviders) await action(page, step);
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
      assert.equal(native.failures.length, 0); assert.equal(native.messages.length, 0);
      await ui('release plugin-local precise error is visible', async () => {
        const panel = page.locator('[data-hanamesh-brand-error]');
        assert.equal(await panel.isVisible(), true);
        assert.ok((await panel.textContent()).includes(slot));
      });
      assert.ok(spec.restoreProviders?.length, 'CLIENT_PROVIDER_RESTORE_UNAVAILABLE');
      for (const step of spec.restoreProviders) await action(page, step);
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
