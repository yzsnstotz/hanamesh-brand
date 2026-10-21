import {HanaMeshMark, HanaMeshName, HanaMeshCompatibilityCheckpoint, HanaMeshBrandFailure} from './Brand.ts';

type Dispose = () => void;
/** Only the public composition fields consumed by this plugin. */
export interface CompositionNode {
  type: string; name: string; kind?: string; scope?: string; declaredBy?: string;
  children?: readonly CompositionNode[];
}
export interface ClientContext {
  slots: {
    inject(name: string, run: () => Dispose): Dispose;
    register(spec: {name: string; id: string; order?: number; priority?: number; label: string}, component: unknown): Dispose;
    // Optional for existing structural Node callers; the formal check requires it.
    snapshot?(): readonly CompositionNode[];
  };
  locale: {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): Dispose;
    getLocale?(): {active: string};
    bind?(namespace: string): (key: string) => string;
  };
  theme: {
    getTheme?(): {active: {colorScheme: string; tokens: Record<string, string>}; themes: readonly unknown[]};
  };
  effect(run: () => Dispose, label?: string): unknown;
}
export interface BrandConfig {verification?: {enabled?: boolean}}
export interface BrandState {
  phase: 'waiting' | 'active' | 'rejected' | 'disposed';
  compatibilityCheck: 'pending' | 'passed';
  declarations: CompositionNode[];
  owned: {slots: number; dictionaries: number; themeLayers: number; waits: number};
  otherContributionsPreserved: boolean;
  locale?: string; brandHeadline?: string;
  error?: BrandFailure;
  declarationReadError?: string;
  /** Separate from rolled-back brand contributions; removed on plugin unload. */
  errorPresentation?: {status: 'waiting' | 'visible'; slots: number; waits: number};
}
export interface BrandVerification {inspect(): BrandState}
declare global {interface Window {hanameshBrandVerification?: BrandVerification}}
export interface BrandFailure {
  code: string; message: string; slot?: string;
  actual?: {kind?: string; scope?: string}; expected?: {kind: string; scope: string};
  cleanup?: {remaining: BrandState['owned']; reasons: string[]};
}
export interface BrandRejection extends BrandFailure {state: BrandState}
export const DEFAULT_BRAND_CONFIG: Readonly<BrandConfig> = Object.freeze({verification: Object.freeze({enabled: false})});
export class BrandCompatibilityError extends Error {
  readonly code: string;
  readonly slot: string;
  readonly actual?: {kind?: string; scope?: string};
  readonly expected?: {kind: string; scope: string};
  brandState?: BrandState;
  constructor(code: string, slot: string, actual?: {kind?: string; scope?: string}) {
    super(`${code}: ${slot}; ${actual ? `actual kind=${actual.kind}, scope=${actual.scope}; expected single/root` : 'declaration absent from current assembled composition'}`);
    this.name = 'BrandCompatibilityError'; this.code = code; this.slot = slot;
    if (actual) { this.actual = actual; this.expected = {kind: 'single', scope: 'root'}; }
  }
}

export const name = 'hanamesh-brand-client';
export const inject = ['slots', 'locale', 'theme'];
const requiredSlots = ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark'];
const checkpointSlot = 'shell.overlay';
const executions = new WeakMap<ClientContext, {check(): void}>();
declare const __HANAMESH_BRAND_VERIFICATION__: boolean;

