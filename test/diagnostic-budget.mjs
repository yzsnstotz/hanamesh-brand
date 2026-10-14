// Test infrastructure only. A deadline diagnoses an unfinished operation;
// it never determines slot incompatibility, adds a retry, or changes the product.
export const DEFAULT_BUDGETS = Object.freeze({cdpConnectMs: 30000, uiOperationMs: 30000,
  lifecycleSignalMs: 15000, productCaseMs: 120000, teardownMs: 5000});
export const TIMER_MAX_MS = 2147483647; // Node timer representable upper bound, not a security policy
export function budgets(overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw Error('DIAGNOSTIC_BUDGET_INVALID: expected a named millisecond object');
  for (const [name, ms] of Object.entries(overrides)) {
    if (!Object.hasOwn(DEFAULT_BUDGETS, name) || !Number.isInteger(ms) || ms < 1 || ms > TIMER_MAX_MS)
      throw Error(`DIAGNOSTIC_BUDGET_INVALID: ${name}=${ms}; expected 1..${TIMER_MAX_MS} ms`);
  }
  return Object.freeze({...DEFAULT_BUDGETS, ...overrides});
}
export class DiagnosticBudget {
  #timers = new Set();
  #active = new Set();
  constructor(config = budgets(), evidence = () => ({})) {
    this.config = config; this.evidence = evidence;
  }
  get resources() { return {timers: this.#timers.size, operations: this.#active.size}; }
  run(name, label, operation, parentSignal) {
    const ms = this.config[name];
    if (!Number.isInteger(ms)) return Promise.reject(Error('DIAGNOSTIC_BUDGET_INVALID: ' + name));
    if (parentSignal?.aborted) return Promise.reject(parentSignal.reason);
    return new Promise((resolve, reject) => {
      const controller = new AbortController(), started = performance.now();
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true; clearTimeout(timer); this.#timers.delete(timer);
        parentSignal?.removeEventListener('abort', cancelled); this.#active.delete(controller);
        if (error) { controller.abort(error); reject(error); } else resolve(value);
      };
      const cancelled = () => finish(parentSignal.reason ?? Error('verification cancelled'));
      const unfinished = cause => {
        const error = new Error(`DIAGNOSTIC_UNFINISHED: ${label}; ${name}=${ms}ms; signal/assembly not completed`, {cause});
        error.code = 'DIAGNOSTIC_UNFINISHED'; error.budget = name; error.budgetMs = ms;
        error.elapsedMs = performance.now() - started; error.evidence = this.evidence();
        return error;
      };
      const timer = setTimeout(() => finish(unfinished()), ms);
      this.#timers.add(timer); this.#active.add(controller);
      parentSignal?.addEventListener('abort', cancelled, {once: true});
      // Both outcomes remain handled if a bounded transport finishes after cancellation.
      Promise.resolve().then(() => operation(controller.signal)).then(
        value => finish(undefined, value), error =>
          finish(error?.name === 'TimeoutError' ? unfinished(error) : error));
    });
  }
}
