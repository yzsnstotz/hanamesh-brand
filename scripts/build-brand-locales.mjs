import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const locales = new URL('packages/hanamesh-brand-locales/', root);
const manifest = JSON.parse(await readFile(new URL('package.json', locales), 'utf8'));
const brand = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
if (manifest.version !== brand.version) throw Error('Brand locale output version differs from Brand');

await build({
  entryPoints: [fileURLToPath(new URL('client.mjs', locales))],
  outfile: fileURLToPath(new URL('lib/client.js', locales)),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  minifySyntax: true,
  banner: {js: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer: {js: 'return module.exports;}});'},
});
