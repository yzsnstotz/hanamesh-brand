import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const require = createRequire(import.meta.url);
const expected = {
  './assets/favicon.svg': './assets/favicon.svg',
  './assets/welcome-brand.svg': './assets/welcome-brand.svg',
  './assets/manifest.json': './assets/manifest.json',
  './assets/source-license.txt': './assets/source-license.txt',
  './ASSETS.md': './ASSETS.md',
};

test('static asset public paths resolve without loading the Brand runtime', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  for (const [key, target] of Object.entries(expected)) {
    assert.equal(pkg.exports[key], target, `${key} must be an explicit public file path`);
    assert.ok((await readFile(require.resolve(pkg.name + key.slice(1)))).length > 0);
  }
});

test('asset manifest describes exact portable SVG bytes and honest license provenance', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url)));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.provenance.repository, 'https://github.com/yzsnstotz/hanamesh-desktop-electron.git');
  assert.equal(manifest.provenance.sourceCommit, '60efccc00c6a160bf9bddd0d137de14946a5e69a');
  assert.equal(manifest.license.status, 'unknown');
  assert.equal(manifest.license.spdx, null);
  assert.equal(manifest.license.sourceRepositoryLicense, 'MIT');
  assert.equal(manifest.license.notice, './assets/source-license.txt');
  assert.deepEqual(manifest.assets.map(row => row.path), ['assets/favicon.svg', 'assets/welcome-brand.svg']);
  for (const row of manifest.assets) {
    const bytes = await readFile(new URL('../' + row.path, import.meta.url));
    assert.equal(row.sourcePath, 'packaging/' + row.path);
    assert.equal(row.mediaType, 'image/svg+xml');
    assert.equal(row.bytes, bytes.length);
    assert.equal(row.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(row.integrity, 'sha512-' + createHash('sha512').update(bytes).digest('base64'));
    const svg = bytes.toString('utf8');
    assert.match(svg, new RegExp(`width="${row.width}" height="${row.height}"`));
    assert.match(svg, /href="data:image\/png;base64,/);
    assert.doesNotMatch(svg, /<script\b|\bon\w+=|(?:href|src)="https?:/i);
  }
  const notice = await readFile(new URL('../assets/source-license.txt', import.meta.url), 'utf8');
  assert.match(notice, /MIT License/);
  assert.match(notice, /Copyright \(c\) 2026 DeepSeek/);
});

test('normal npm pack includes all public static assets and their documentation', () => {
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {encoding: 'utf8'}));
  for (const target of Object.values(expected)) {
    assert.ok(pack.files.some(row => row.path === target.slice(2)), `${target} missing from normal archive`);
  }
});
