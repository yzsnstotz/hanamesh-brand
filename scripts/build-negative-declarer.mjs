// FIXTURE packaging only: no installation, profile change, or service startup.
import {build} from 'esbuild';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {packageInputs} from '../test/negative-declarer.client.mjs';

if (process.argv.length !== 4 || process.argv[2] !== '--out-dir')
  throw Error('BRAND_FIXTURE_OUTPUT_REQUIRED: --out-dir <isolated directory>');
const output = resolve(process.argv[3]);
const {manifest, hostSource, patch} = packageInputs;
const id = manifest.name;
await mkdir(join(output, 'lib'), {recursive: true});
await build({entryPoints: ['test/negative-declarer.client.mjs'], outfile: join(output, 'lib/client.js'),
  bundle: true, platform: 'browser', format: 'cjs', target: 'es2022',
  external: manifest.dsh.client.external,
  banner: {js: `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer: {js: 'return module.exports;}});'},
});
await writeFile(join(output, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(join(output, 'lib/index.js'), hostSource);
await writeFile(join(output, 'cordis.patch.yml'), patch);
console.log(JSON.stringify({fixture: id, directory: output, installsOrStartsServices: false}));
