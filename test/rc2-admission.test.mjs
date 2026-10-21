import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('runtime admission lists only proven alpha and official rc2 versions; lock keeps the tested alpha build closure',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
 const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url)));
 for(const name of pkg.dsh.client.inject){
  assert.deepEqual(pkg.peerDependencies[name].split(' || '),['0.2.1-alpha.2','0.2.1-rc.2']);
  assert.equal(lock.packages['node_modules/'+name].version,'0.2.1-alpha.2');
 }
 assert.deepEqual(pkg.peerDependencies['@deepseek-ai/cordis'].split(' || '),['4.0.5-alpha.1','4.0.5']);
 assert.deepEqual(lock.packages[''].peerDependencies,pkg.peerDependencies);
 assert.equal(pkg.peerDependencies.react,'18.3.1');
});
