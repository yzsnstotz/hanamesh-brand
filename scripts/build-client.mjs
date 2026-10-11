import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
// Match the formal DSH closure-factory protocol. React stays in the host module table.
await build({
  entryPoints:['src/client/index.ts'], outfile:'lib/client.js', bundle:true,
  platform:'browser', format:'cjs', target:'es2022', external:pkg.dsh.client.external,
  banner:{js:`window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer:{js:'return module.exports;}});'},
});
