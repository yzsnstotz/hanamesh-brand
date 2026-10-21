import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, inject } from '../src/client/index.ts';
import { HanaMeshMark, HanaMeshName } from '../src/client/Brand.ts';

function host(declared = []) {
  const declarations = new Set(declared), entries = new Map(), waits = new Set();
  const dicts = new Map(), layers = new Map(), effects = [];
  const ctx = {
    slots: {
      inject(name, run) {
        const wait = {name, run, active: undefined}; waits.add(wait);
        if (declarations.has(name)) wait.active = run();
        return () => { wait.active?.(); wait.active = undefined; waits.delete(wait); };
      },
      register(spec, component) {
        assert.ok(declarations.has(spec.name));
        const entry = {spec, component}; entries.set(spec.name, entry);
        return () => { if (entries.get(spec.name) === entry) entries.delete(spec.name); };
      },
    },
    locale: { register(ns, dictionaries) {
      assert.ok(!dicts.has(ns), 'duplicate namespace'); dicts.set(ns, dictionaries);
      return () => dicts.delete(ns);
    } },
    theme: { overrideTokens(source, tokens) {
      for (const pair of Object.values(tokens)) {
        assert.equal(typeof pair.light, 'string'); assert.equal(typeof pair.dark, 'string');
      }
      layers.set(source, tokens); return () => layers.delete(source);
    } },
    effect(run) { const dispose = run(); effects.push(dispose); return dispose; },
  };
  return {ctx, entries, dicts, layers, waits,
    declare(name) { declarations.add(name); for (const w of waits) if (w.name === name) w.active = w.run(); },
    collapse(name) { declarations.delete(name); for (const w of waits) if (w.name === name) {w.active?.(); w.active = undefined;} },
    unload() { effects.splice(0).reverse().forEach(dispose => dispose()); },
  };
}
const slots = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
test('registers all three named brand slots and unloads all contributions', () => {
  const h = host(slots); apply(h.ctx);
  assert.deepEqual(inject, ['slots', 'locale', 'theme']);
  assert.deepEqual([...h.entries.keys()], slots);
  for (const {spec} of h.entries.values()) {
    assert.equal(spec.id, 'hanamesh-brand'); assert.equal(spec.label, 'HanaMesh'); assert.equal(spec.priority, -80); assert.equal(spec.order, undefined);
  }
  assert.equal(h.entries.get(slots[0]).component, HanaMeshMark);
  assert.equal(h.entries.get(slots[1]).component, HanaMeshName);
  assert.equal(h.entries.get(slots[2]).component, HanaMeshMark);
  h.unload(); h.unload();
  assert.equal(h.entries.size + h.dicts.size + h.layers.size + h.waits.size, 0);
});
test('late declarations and collapse/redeclaration track the host lifetime', () => {
  const h = host(); apply(h.ctx); assert.equal(h.entries.size, 0);
  slots.forEach(s => h.declare(s)); assert.equal(h.entries.size, 3);
  h.collapse(slots[2]); assert.equal(h.entries.size, 2);
  h.declare(slots[2]); assert.equal(h.entries.size, 3);
  h.unload(); slots.forEach(s => h.declare(s)); assert.equal(h.entries.size, 0);
});
test('registers bilingual brand copy without colliding with conversation dictionary', () => {
  const h = host(slots); h.dicts.set('conversation', {en: {'hero.headline': 'Into the Unknown'}});
  apply(h.ctx);
  assert.deepEqual(h.dicts.get('hanamesh.brand'), {
    zh: {'hero.headline': 'HanaMesh，让创造相连'},
    en: {'hero.headline': 'HanaMesh, connect your creations'},
  });
  h.unload(); assert.equal(h.dicts.get('conversation').en['hero.headline'], 'Into the Unknown');
});
test('preserves every pre-existing theme layer without adding a brand layer', () => {
  const h = host(slots); h.layers.set('other', {'--other': {light: 'red', dark: 'pink'}});
  apply(h.ctx);
  assert.deepEqual([...h.layers], [['other', {'--other': {light: 'red', dark: 'pink'}}]]);
  h.unload(); assert.deepEqual([...h.layers.keys()], ['other']);
});
test('brand mark respects host size/class and name contains HanaMesh', () => {
  const mark = HanaMeshMark({size: 40, className: 'hero-mark'});
  assert.equal(mark.props.children, 'H'); assert.equal(mark.props.className, 'hero-mark');
  assert.equal(mark.props.style.width, 40); assert.equal(mark.props.style.height, 40);
  assert.equal(mark.props.style.fontSize, 22);
  assert.equal(HanaMeshName().props.children, 'HanaMesh');
});
test('setup failure rolls back earlier contributions and preserves the cause', () => {
  const h = host(slots), cause = new Error('host rejected brand slot injection');
  h.ctx.slots.inject = () => { throw cause; };
  assert.throws(() => apply(h.ctx), error => error === cause);
  assert.equal(h.dicts.size + h.layers.size + h.entries.size + h.waits.size, 0);
});
test('distribution declares client presentation, a profile bundle, and target peers', async () => {
  const {readFile} = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(pkg.dsh), ['client', 'bundle']);
  assert.equal(pkg.peerDependencies['@deepseek-ai/dsh-client-ui-sidebar'], '0.2.1-alpha.2');
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'));
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-theme'));
  const client = await import('hanamesh-brand/client');
  assert.deepEqual(client.inject, inject);
});

// I25/B04 SOURCE/FIXTURE: assert the actual plugin never writes the host theme.
test('brand keeps its purple mark local without registering any global theme layer', () => {
  const h = host(slots), writes = [];
  h.ctx.theme.overrideTokens = (...args) => { writes.push(args); return () => {}; };
  apply(h.ctx);
  try {
    assert.equal(writes.length, 0, 'Brand must not call the host global token override API');
    assert.equal(h.layers.size, 0);
    const mark = h.entries.get(slots[0]).component({size: 24});
    assert.equal(mark.props.style.background, '#7059e8', 'brand color is confined to its own mark');
  } finally { h.unload(); }
});
test('theme preservation includes business-primary and detects an external change instead of exempting it', () => {
  const h = host(slots);
  h.ctx.slots.snapshot = () => slots.map(name => ({type: 'slot', name, kind: 'single', scope: 'root'}));
  h.ctx.locale.getLocale = () => ({active: 'en'});
  h.ctx.locale.bind = () => () => 'original';
  const tokens = {'--dsw-alias-state-business-primary': '#112233', '--dsw-alias-label-primary': '#121212'};
  h.ctx.theme.getTheme = () => ({active: {colorScheme: 'light', tokens: {...tokens}}, themes: []});
  const originalWindow = globalThis.window, originalBuildFlag = globalThis.__HANAMESH_BRAND_VERIFICATION__;
  globalThis.window = {dispatchEvent: () => true};
  // Existing SOURCE-only observer path, never a normal product readiness signal.
  globalThis.__HANAMESH_BRAND_VERIFICATION__ = true;
  try {
    apply(h.ctx, {verification: {enabled: true}});
    const inspect = globalThis.window.hanameshBrandVerification.inspect;
    assert.equal(inspect().otherContributionsPreserved, true);
    tokens['--dsw-alias-state-business-primary'] = '#778899';
    assert.equal(inspect().otherContributionsPreserved, false, 'business-primary has no preservation exemption');
    assert.equal(inspect().owned.themeLayers, 0);
  } finally {
    h.unload();
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalBuildFlag === undefined) delete globalThis.__HANAMESH_BRAND_VERIFICATION__; else globalThis.__HANAMESH_BRAND_VERIFICATION__ = originalBuildFlag;
  }
});
