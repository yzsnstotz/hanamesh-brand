import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// The direct segflow command does not run npm's pretest lifecycle.
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync('npm', ['run', 'build'], {cwd: root, stdio: 'inherit'});

// Preserve the existing assertions and propagate every failure to node:test.
await import('../test/client.test.mjs');
await import('../test/bundle.test.mjs');
