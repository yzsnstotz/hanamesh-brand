import test from 'node:test';
import assert from 'node:assert/strict';
import * as brand from '../src/client/index.ts';

// SOURCE/FIXTURE, using the published snapshot shape, not a Desktop substitute.
const keys = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
function host(initial = keys) {
  const specs = new Map(initial.map(name => [name, {type: 'slot', name,
    kind: 'single', scope: 'root', occupants: [], children: []}]));
  const waits = new Set(), entries = new Map(), dicts = new Map(), layers = new Map();
  const effects = [];
  const ctx = {
    slots: {
      snapshot: () => [...specs.values()],
      inject(name, run) {
        const wait = {name, run}; waits.add(wait);
        try { if (specs.has(name)) wait.active = run(); }
        catch (error) { waits.delete(wait); throw error; }
        return () => { wait.active?.(); waits.delete(wait); };
      },
      register(spec, component) {
        entries.set(spec.name, {spec, component});
        return () => entries.delete(spec.name);
      },
    },
    locale: {register(ns, value) { dicts.set(ns, value); return () => dicts.delete(ns); }},
    theme: {overrideTokens(id, value) { layers.set(id, value); return () => layers.delete(id); }},
    effect(run) { const dispose = run(); effects.push(dispose); return dispose; },
  };
  const originalDictionary = {en: {'hero.headline': 'original'}};
  const originalLayer = {light: '#112233', dark: '#445566'};
  dicts.set('conversation', originalDictionary); layers.set('other', originalLayer);
  return {ctx, specs, entries, waits, dicts, layers,
    declare(name) {
      specs.set(name, {type: 'slot', name, kind: 'single', scope: 'root', occupants: [], children: []});
      for (const wait of waits) if (wait.name === name) {
        try { wait.active = wait.run(); }
        catch (error) { waits.delete(wait); throw error; }
      }
    },
    collapse(name) {
      specs.delete(name);
      for (const wait of waits) if (wait.name === name) { wait.active?.(); wait.active = undefined; }
    },
    clean() {
      assert.equal(entries.size, 0); assert.equal(waits.size, 0);
      assert.deepEqual([...dicts], [['conversation', originalDictionary]]);
      assert.deepEqual([...layers], [['other', originalLayer]]);
    },
    unload() { effects.splice(0).reverse().forEach(run => run()); },
  };
}
function verify(ctx) {
  assert.equal(typeof brand.validateSlots, 'function',
    'brand must validate required declarations in the current assembled composition');
  return brand.validateSlots(ctx);
}
for (const missing of keys) {
  test(`assembled compatibility check rejects missing ${missing} and releases only brand resources`, () => {
    const h = host(keys.filter(key => key !== missing)); brand.apply(h.ctx);
    assert.throws(() => verify(h.ctx), error => error.code === 'BRAND_SLOT_MISSING'
      && error.slot === missing && error.message.includes(missing));
    h.clean(); h.declare(missing); assert.equal(h.entries.size, 0);
    h.unload(); h.unload(); h.clean();
  });
}
for (const [field, actual] of [['kind', 'chain'], ['scope', 'session']]) {
  test(`rejects incompatible ${field} with actual shape and no residual contributions`, () => {
    const h = host(); h.specs.get(keys[2])[field] = actual;
    assert.throws(() => { brand.apply(h.ctx); verify(h.ctx); }, error => error.code === 'BRAND_SLOT_INCOMPATIBLE'
      && error.slot === keys[2] && error.actual?.[field] === actual
      && error.expected?.kind === 'single' && error.expected?.scope === 'root');
    h.clean(); h.unload(); h.clean();
  });
}
test('explicit assembled check accepts compatible slots and does not change brand defaults', () => {
  const h = host(); brand.apply(h.ctx); verify(h.ctx);
  assert.equal(h.entries.size, 3);
  assert.deepEqual(h.layers.get('hanamesh-brand')['--dsw-alias-state-business-primary'],
    {light: '#7059e8', dark: '#a99aff'});
  h.unload(); h.clean();
});
test('waiting, collapse and redeclaration remain legal until an explicit assembled check', () => {
  const h = host([]); brand.apply(h.ctx);
  assert.equal(h.entries.size, 0); assert.equal(h.waits.size, 4);
  keys.forEach(key => h.declare(key)); verify(h.ctx);
  h.collapse(keys[2]); assert.equal(h.entries.size, 2); assert.equal(h.waits.size, 3);
  h.declare(keys[2]); verify(h.ctx); assert.equal(h.entries.size, 3);
  h.unload(); h.clean(); keys.forEach(key => h.declare(key)); h.clean();
});
for (const delayed of [false, true]) {
  test(`${delayed ? 'delayed' : 'immediate'} registration error preserves its cause and rolls back the whole brand`, () => {
    const h = host(delayed ? [] : keys), cause = new Error('declaring provider rejected the hero occupant');
    const register = h.ctx.slots.register;
    h.ctx.slots.register = (spec, component) => {
      if (spec.name === keys[2]) throw cause;
      return register(spec, component);
    };
    if (delayed) {
      brand.apply(h.ctx); h.declare(keys[0]); h.declare(keys[1]);
      assert.throws(() => h.declare(keys[2]), error => error === cause);
    } else assert.throws(() => brand.apply(h.ctx), error => error === cause);
    h.clean(); h.unload(); h.unload(); h.clean();
    keys.forEach(key => h.declare(key)); h.clean();
  });
}
test('unloading while declarations are pending cancels all future brand work', () => {
  const h = host([]); brand.apply(h.ctx); h.unload(); h.clean();
  keys.forEach(key => h.declare(key)); h.clean();
});

