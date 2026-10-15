import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.deepEqual(Object.keys(pkg.dsh),['client','bundle']);
assert.equal(pkg.dsh.bundle.patch,'./cordis.patch.yml');
assert.equal(pkg.peerDependencies['@deepseek-ai/cordis'],'4.0.5-alpha.1');
assert.equal(pkg.exports['.'].default,'./lib/index.js');
assert.equal(pkg.dsh.client.platform,'web');
assert.deepEqual(pkg.dsh.client.external,['react']);
assert.equal(pkg.exports['./client'].default,'./lib/client.js');
assert.equal(pkg.exports['./client'].node,'./lib/client/index.js');
assert.equal(pkg.exports['./client'].types,'./lib/client/index.d.ts');
for(const name of pkg.dsh.client.inject) assert.equal(pkg.peerDependencies[name],'0.2.1-alpha.2',name);
const [pack]=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8'}));
const expected=['cordis.patch.yml','lib/index.js','lib/index.d.ts','COMPATIBILITY.md','OPEN_SOURCE.md','README.md','lib/client.js','lib/client/Brand.d.ts','lib/client/Brand.js','lib/client/index.d.ts','lib/client/index.js','package.json'];
assert.deepEqual(pack.files.map(f=>f.path).sort(),expected.sort());
console.log(JSON.stringify({clientPresentationOnly:true,hostMetadataOnly:true,publishedFiles:pack.files.map(f=>f.path),sourceAndCacheExcluded:true}));
