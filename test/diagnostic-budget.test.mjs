import test from 'node:test';
import assert from 'node:assert/strict';
import {budgets, DiagnosticBudget, TIMER_MAX_MS} from './diagnostic-budget.mjs';

test('missing lifecycle signal gets a named diagnostic and clears deadline resources', async () => {
  const budget = new DiagnosticBudget(budgets({lifecycleSignalMs: 5}), () => ({phase: 'waiting', slotCount: 2}));
  let signal;
  await assert.rejects(budget.run('lifecycleSignalMs', 'actual declaration completion', abort => {
    signal = abort; return new Promise(() => {});
  }), error => error.code === 'DIAGNOSTIC_UNFINISHED' && error.budget === 'lifecycleSignalMs'
    && error.budgetMs === 5 && error.evidence.phase === 'waiting'
    && !error.message.includes('BRAND_SLOT_MISSING'));
  assert.equal(signal.aborted, true);
  assert.deepEqual(budget.resources, {timers: 0, operations: 0});
});
test('parent cancellation preserves its reason and releases pending work', async () => {
  const budget = new DiagnosticBudget(), parent = new AbortController(), reason = new Error('operator cancelled');
  let child;
  const pending = budget.run('uiOperationMs', 'normal UI operation', signal => {
    child = signal; return new Promise(() => {});
  }, parent.signal);
  await Promise.resolve(); parent.abort(reason);
  await assert.rejects(pending, error => error === reason);
  assert.equal(child.aborted, true); assert.deepEqual(budget.resources, {timers: 0, operations: 0});
});
test('success clears timers and original operation failure is not rewritten', async () => {
  const budget = new DiagnosticBudget(), cause = new Error('real CDP transport failure');
  assert.equal(await budget.run('cdpConnectMs', 'CDP', async () => 7), 7);
  await assert.rejects(budget.run('cdpConnectMs', 'CDP', async () => { throw cause; }), error => error === cause);
  assert.deepEqual(budget.resources, {timers: 0, operations: 0});
});
test('diagnostic configuration rejects unknown and unrepresentable values visibly', () => {
  for (const input of [null, [], {toString: 100}, {implicitWaitMs: 100}, {productCaseMs: 0}, {uiOperationMs: TIMER_MAX_MS + 1}])
    assert.throws(() => budgets(input), /DIAGNOSTIC_BUDGET_INVALID/);
  assert.equal(budgets({productCaseMs: 2000}).productCaseMs, 2000);
});

test('explicit Playwright timeout also records the named budget and its original cause', async () => {
  const budget = new DiagnosticBudget(), cause = new Error('locator.click timeout'); cause.name = 'TimeoutError';
  await assert.rejects(budget.run('uiOperationMs', 'normal enable', async () => { throw cause; }),
    error => error.code === 'DIAGNOSTIC_UNFINISHED' && error.budget === 'uiOperationMs'
      && error.budgetMs === 30000 && error.cause === cause);
  assert.deepEqual(budget.resources, {timers: 0, operations: 0});
});
