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
  assert.equal(h.entries.size, 0); assert.equal(h.waits.size, 3);
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