// Formal first-commit path: callback belongs to the normal registered React
// checkpoint, not the verification global. SOURCE models the effect callback;
// the separate product suite exercises the actual React mount and native dialog.
function formalCommit(h) {
  const entry = h.entries.get('shell.overlay');
  assert.ok(entry, 'normal product must register its shell.overlay compatibility checkpoint');
  const element = entry.component({});
  assert.equal(typeof element.props.onCommit, 'function', 'formal React first-commit callback');
  return element.props.onCommit();
}
for (const missing of keys) test(`verification off: formal first commit rejects ${missing} without any test global`, () => {
  const h = host(keys.filter(key => key !== missing));
  h.specs.set('shell.overlay', {type: 'slot', name: 'shell.overlay', kind: 'list',
    scope: 'root', occupants: [], children: []});
  const original = globalThis.window, alerts = [], events = [];
  globalThis.window = {alert: message => alerts.push(message), dispatchEvent: event => { events.push(event); return true; }};
  try {
    brand.apply(h.ctx, {verification: {enabled: false}});
    assert.equal(globalThis.window.hanameshBrandVerification, undefined);
    assert.throws(() => formalCommit(h), error => error.code === 'BRAND_SLOT_MISSING' && error.slot === missing);
    assert.equal(alerts.length, 1); assert.ok(alerts[0].includes(missing));
    const failure = events.find(event => event.type === 'hanamesh-brand:rejected');
    assert.ok(failure, 'normal product must publish its rejection after complete rollback');
    assert.equal(failure.detail.code, 'BRAND_SLOT_MISSING');
    assert.deepEqual(failure.detail.state.owned, {slots: 0, dictionaries: 0, themeLayers: 0, waits: 0});
    h.clean(); h.declare(missing); h.clean(); h.unload(); h.clean();
    assert.equal(globalThis.window.hanameshBrandVerification, undefined);
  } finally { if (original === undefined) delete globalThis.window; else globalThis.window = original; }
});
test('formal checkpoint accepts declarations arriving before first commit and preserves later legal redeclaration', () => {
  const h = host([]);
  brand.apply(h.ctx, {verification: {enabled: false}});
  assert.equal(h.entries.size, 0); // no early rejection just because initialization is waiting
  keys.forEach(key => h.declare(key));
  h.specs.set('shell.overlay', {type: 'slot', name: 'shell.overlay', kind: 'list',
    scope: 'root', occupants: [], children: []});
  // Drive the genuine registration callback for the public overlay declaration.
  for (const wait of h.waits) if (wait.name === 'shell.overlay') wait.active = wait.run();
  formalCommit(h);
  assert.equal(h.entries.has('shell.overlay'), false, 'one-shot checkpoint also releases its own entry');
  assert.equal(h.entries.size, 3); assert.equal(h.waits.size, 3);
  h.collapse(keys[2]); assert.equal(h.entries.size, 2);
  h.declare(keys[2]); assert.equal(h.entries.size, 3);
  h.unload(); h.clean();
});

for (const [field, actual] of [['kind', 'chain'], ['scope', 'session']])
  test(`verification off: formal behavior rejects incompatible ${field} and rolls back without global`, () => {
    const h = host(); h.specs.get(keys[2])[field] = actual;
    h.specs.set('shell.overlay', {type: 'slot', name: 'shell.overlay', kind: 'list', scope: 'root', occupants: [], children: []});
    const original = globalThis.window, messages = [], events = [];
    globalThis.window = {alert: message => messages.push(message), dispatchEvent: event => { events.push(event); return true; }};
    try {
      assert.throws(() => {
        brand.apply(h.ctx, {verification: {enabled: false}}); formalCommit(h);
      }, error => error.code === 'BRAND_SLOT_INCOMPATIBLE' && error.slot === keys[2]
        && error.actual?.[field] === actual && error.expected?.kind === 'single' && error.expected?.scope === 'root');
      assert.equal(messages.length, 1); assert.ok(messages[0].includes(keys[2]));
      assert.equal(events.find(event => event.type === 'hanamesh-brand:rejected')?.detail.code, 'BRAND_SLOT_INCOMPATIBLE');
      assert.equal(globalThis.window.hanameshBrandVerification, undefined);
      h.clean(); h.unload(); h.clean();
    } finally { if (original === undefined) delete globalThis.window; else globalThis.window = original; }
  });
