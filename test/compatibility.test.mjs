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
      assert.equal([...entries.values()].filter(entry => entry.spec.id !== 'hanamesh-brand:error').length, 0);
      assert.ok(waits.size <= 1 && [...waits].every(wait => wait.name === 'shell.overlay'), 'only the separately owned error presenter may wait');
      assert.deepEqual([...dicts], [['conversation', originalDictionary]]);
      assert.deepEqual([...layers], [['other', originalLayer]]);
    },
    unload() { effects.splice(0).reverse().forEach(run => run()); assert.equal(entries.size, 0); assert.equal(waits.size, 0); },
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
test('explicit assembled check accepts compatible slots without changing the host theme', () => {
  const h = host(); brand.apply(h.ctx); verify(h.ctx);
  assert.equal(h.entries.size, 3);
  assert.deepEqual([...h.layers.keys()], ['other']);
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
  if (entry.spec.id === 'hanamesh-brand:error') return element;
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
    assert.doesNotThrow(() => formalCommit(h));
    assert.throws(() => verify(h.ctx), error => error.code === 'BRAND_SLOT_MISSING' && error.slot === missing);
    assert.equal(alerts.length, 0);
    assert.match(JSON.stringify(h.entries.get('shell.overlay').component({})), new RegExp(missing.replaceAll('.', '\\.')));
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
      assert.doesNotThrow(() => { brand.apply(h.ctx, {verification: {enabled: false}}); formalCommit(h); });
      assert.throws(() => verify(h.ctx), error => error.code === 'BRAND_SLOT_INCOMPATIBLE' && error.slot === keys[2]
        && error.actual?.[field] === actual && error.expected?.kind === 'single' && error.expected?.scope === 'root');
      assert.equal(messages.length, 0);
      assert.match(JSON.stringify(h.entries.get('shell.overlay').component({})), /actual kind=/);
      assert.equal(events.find(event => event.type === 'hanamesh-brand:rejected')?.detail.code, 'BRAND_SLOT_INCOMPATIBLE');
      assert.equal(globalThis.window.hanameshBrandVerification, undefined);
      h.clean(); h.unload(); h.clean();
    } finally { if (original === undefined) delete globalThis.window; else globalThis.window = original; }
  });

