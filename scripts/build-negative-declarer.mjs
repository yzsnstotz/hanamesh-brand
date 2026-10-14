// FIXTURE packaging only: no installation, profile change, or service startup.
import {build} from 'esbuild';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';

if (process.argv.length !== 4 || process.argv[2] !== '--out-dir')
  throw Error('BRAND_FIXTURE_OUTPUT_REQUIRED: --out-dir <isolated directory>');
const output = resolve(process.argv[3]);
const id = 'hanamesh-brand-negative-declarer';
await mkdir(join(output, 'lib'), {recursive: true});
await build({entryPoints: ['test/negative-declarer.client.mjs'], outfile: join(output, 'lib/client.js'),
  bundle: true, platform: 'browser', format: 'cjs', target: 'es2022',
  banner: {js: `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer: {js: 'return module.exports;}});'},
});
await writeFile(join(output, 'package.json'), JSON.stringify({name: id, version: '0.0.0', private: true,
  description: 'FIXTURE ONLY: negative public slot declarer for isolated program CLIENT',
  license: 'MIT', files: ['lib'], exports: {'./client': './lib/client.js'},
  dsh: {client: {inject: ['@deepseek-ai/dsh-client-ui-renderer'], platform: 'web'}},
  peerDependencies: {'@deepseek-ai/dsh-client-ui-renderer': '0.2.0-rc.2'},
}, null, 2) + '\n');
console.log(JSON.stringify({fixture: id, directory: output, installsOrStartsServices: false}));
