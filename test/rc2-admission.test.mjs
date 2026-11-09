import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import semver from 'semver';

test('runtime compatibility ranges admit the 0.2.x host line and preserve the frozen alpha build closure',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
 const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url)));
 for(const name of pkg.dsh.client.inject){
  assert.equal(pkg.peerDependencies[name],'>=0.2.0-rc.2 <0.3.0-0 || >=0.2.1-0 <0.3.0-0 || >=0.2.2-0 <0.3.0-0');
  for(const version of ['0.2.0-rc.2','0.2.1-alpha.2','0.2.1-rc.2','0.2.2-rc.1','0.2.2','0.2.9']) assert(semver.satisfies(version,pkg.peerDependencies[name]),name+' '+version);
  for(const version of ['0.1.9','0.2.0-rc.1','0.2.3-rc.1','0.3.0-rc.1','0.3.0']) assert(!semver.satisfies(version,pkg.peerDependencies[name]),name+' '+version);
  assert.equal(lock.packages['node_modules/'+name].version,'0.2.1-alpha.2');
 }
 const cordis=pkg.peerDependencies['@deepseek-ai/cordis'];
 assert.equal(cordis,'>=4.0.4 <4.2.0-0 || >=4.0.5-alpha.1 <4.2.0-0');
 for(const version of ['4.0.4','4.0.5-alpha.1','4.0.5','4.1.0']) assert(semver.satisfies(version,cordis),version);
 for(const version of ['4.0.3','4.1.0-alpha.1','4.2.0-rc.1','4.2.0']) assert(!semver.satisfies(version,cordis),version);
 assert.deepEqual(lock.packages[''].peerDependencies,pkg.peerDependencies);
 assert.deepEqual(lock.packages[''].engines,pkg.engines);
 assert.equal(pkg.peerDependencies.react,'^18.3.1');
 assert.equal(pkg.engines.node,'>=24.13.1 <25');
});