test('normal compatibility failure stays in the plugin error surface without a native alert or host-wide React failure',()=>{
 const h=host(keys.filter(key=>key!==keys[1]));h.specs.set('shell.overlay',{type:'slot',name:'shell.overlay',kind:'list',scope:'root',occupants:[],children:[]});
 const original=globalThis.window,alerts=[],events=[];globalThis.window={alert:message=>alerts.push(message),dispatchEvent:event=>{events.push(event);return true;}};
 try {
  brand.apply(h.ctx);
  assert.doesNotThrow(()=>formalCommit(h),'automatic first commit must remain local to this plugin');
  assert.equal(alerts.length,0,'no native blocking alert');
  const failure=events.find(e=>e.type==='hanamesh-brand:rejected');assert.equal(failure?.detail.code,'BRAND_SLOT_MISSING');assert.deepEqual(failure.detail.state.errorPresentation,{status:'visible',slots:1,waits:1});
  const panel=h.entries.get('shell.overlay');assert.equal(panel?.spec.id,'hanamesh-brand:error');const element=panel.component({});assert.equal(element.props.role,'alert');assert.ok(JSON.stringify(element).includes(keys[1]));
  assert.throws(()=>brand.validateSlots(h.ctx),error=>error.code==='BRAND_SLOT_MISSING'&&error.slot===keys[1],'explicit checks still return the precise original failure');
  assert.equal(h.dicts.has('hanamesh.brand'),false);assert.equal(h.layers.has('hanamesh-brand'),false);
  h.unload();assert.equal(h.entries.size,0);assert.equal(h.waits.size,0);
 }finally {if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});

test('an unknown snapshot failure is retained as the exact cause and presented locally',()=>{
 const h=host();h.specs.set('shell.overlay',{type:'slot',name:'shell.overlay',kind:'list',scope:'root'});brand.apply(h.ctx);
 const cause=new Error('SLOT_SNAPSHOT_FAILED');h.ctx.slots.snapshot=()=>{throw cause;};
 assert.doesNotThrow(()=>formalCommit(h));
 assert.throws(()=>brand.validateSlots(h.ctx),error=>error===cause);
 const panel=h.entries.get('shell.overlay');assert.equal(panel?.spec.id,'hanamesh-brand:error');assert.match(JSON.stringify(panel.component({})),/SLOT_SNAPSHOT_FAILED/);
 assert.equal(cause.brandState.declarationReadError,'SLOT_SNAPSHOT_FAILED');h.unload();
});
test('a failed dictionary release remains visible and is never described as complete rollback',()=>{
 const h=host(keys.filter(key=>key!==keys[1]));h.specs.set('shell.overlay',{type:'slot',name:'shell.overlay',kind:'list',scope:'root'});
 h.ctx.locale.register=(id,value)=>{h.dicts.set(id,value);return()=>{throw new Error('DICTIONARY_RELEASE_FAILED');};};
 brand.apply(h.ctx);assert.doesNotThrow(()=>formalCommit(h));
 const panel=h.entries.get('shell.overlay');assert.ok(panel);const rendered=JSON.stringify(panel.component({}));
 assert.equal(h.dicts.has('hanamesh.brand'),true);assert.doesNotMatch(rendered,/were removed/);assert.match(rendered,/DICTIONARY_RELEASE_FAILED/);assert.match(rendered,/may still/);
 assert.throws(()=>brand.validateSlots(h.ctx),error=>error.code==='BRAND_SLOT_MISSING'&&error.cleanupError instanceof AggregateError&&error.brandState.owned.dictionaries===1 && error.brandState.owned.themeLayers===0);
 h.unload();h.dicts.delete('hanamesh.brand');
});

test('late incompatible declaration is local and waits honestly for the plugin error surface',()=>{
 const h=host([]);brand.apply(h.ctx);
 h.specs.set(keys[0],{type:'slot',name:keys[0],kind:'chain',scope:'root'});
 const pending=[...h.waits].find(wait=>wait.name===keys[0]);assert.ok(pending);
 assert.doesNotThrow(()=>{pending.active=pending.run();});
 assert.throws(()=>brand.validateSlots(h.ctx),error=>error.code==='BRAND_SLOT_INCOMPATIBLE'&&error.brandState.errorPresentation.status==='waiting');
 assert.equal(h.entries.size,0,'no error surface was declared yet');h.declare('shell.overlay');
 const panel=h.entries.get('shell.overlay');assert.equal(panel?.spec.id,'hanamesh-brand:error');assert.match(JSON.stringify(panel.component({})),/actual kind=chain/);h.unload();h.clean();
});

for (const delayed of [false, true]) test(`error surface ${delayed ? 'delayed' : 'immediate'} registration failure is public and rejects with both causes`,()=>{
 const h=host(delayed?[]:keys); const cause=new Error('ERROR_SURFACE_REGISTER_DENIED');
 const original=globalThis.window,events=[];globalThis.window={dispatchEvent:event=>{events.push(event);return true;}};
 const register=h.ctx.slots.register;
 h.ctx.slots.register=(spec,component)=>{if(spec.id==='hanamesh-brand:error')throw cause;return register(spec,component);};
 try{
  let thrown;
  if(delayed){brand.apply(h.ctx);h.specs.set(keys[0],{type:'slot',name:keys[0],kind:'chain',scope:'root'});const pending=[...h.waits].find(w=>w.name===keys[0]);pending.active=pending.run();
   assert.throws(()=>h.declare('shell.overlay'),error=>{thrown=error;return error instanceof AggregateError;});
  }else{h.specs.get(keys[0]).kind='chain';h.specs.set('shell.overlay',{type:'slot',name:'shell.overlay',kind:'list',scope:'root'});
   assert.throws(()=>brand.apply(h.ctx),error=>{thrown=error;return error instanceof AggregateError;});}
  assert.equal(thrown.errors[0].code,'BRAND_SLOT_INCOMPATIBLE');assert.equal(thrown.errors[1],cause);
  const rejection=events.at(-1).detail;assert.equal(rejection.code,'BRAND_SLOT_INCOMPATIBLE');
  assert.equal(rejection.presentation.message,cause.message);assert.equal(rejection.state.errorPresentation.status,'failed');
  assert.throws(()=>brand.validateSlots(h.ctx),error=>error.code==='BRAND_SLOT_INCOMPATIBLE'&&error.brandState.error.presentation.message===cause.message);
  assert.equal(h.entries.size,0);h.unload();h.clean();
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});
test('error surface unload failure is public and retains the original compatibility cause',()=>{
 const h=host(keys.filter(k=>k!==keys[1])),cause=new Error('ERROR_SURFACE_RELEASE_DENIED');
 h.specs.set('shell.overlay',{type:'slot',name:'shell.overlay',kind:'list',scope:'root'});
 const original=globalThis.window,events=[];globalThis.window={dispatchEvent:event=>{events.push(event);return true;}};
 const register=h.ctx.slots.register;
 h.ctx.slots.register=(spec,component)=>{const release=register(spec,component);return spec.id==='hanamesh-brand:error'?()=>{throw cause;}:release;};
 try{brand.apply(h.ctx);formalCommit(h);assert.throws(()=>h.unload(),error=>error instanceof AggregateError&&error.errors[1]===cause);
  const rejection=events.at(-1).detail;assert.equal(rejection.code,'BRAND_SLOT_MISSING');assert.equal(rejection.presentation.message,cause.message);
  assert.deepEqual(rejection.state.errorPresentation,{status:'failed',slots:1,waits:1});
  assert.equal(h.entries.get('shell.overlay').spec.id,'hanamesh-brand:error','failed release must not report the surface removed');
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});
