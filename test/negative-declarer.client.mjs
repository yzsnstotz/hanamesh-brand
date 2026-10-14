// FIXTURE ONLY: normally installed addon in the real fixed Desktop. This
// controls only its own public declarations; it never renders a fake app,
// mutates another provider, triggers brand validation or exposes a Context.
import {createElement, useState} from 'react';
export const name = 'hanamesh-brand-negative-declarer';
export const inject = ['slots'];
export const fixtureModes = ['compatible', 'missing:sidebar.brand.mark', 'missing:sidebar.brand.name',
  'missing:conversation.hero.brand.mark', 'kind', 'scope'];
const keys = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
export function apply(ctx, config = {}) {
  const initialMode = config.mode ?? 'compatible';
  if (!fixtureModes.includes(initialMode)) throw Error('BRAND_FIXTURE_MODE_INVALID: ' + initialMode);
  ctx.effect(() => {
    let release, mode = initialMode;
    const withdraw = () => { release?.(); release = undefined; };
    function Controls() {
      const [, refresh] = useState(0), [error, setError] = useState('');
      const act = run => {
        setError('');
        try { run(); } catch (cause) { setError('BRAND_FIXTURE_DECLARATION_FAILED: ' + String(cause)); }
        refresh(value => value + 1);
      };
      const declare = () => {
        if (release) throw Error('withdraw the current fixture declaration before redeclaring');
        const children = Object.fromEntries(keys.filter(key => mode !== 'missing:' + key).map(key => [key,
          key === keys[2] && mode === 'kind' ? {kind: 'chain', scope: 'root'}
          : key === keys[2] && mode === 'scope' ? {kind: 'single', scope: 'session'}
          : {kind: 'single', scope: 'root'}]));
        // Public additive seat; original real declarers must first be normally
        // disabled. A collision is a real setup failure, never patched away.
        release = ctx.slots.inject('shell.overlay', () => ctx.slots.register({name: 'shell.overlay', id: name + ':declarations',
          label: 'Brand declaration fixture', children}, () => null));
      };
      return createElement('section', {'aria-label': 'Brand declaration fixture'},
        createElement('select', {'aria-label': 'Brand fixture mode', defaultValue: mode, disabled: !!release,
          onChange: event => { mode = event.target.value; }},
        ...fixtureModes.map(value => createElement('option', {key: value, value}, value))),
        createElement('button', {type: 'button', onClick: () => act(declare), disabled: !!release}, 'Brand fixture: declare'),
        createElement('button', {type: 'button', onClick: () => act(withdraw), disabled: !release}, 'Brand fixture: withdraw'),
        createElement('output', {'aria-label': 'Brand fixture declaration status'}, release ? 'declared' : 'withdrawn'),
        createElement('output', {'aria-label': 'Brand fixture declarations'}, JSON.stringify((function read(nodes) {
          return nodes.flatMap(node => [...(node.type === 'slot' && keys.includes(node.name)
            ? [{name: node.name, kind: node.kind, scope: node.scope, declaredBy: node.declaredBy}] : []), ...read(node.children ?? [])]);
        })(ctx.slots.snapshot()))),
        error && createElement('p', {role: 'alert'}, error));
    }
    const stop = ctx.slots.inject('shell.overlay', () => ctx.slots.register({name: 'shell.overlay',
      id: name + ':controls', label: 'Brand fixture controls'}, Controls));
    return () => { try { withdraw(); } finally { stop(); } };
  }, 'brand-fixture:declarations-and-controls');
}

// Normal packaging input for the module's fixture producer after review. The
// Host face is metadata activation only; all fixture behavior is client-side.
// These are own test files, not an invented Desktop prepare/ready endpoint.
export const packageInputs = Object.freeze({
  manifest: {name, version: '0.0.0', private: true, type: 'module', license: 'MIT',
    files: ['lib', 'cordis.patch.yml'],
    exports: {'.': './lib/index.js', './client': {default: './lib/client.js'},
      './cordis.patch.yml': './cordis.patch.yml', './package.json': './package.json'},
    dsh: {client: {inject: ['@deepseek-ai/dsh-client-ui-renderer'], platform: 'web', external: ['react']},
      bundle: {patch: ['./cordis.patch.yml']}},
    peerDependencies: {'@deepseek-ai/dsh-client-ui-renderer': '0.2.1-alpha.2'}},
  hostSource: "export const name = 'hanamesh-brand-fixture-metadata';\nexport function apply() {}\n",
  patch: '- insert:\n    - id: brand-lifecycle-fixture\n      name: hanamesh-brand-negative-declarer\n      config:\n        mode: compatible\n',
});
