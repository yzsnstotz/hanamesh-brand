import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {version as esbuildVersion} from 'esbuild';

assert.equal(Number(process.versions.node.split('.')[0]),24,'Brand verification requires Node 24');
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
for(const name of ['typescript','esbuild']) {
  const installed=JSON.parse(await readFile(new URL(`../node_modules/${name}/package.json`,import.meta.url),'utf8'));
  assert.equal(installed.version,pkg.devDependencies[name],`${name} must match its exact pin`);
}
console.log(JSON.stringify({node:process.version,esbuild:esbuildVersion,typescript:pkg.devDependencies.typescript}));
