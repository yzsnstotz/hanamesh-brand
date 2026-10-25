// Explicit source/API probe; no application boot, user profile, or server.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire, registerHooks} from 'node:module';
import {mkdtemp, mkdir, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as brand from '../src/client/index.ts';

const option = process.argv.indexOf('--upstream');
assert.ok(option >= 0 && process.argv[option + 1], 'pass --upstream <target desktop checkout>');
const upstream = resolve(process.argv[option + 1]);
const root = fileURLToPath(new URL('../', import.meta.url));
const upstreamRequire = createRequire(join(upstream, 'package.json'));
const {tsImport} = await import(upstreamRequire.resolve('tsx/esm/api'));
const source = path => tsImport(pathToFileURL(join(upstream, path)).href, import.meta.url);
const {loadProfileDirectory, composeEntries} = await source('packages/boot/app-boot/src/profile.ts');
const {SlotRegistry} = await source('packages/client/ui-renderer/src/client/registry.ts');
// Node does not render the imported official components; CSS is an empty test asset.
const assets = registerHooks({load(url, context, nextLoad) {
  if (new URL(url).pathname.endsWith('.css')) return {format: 'module', source: 'export default {}', shortCircuit: true};
  return nextLoad(url, context);
}});
const official = await source('packages/client/ui-brand-official/src/client/index.ts');
assets.deregister();
const {Context} = await import(pathToFileURL(join(upstream, 'vendor/cordis/lib/index.js')).href);
const {default: Loader} = await import(pathToFileURL(join(upstream, 'vendor/loader/lib/index.js')).href);
const keys = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];

test('target profile composes the installed brand bundle and Loader activates its metadata row', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hanamesh-brand-profile-'));
  const ctx = new Context();
  try {
    await mkdir(join(dir, 'node_modules/@hanamesh'), {recursive: true});
    await symlink(root, join(dir, 'node_modules/@hanamesh/brand'), 'dir');
    await writeFile(join(dir, 'package.json'), JSON.stringify({private: true, type: 'module',
      dsh: {profile: {bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@hanamesh/brand']}}}));
    const profile = loadProfileDirectory('brand-api', dir, join(upstream, 'apps/cli/package.json'), {userLayer: false});
    assert.deepEqual(profile.skippedBundles, []);
    const rows = composeEntries(profile.layers.map(layer => layer.patches));
    const own = rows.filter(row => row.name === '@hanamesh/brand');
    assert.equal(own.length, 1, 'exactly one own Host row, leaving official brand enabled');
    assert.equal(own[0].id, 'hanamesh-brand');
    assert.ok(rows.some(row => row.id === 'ui-brand-official' && !row.disabled));
    ctx.baseUrl = pathToFileURL(dir).href + '/';
    await ctx.plugin(Loader);
    await ctx.loader.create(own[0]);
    await ctx.loader.await();
    const entry = [...ctx.loader.entries()].find(entry => entry.options.id === 'hanamesh-brand');
    assert.ok(entry?.fiber, 'real Loader imported the package root and created an active fiber');
    await entry.fiber.await();
  } finally {
    await ctx.fiber.dispose();
    await rm(dir, {recursive: true, force: true});
  }
});

for (const officialFirst of [true, false]) test(`target SlotRegistry preserves official occupants while HanaMesh wins (${officialFirst ? 'official first' : 'brand first'})`, async () => {
  const ctx = new Context();
  const previous = process.env.DSH_CLIENT_BUILD_PROFILE;
  process.env.DSH_CLIENT_BUILD_PROFILE = 'official';
  try {
    await ctx.plugin(SlotRegistry).await();
    // Isolated locale/theme faces; election and declaration lifetimes use the real registry.
    ctx.provide('locale', {register: () => () => {}});
    ctx.provide('theme', {overrideTokens: () => () => {}});
    const declare = () => ctx.slots.register({name: 'root', children: Object.fromEntries(
      keys.map(key => [key, {kind: 'single', scope: 'root'}]))}, () => null);
    let release = declare();
    let brandFiber;
    const installBrand = async () => { brandFiber = ctx.plugin(brand); await brandFiber.await(); };
    if (officialFirst) { await ctx.plugin(official).await(); await installBrand(); }
    else { await installBrand(); await ctx.plugin(official).await(); }
    const check = () => {
      for (const key of keys) {
        const occupants = ctx.slots.entries(key);
        assert.equal(occupants.length, key.startsWith('sidebar.') ? 2 : 1);
        assert.equal(ctx.slots.entriesOfSlot(key)[0].options.id, 'hanamesh-brand', key);
      }
    };
    check();
    brand.validateSlots(brandFiber.ctx);
    release(); release = declare(); check();
    await brandFiber.dispose();
    for (const key of keys.slice(0, 2)) {
      assert.equal(ctx.slots.entriesOfSlot(key).length, 1, 'official occupant restored');
      assert.notEqual(ctx.slots.entriesOfSlot(key)[0].options.id, 'hanamesh-brand');
    }
    assert.equal(ctx.slots.entriesOfSlot(keys[2]).length, 0);
    release();
  } finally {
    if (previous === undefined) delete process.env.DSH_CLIENT_BUILD_PROFILE;
    else process.env.DSH_CLIENT_BUILD_PROFILE = previous;
    await ctx.fiber.dispose();
  }
});
