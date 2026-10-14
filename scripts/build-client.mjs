import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

const verification = process.argv.includes('--verification');
for (const option of process.argv.slice(2)) if (option !== '--verification') throw Error('BRAND_BUILD_OPTION_INVALID: ' + option);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
// The public client loader calls apply(ctx) without forwarding Host config.
// Only this observation build opts into the existing read-only verification;
// the release keeps the original entry and its disabled default unchanged.
const entry = verification ? {stdin: {
  contents: `export * from './src/client/index.ts';
import {apply as applyBrand} from './src/client/index.ts';
export function apply(ctx) { return applyBrand(ctx, {verification: {enabled: true}}); }
`, resolveDir: process.cwd(), sourcefile: 'brand-verification-entry.ts', loader: 'ts',
}} : {entryPoints:['src/client/index.ts']};
// Match the formal DSH closure-factory protocol. React stays in the host module table.
await build({
  ...entry, outfile:'lib/client.js', bundle:true,
  platform:'browser', format:'cjs', target:'es2022', external:pkg.dsh.client.external,
  define:{__HANAMESH_BRAND_VERIFICATION__:String(verification)}, treeShaking:true, minifySyntax:true,
  banner:{js:`window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer:{js:'return module.exports;}});'},
});
