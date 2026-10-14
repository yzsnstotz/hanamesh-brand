import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

const verification = process.argv.includes('--verification');
for (const option of process.argv.slice(2)) if (option !== '--verification') throw Error('BRAND_BUILD_OPTION_INVALID: ' + option);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
// Match the formal DSH closure-factory protocol. React stays in the host module table.
await build({
  entryPoints:['src/client/index.ts'], outfile:'lib/client.js', bundle:true,
  platform:'browser', format:'cjs', target:'es2022', external:pkg.dsh.client.external,
  define:{__HANAMESH_BRAND_VERIFICATION__:String(verification)}, treeShaking:true, minifySyntax:true,
  banner:{js:`window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer:{js:'return module.exports;}});'},
});
