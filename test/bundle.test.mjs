import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as React from 'react';
import {inject} from '../src/client/index.ts';

test('published default client entry registers one DSH closure factory with shared React', async () => {
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  const source=await readFile(new URL('../'+pkg.exports['./client'].default,import.meta.url),'utf8');
  const registrations=[];
  vm.runInNewContext(source,{window:{__ModuleLoader__:{load:r=>registrations.push(r)}}});
  assert.equal(registrations.length,1);
  assert.equal(registrations[0].id,pkg.name);
  const requests=[];
  const client=registrations[0].factory(spec=>{
    requests.push(spec);assert.equal(spec,'react');return React;
  });
  assert.equal(typeof client.apply,'function');
  assert.deepEqual(Array.from(client.inject),inject);
  assert.deepEqual(requests,['react']);
  assert.deepEqual(Object.keys(pkg.dsh),['client','bundle']);
  assert.equal(pkg.dsh.bundle.patch,'./cordis.patch.yml');
});
