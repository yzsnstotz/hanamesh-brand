import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import vm from 'node:vm';

const option = process.argv.indexOf('--consumer');
assert.ok(option >= 0 && process.argv[option + 1], 'PACKAGE_CONSUMER_REQUIRED: pass --consumer with an isolated installed consumer');
const require = createRequire(resolve(process.argv[option + 1], 'package.json'));
const pkg = require('@hanamesh/brand/package.json');
const manifest = JSON.parse(await readFile(require.resolve('@hanamesh/brand/assets/manifest.json')));
assert.equal(manifest.license.status, 'unknown');
assert.equal(manifest.license.spdx, null);
assert.equal(manifest.license.sourceRepositoryLicense, 'MIT');
assert.equal(manifest.assets.length, 2);
const assets = [];
for (const row of manifest.assets) {
  const specifier = '@hanamesh/brand/' + row.path;
  assert.equal(pkg.exports['./' + row.path], './' + row.path);
  const bytes = await readFile(require.resolve(specifier));
  assert.equal(bytes.length, row.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
  assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), row.integrity);
  assets.push({specifier, bytes: bytes.length, sha256: row.sha256, integrity: row.integrity});
}
assert.match(await readFile(require.resolve('@hanamesh/brand/assets/source-license.txt'), 'utf8'), /Copyright \(c\) 2026 DeepSeek/);
assert.match(await readFile(require.resolve('@hanamesh/brand/ASSETS.md'), 'utf8'), /unknown/);
const metadata = require('@hanamesh/brand');
assert.equal(typeof metadata.apply, 'function');
assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
const patch=await readFile(require.resolve('@hanamesh/brand/cordis.patch.yml'), 'utf8');
assert.match(patch, /id: hanamesh-brand/);
assert.match(patch, /name: '@hanamesh\/brand'/);
const clientFile = resolve(require.resolve('@hanamesh/brand/package.json'), '..', pkg.exports['./client'].default);
const registrations = [];
vm.runInNewContext(await readFile(clientFile, 'utf8'), {window: {__ModuleLoader__: {load: row => registrations.push(row)}}});
assert.equal(registrations.length, 1);
assert.equal(registrations[0].id, pkg.name);
const requested = [];
const client = registrations[0].factory(specifier => {
  requested.push(specifier);
  assert.equal(specifier, 'react');
  return require('react');
});
assert.equal(typeof client.apply, 'function');
assert.deepEqual(requested, ['react']);
assert.deepEqual(Array.from(client.inject), ['slots', 'locale', 'theme']);
console.log(JSON.stringify({evidence: 'PACKAGE_CONSUMER', package: pkg.name, version: pkg.version, assets, hostMetadata: true, clientClosure: true, sharedReact: require('react').version, assetLicense: manifest.license.status}, null, 2));