function declarations(ctx: ClientContext): CompositionNode[] {
  const result: CompositionNode[] = [];
  const visit = (nodes: readonly CompositionNode[]) => {
    for (const node of nodes) {
      if (node.type === 'slot') result.push({type: node.type, name: node.name,
        kind: node.kind, scope: node.scope, declaredBy: node.declaredBy});
      visit(node.children ?? []);
    }
  };
  if (ctx.slots.snapshot) visit(ctx.slots.snapshot());
  return result;
}
function checkShape(slot: string, nodes: CompositionNode[], missing: boolean): void {
  const node = nodes.find(node => node.name === slot);
  if (!node) {
    if (missing) throw new BrandCompatibilityError('BRAND_SLOT_MISSING', slot);
    return;
  }
  if (node.kind !== 'single' || node.scope !== 'root')
    throw new BrandCompatibilityError('BRAND_SLOT_INCOMPATIBLE', slot, {kind: node.kind, scope: node.scope});
}
/** Check the current composition, not the finality of future declarations. */
export function validateSlots(ctx: ClientContext): void {
  const execution = executions.get(ctx);
  if (!execution) throw Error('BRAND_NOT_APPLIED: no brand lifetime for this context');
  execution.check();
}
/** Each contribution, including delayed callbacks, belongs to one rollback. */
export function apply(ctx: ClientContext, config: BrandConfig = DEFAULT_BRAND_CONFIG): void {
  ctx.effect(() => {
    type Kind = keyof BrandState['owned'];
    type Resource = {kind: Kind; release: Dispose};
    const resources = new Set<Resource>();
    let checkpoint: Dispose | undefined;
    let errorWait: Dispose | undefined;
    let errorPresentation: BrandState['errorPresentation'];
    let closed = false, passed = false, initializing = true, announced = false;
    let failure: unknown;
    // Public readbacks before contribution, without changing locale/preferences.
    const beforeLocale = ctx.locale.getLocale?.().active;
    const beforeHeadline = ctx.locale.bind?.('conversation')('hero.headline');
    const beforeTheme = ctx.theme.getTheme?.();
    const beforeTokens = beforeTheme ? {...beforeTheme.active.tokens} : undefined;
    const beforeThemes = beforeTheme ? JSON.stringify(beforeTheme.themes) : undefined;
    let removeObserver: Dispose = () => {};
    let publish: () => void = () => {};

    const countOwned = (): BrandState['owned'] => {
      const owned = {slots: 0, dictionaries: 0, themeLayers: 0, waits: 0};
      for (const resource of resources) owned[resource.kind]++;
      return owned;
    };
    const diagnostic = (): BrandFailure => {
      const value = failure as Partial<BrandFailure> | undefined;
      const cleanup = failure instanceof Error ? (failure as Error & {cleanupError?: unknown}).cleanupError : undefined;
      const reasons = cleanup instanceof AggregateError
        ? cleanup.errors.map(error => error instanceof Error ? error.message : String(error)) : cleanup === undefined ? [] : [String(cleanup)];
      return {code: value?.code ?? 'BRAND_REGISTRATION_FAILED',
        message: value?.message ?? String(failure), slot: value?.slot,
        actual: value?.actual, expected: value?.expected,
        ...(cleanup === undefined ? {} : {cleanup: {remaining: countOwned(), reasons}})};
    };
    const inspect = (): BrandState => {
      const owned = countOwned();
      let observed: CompositionNode[] = [], declarationReadError: string | undefined;
      try { observed = declarations(ctx); }
      catch (error) { declarationReadError = error instanceof Error ? error.message : String(error); }
      const locale = ctx.locale.getLocale?.().active;
      const theme = ctx.theme.getTheme?.();
      // Compare independent namespace and unrelated tokens via public faces.
      // A changed external environment is reported as unproven, never forged true.
      const sameLocale = locale !== undefined && locale === beforeLocale
        && ctx.locale.bind?.('conversation')('hero.headline') === beforeHeadline;
      const sameTheme = theme !== undefined && beforeTokens !== undefined
        && theme.active.colorScheme === beforeTheme?.active.colorScheme
        && JSON.stringify(theme.themes) === beforeThemes
        && Object.keys({...beforeTokens, ...theme.active.tokens}).every(key =>
          beforeTokens[key] === theme.active.tokens[key]);
      return {phase: closed ? (failure === undefined ? 'disposed' : 'rejected')
        : passed && requiredSlots.every(slot => observed.some(node => node.name === slot))
          && owned.slots === 3 ? 'active' : 'waiting',
        compatibilityCheck: passed ? 'passed' : 'pending', declarations: observed, owned,
        ...(declarationReadError ? {declarationReadError} : {}),
        otherContributionsPreserved: sameLocale && sameTheme,
        locale, brandHeadline: ctx.locale.bind?.('hanamesh.brand')('hero.headline'),
        ...(failure === undefined ? {} : {error: diagnostic()}),
        ...(errorPresentation ? {errorPresentation: {...errorPresentation}} : {})};
    };
    const event = (type: string, detail: unknown): void => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(type, {detail}));
    };
    const notifyFailure = (): void => {
      if (failure === undefined || announced) return;
      announced = true;
      const error = diagnostic();
      if (failure !== undefined) {
        errorPresentation = {status: 'waiting', slots: 0, waits: 1};
        try {
          errorWait = ctx.slots.inject(checkpointSlot, () => {
            const release = ctx.slots.register({name: checkpointSlot, id: 'hanamesh-brand:error', order: 80, label: 'HanaMesh Brand error'},
              () => HanaMeshBrandFailure({failure: error, language: ctx.locale.getLocale?.().active ?? 'en'}));
            errorPresentation = {status: 'visible', slots: 1, waits: 1};
            return () => { release(); errorPresentation = {status: 'waiting', slots: 0, waits: 1}; };
          });
        } catch (presentationError) {
          errorPresentation = undefined;
          if (failure instanceof Error) Object.assign(failure, {presentationError});
          console.error('BRAND_ERROR_PRESENTATION_FAILED', presentationError, failure);
        }
      }
      const state = inspect();
      if (failure instanceof Error) Object.assign(failure, {brandState: state});
      event('hanamesh-brand:rejected', {...error, state});
    };
    const dispose = (): void => {
      if (closed) return;
      closed = true;
      const releaseErrors: unknown[] = [];
      for (const resource of [...resources].reverse()) {
        try { resource.release(); } catch (error) { releaseErrors.push(error); }
      }
      removeObserver();
      if (releaseErrors.length) {
        const error = new AggregateError(releaseErrors, 'BRAND_RESOURCE_RELEASE_FAILED', {cause: failure});
        if (failure === undefined) failure = error;
        else if (failure instanceof Error) Object.assign(failure, {cleanupError: error});
      }
      notifyFailure(); publish();
      if (releaseErrors.length) throw failure;
    };
    const unload = (): void => {
      try { dispose(); }
      finally { errorWait?.(); errorWait = undefined; errorPresentation = undefined; }
    };
    const reject = (error: unknown): never => {
      if (failure === undefined) failure = error;
      dispose(); throw error;
    };
    const own = (kind: Kind, setup: () => Dispose): Dispose => {
      // The holder precedes synchronous inject callbacks. If rollback happens
      // before setup returns, its eventual disposer is immediately released.
      let raw: Dispose | undefined, released = false;
      const resource: Resource = {kind, release: () => {
        if (released) return;
        raw?.(); released = true; resources.delete(resource);
        if (!closed && !initializing) publish();
      }};
      resources.add(resource);
      try {
        raw = setup();
        if (released) raw();
        else if (!initializing) publish();
      } catch (error) {
        resources.delete(resource);
        if (failure === undefined) failure = error;
        throw error;
      }
      return resource.release;
    };
    const check = (): void => {
      if (closed) {
        if (failure !== undefined) throw failure;
        throw Error('BRAND_DISPOSED: compatibility check after unload');
      }
      try {
        if (!ctx.slots.snapshot) throw Error('BRAND_SLOT_API_MISSING: public slots.snapshot required for assembled check');
        const nodes = declarations(ctx);
        requiredSlots.forEach(slot => checkShape(slot, nodes, true));
        passed = true; checkpoint?.(); checkpoint = undefined; publish();
      } catch (error) { return reject(error); }
    };
    executions.set(ctx, {check});

    if (typeof __HANAMESH_BRAND_VERIFICATION__ !== 'undefined' && __HANAMESH_BRAND_VERIFICATION__ && config.verification?.enabled === true && typeof window !== 'undefined') {
      const target = window as Window & {hanameshBrandVerification?: {inspect(): BrandState}};
      const observer = Object.freeze({inspect});
      if (target.hanameshBrandVerification) throw Error('BRAND_OBSERVER_ALREADY_INSTALLED');
      target.hanameshBrandVerification = observer;
      publish = () => event('hanamesh-brand:lifecycle', inspect());
      removeObserver = () => {
        if (target.hanameshBrandVerification === observer) delete target.hanameshBrandVerification;
      };
    }
    try {
      own('dictionaries', () => ctx.locale.register('hanamesh.brand', {
        zh: {'hero.headline': 'HanaMesh，让创造相连'},
        en: {'hero.headline': 'HanaMesh, connect your creations'},
      }));
      // Brand color belongs to its own mark component; host tokens are read-only.
      for (const [slot, component] of [
        ['sidebar.brand.mark', HanaMeshMark],
        ['sidebar.brand.name', HanaMeshName],
        ['conversation.hero.brand.mark', HanaMeshMark],
      ] as const) {
        own('waits', () => ctx.slots.inject(slot, () => {
          if (closed) return () => {};
          try {
            checkShape(slot, declarations(ctx), false);
            return own('slots', () => ctx.slots.register({
              // Single slots elect by priority (lowest wins); order is list-only.
              name: slot, id: 'hanamesh-brand', priority: -80, label: 'HanaMesh',
            }, component));
          } catch (error) {
            if (initializing) return reject(error);
            try { reject(error); }
            catch (cause) { if (!(cause instanceof BrandCompatibilityError)) throw cause; }
            return () => {};
          }
        }));
      }
      checkpoint = own('waits', () => ctx.slots.inject(checkpointSlot, () => {
        if (closed || passed) return () => {};
        try {
          return own('slots', () => ctx.slots.register({
            name: checkpointSlot, id: 'hanamesh-brand:compatibility', order: 80, label: 'HanaMesh compatibility',
          }, () => HanaMeshCompatibilityCheckpoint(() => {
            if (!passed) {
              try { validateSlots(ctx); }
              catch (error) { if (failure !== error) throw error; }
            }
          })));
        } catch (error) { return reject(error); }
      }));
      initializing = false; publish();
      return unload;
    } catch (error) {
      dispose();
      // A known branding incompatibility is visible locally and remains a precise
      // failure through validateSlots; it must not take down the host renderer.
      if (error instanceof BrandCompatibilityError) return unload;
      unload(); throw error;
    }
  }, 'hanamesh-brand:client');
}
