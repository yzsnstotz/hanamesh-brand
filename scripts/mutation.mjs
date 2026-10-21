import assert from 'node:assert/strict';
import {cp,readFile,writeFile,mkdtemp,symlink,rm,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(new URL('..',import.meta.url).pathname);
const option=process.argv.indexOf('--run-dir');
assert.ok(option>=0 && process.argv[option+1],'MUTATION_RUN_DIR_REQUIRED: pass --run-dir with this card runtime directory');
const run=resolve(process.argv[option+1]);await mkdir(run,{recursive:true});
const source=await readFile(join(root,'src/client/index.ts'),'utf8');
const mutants=[
  ['missing-sidebar-name',"['sidebar.brand.name', HanaMeshName],",'','registers all three named brand slots'],
  ['missing-hero-mark',"['conversation.hero.brand.mark', HanaMeshMark],",'','registers all three named brand slots'],
  ['wrong-dark-color',"dark: '#a99aff'","dark: '#000000'",'overrides business color in both palettes'],
  ['no-disposal','return unload;','return () => {};','registers all three named brand slots'],
  ['no-failure-rollback','for (const resource of [...resources].reverse()) {','for (const resource of []) {','setup failure rolls back earlier contributions'],
];
const results=[];
for(const [name,old,replacement,expected] of mutants){
  assert.ok(source.includes(old),`mutation anchor missing: ${name}`);
  const scratch=await mkdtemp(join(run,'mutation-'));
  try {
    for(const path of ['src','test','lib','package.json']) await cp(join(root,path),join(scratch,path),{recursive:true});
    await symlink(join(root,'node_modules'),join(scratch,'node_modules'),'dir');
    await writeFile(join(scratch,'src/client/index.ts'),source.replace(old,replacement));
    const result=spawnSync(process.execPath,['--experimental-strip-types','--test','test/client.test.mjs'],{cwd:scratch,encoding:'utf8'});
    assert.equal(result.status,1,`${name} must be caught by behavioral assertions`);
    assert.ok(result.stdout.includes('✖ '+expected),`${name} must fail the intended behavior, not a harness error`);
    const log=join(run,`mutation-${name}.log`);await writeFile(log,result.stdout+result.stderr);
    results.push({name,exitCode:result.status,behavior:expected,log,sourceSha256:createHash('sha256').update(source).digest('hex')});
  } finally {await rm(scratch,{recursive:true,force:true});}
}
await writeFile(join(run,'mutation-results.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({killed:results.length,total:mutants.length,results}));
