import test from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readdir, symlink, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {homedir} from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = process.env.HANAMESH_RUN_DIR
  ?? join(homedir(), '.cache', 'hanamesh-runs', 'J1S2-BRAND-02');

async function fixture(kind) {
  await mkdir(runtime, {recursive: true});
  const dir = await mkdtemp(join(runtime, `verification-entry-${kind}-`));
  for (const path of ['src', 'package.json', 'tsconfig.json', '.npmrc']) {
    await cp(join(root, path), join(dir, path), {recursive: true});
  }
  await mkdir(join(dir, 'scripts'));
  for (const name of await readdir(join(root, 'scripts'))) {
    if (name !== 'segflow-plugin.test.mjs') {
      await cp(join(root, 'scripts', name), join(dir, 'scripts', name), {recursive: true});
    }
  }
  await mkdir(join(dir, 'test'));
  // Keep the actual existing assertions; omit this regression to avoid recursion.
  for (const name of ['client.test.mjs', 'bundle.test.mjs']) {
    await cp(join(root, 'test', name), join(dir, 'test', name));
  }
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  if (kind === 'rejected') {
    await writeFile(join(dir, 'scripts', 'segflow-plugin.test.mjs'),
      "throw new Error('SEGFLOW_VERIFICATION_REJECTED');\n");
  }
  return dir;
}

for (const kind of ['missing', 'rejected']) {
  test(`card npm test fails when the mandatory plugin verification entry is ${kind}`, async () => {
    const dir = await fixture(kind);
    // Start an independent test runner, not a recursively invoked worker.
    const env = {...process.env};
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync('npm', ['test'], {cwd: dir, encoding: 'utf8', env});
    assert.ifError(result.error);
    const output = result.stdout + result.stderr;
    await writeFile(join(dir, 'npm-test.log'), output);
    await writeFile(join(dir, 'result.json'), JSON.stringify({
      kind, command: ['npm', 'test'], cwd: dir, exitCode: result.status,
    }, null, 2) + '\n');
    assert.equal(result.status, 1,
      `card test must reject ${kind} verification entry; evidence: ${dir}/npm-test.log`);
    assert.match(output, kind === 'missing'
      ? /segflow-plugin\.test\.mjs/
      : /SEGFLOW_VERIFICATION_REJECTED/);
  });
}
