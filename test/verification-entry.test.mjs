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

// Mechanism §4.1 separates the source card gate from product verification.
// These tests invoke the fixed command only to check rejection; they never
// supply a product environment or treat simulated-host success as acceptance.
const command = ['--test', '--test-reporter=tap', 'scripts/segflow-plugin.test.mjs'];
for (const kind of ['missing', 'rejected']) {
  test(`fixed plugin verify propagates a ${kind} verification entry`, async () => {
    const dir = await fixture(kind);
    // Start an independent test runner, not a recursively invoked worker.
    const env = {...process.env};
    delete env.NODE_TEST_CONTEXT;
    delete env.SEGFLOW_ENV_DIR;
    delete env.SEGFLOW_PORT_CLIENT;
    const result = spawnSync(process.execPath, command, {cwd: dir, encoding: 'utf8', env});
    assert.ifError(result.error);
    const output = result.stdout + result.stderr;
    await writeFile(join(dir, 'verify.log'), output);
    await writeFile(join(dir, 'result.json'), JSON.stringify({
      kind, command: [process.execPath, ...command], cwd: dir, exitCode: result.status,
    }, null, 2) + '\n');
    assert.equal(result.status, 1,
      `fixed verify must reject ${kind} entry; evidence: ${dir}/verify.log`);
    assert.match(output, kind === 'missing'
      ? /segflow-plugin\.test\.mjs/
      : /SEGFLOW_VERIFICATION_REJECTED/);
  });
}
