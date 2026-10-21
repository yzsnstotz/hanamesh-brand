
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const option=process.argv.indexOf('--consumer');
assert.ok(option>=0 && process.argv[option+1],'PROFILE_CONSUMER_REQUIRED: pass --consumer with an isolated installed consumer');
const consumer=resolve(process.argv[option+1]);
const require=createRequire(resolve(consumer,'package.json'));
const anchor=require.resolve('@deepseek-ai/dsh/package.json');
// Resolve the public boot API in its declaring package's dependency scope.
const dshRequire=createRequire(anchor);
const {loadProfile,composeEntries,createRuntimeResolution}=await import(dshRequire.resolve('@deepseek-ai/dsh-app-boot'));
const home=resolve(consumer,'../profile-home');
const profile=loadProfile('dsh','web',anchor,home,{userLayer:false});
assert.deepEqual(profile.skippedBundles,[]);
const entries=composeEntries(profile.layers.map(l=>l.patches));
const names=['dsh-client-ui-renderer','dsh-client-ui-sidebar','dsh-client-ui-conversation','dsh-client-locale','dsh-client-ui-theme'].map(n=>'@deepseek-ai/'+n);
const runtime=await createRuntimeResolution({installAnchor:anchor,profile,home});
console.log('runtime resolution keys',Object.keys(runtime));
const rows=names.map(name=>{
 assert.ok(entries.some(e=>e.name===name),name+' in composed default web profile');
 const actual=runtime.entries.find(e=>e.name===name);assert.ok(actual,name+' in official runtime resolution');
 const path=resolve(actual.packageDir,'package.json');
 return {name,path};
});
for(const row of rows){const pkg=JSON.parse(await readFile(row.path,'utf8'));row.version=pkg.version;assert.equal(row.version,'0.2.1-alpha.2');}
const record={anchor,home,profileDir:profile.dir,layers:profile.layers.map(l=>({packageName:l.packageName,patchPaths:l.patchPaths})),rows,runtime:{...runtime,entries:runtime.entries.filter(e=>names.includes(e.name))}};
await writeFile(resolve(consumer,'../evidence/default-profile.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
