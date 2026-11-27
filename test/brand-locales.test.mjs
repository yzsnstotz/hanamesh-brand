import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const root = new URL('../packages/hanamesh-brand-locales/', import.meta.url);
const brand = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const registrations = [];
const source = await readFile(new URL(manifest.exports['./client'], root), 'utf8');
vm.runInNewContext(source, {window: {__ModuleLoader__: {load: row => registrations.push(row)}}});
const client = registrations[0].factory(() => assert.fail('the language pack has no browser module dependencies'));
const builtIn = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt'];

function fixture() {
  const languages = new Map(builtIn.map(id => [id, id]));
  const dictionaries = new Map();
  const disposers = [];
  return {
    languages, dictionaries,
    get unload() { return disposers[0]; },
    ctx: {
      locale: {
        addLanguage({id, label, fallback}) {
          assert.equal(fallback, 'en');
          if (languages.has(id)) throw Error(`duplicate locale ${id}`);
          languages.set(id, label);
          return () => languages.delete(id);
        },
        register(namespace, id, dictionary) {
          assert.ok(languages.has(id));
          const key = `${id}:${namespace}`;
          if (dictionaries.has(key)) throw Error(`duplicate dictionary ${key}`);
          dictionaries.set(key, dictionary);
          return () => dictionaries.delete(key);
        },
      },
      effect(run) { disposers.push(run()); },
    },
  };
}

test('the independent DSH bundle adds three owned languages and leaves shipped languages intact on unload', () => {
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].id, '@hanamesh/brand-locales');
  assert.equal(manifest.version, brand.version);
  assert.deepEqual(Array.from(client.inject), ['locale']);
  const runtime = fixture();
  client.apply(runtime.ctx);
  const expected = new Map([
    ['ko', ['한국어', '언어']],
    ['vi', ['Tiếng Việt', 'Ngôn ngữ']],
    ['id', ['Bahasa Indonesia', 'Bahasa']],
  ]);
  for (const [id, [label, title]] of expected) {
    assert.equal(runtime.languages.get(id), label);
    assert.equal(runtime.dictionaries.get(`${id}:settings.locale`)['language.title'], title);
    assert.equal([...runtime.dictionaries].filter(([name]) => name.startsWith(`${id}:`))
      .reduce((total, [, dictionary]) => total + Object.keys(dictionary).length, 0), 4109);
  }
  assert.deepEqual([...runtime.languages.keys()], [...builtIn, ...expected.keys()]);
  assert.ok(runtime.dictionaries.has('vi:common'));
  runtime.unload();
  assert.deepEqual([...runtime.languages.keys()], builtIn);
  assert.equal(runtime.dictionaries.size, 0);
});

test('a DSH registration failure rolls back only this package’s contributions', () => {
  const runtime = fixture();
  runtime.languages.set('vi', 'existing Vietnamese');
  runtime.dictionaries.set('vi:common', {cancel: 'existing'});
  assert.throws(() => client.apply(runtime.ctx), /duplicate locale vi/);
  assert.deepEqual([...runtime.languages.keys()], [...builtIn, 'vi']);
  assert.deepEqual([...runtime.dictionaries], [['vi:common', {cancel: 'existing'}]]);
});
