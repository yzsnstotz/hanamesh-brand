import {HanaMeshMark, HanaMeshName, HanaMeshCompatibilityCheckpoint} from './Brand.ts';

type Dispose = () => void;
/** Only the public composition fields consumed by this plugin. */
export interface CompositionNode {
  type: string; name: string; kind?: string; scope?: string; declaredBy?: string;
  children?: readonly CompositionNode[];
}
export interface ClientContext {
  slots: {
    inject(name: string, run: () => Dispose): Dispose;
    register(spec: {name: string; id: string; order: number; label: string}, component: unknown): Dispose;
    // Optional for existing structural Node callers; the formal check requires it.
    snapshot?(): readonly CompositionNode[];
  };
  locale: {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): Dispose;
    getLocale?(): {active: string};
    bind?(namespace: string): (key: string) => string;
  };
  theme: {
    overrideTokens(source: string, tokens: Record<string, {light: string; dark: string}>): Dispose;
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
}
export interface BrandVerification {inspect(): BrandState}
declare global {interface Window {hanameshBrandVerification?: BrandVerification}}
export interface BrandFailure {
  code: string; message: string; slot?: string;
  actual?: {kind?: string; scope?: string}; expected?: {kind: string; scope: string};
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

    const diagnostic = (): BrandFailure => {
      const value = failure as Partial<BrandFailure> | undefined;
      return {code: value?.code ?? 'BRAND_REGISTRATION_FAILED',
        message: value?.message ?? String(failure), slot: value?.slot,
        actual: value?.actual, expected: value?.expected};
    };
    const inspect = (): BrandState => {
      const owned = {slots: 0, dictionaries: 0, themeLayers: 0, waits: 0};
      for (const resource of resources) owned[resource.kind]++;
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
          (owned.themeLayers > 0 && key === '--dsw-alias-state-business-primary')
          || beforeTokens[key] === theme.active.tokens[key]);
      return {phase: closed ? (failure === undefined ? 'disposed' : 'rejected')
        : passed && requiredSlots.every(slot => declarations(ctx).some(node => node.name === slot))
          && owned.slots === 3 ? 'active' : 'waiting',
        compatibilityCheck: passed ? 'passed' : 'pending', declarations: declarations(ctx), owned,
        otherContributionsPreserved: sameLocale && sameTheme,
        locale, brandHeadline: ctx.locale.bind?.('hanamesh.brand')('hero.headline'),
        ...(failure === undefined ? {} : {error: diagnostic()})};
    };
    const event = (type: string, detail: unknown): void => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(type, {detail}));
    };
    const notifyFailure = (): void => {
      if (failure === undefined || announced) return;
      announced = true;
      const state = inspect(), error = diagnostic();
      if (failure instanceof Error) Object.assign(failure, {brandState: state});
      if (typeof window !== 'undefined') {
        try { window.alert(error.message); }
        catch (notificationError) {
          console.error('BRAND_ERROR_NOTIFICATION_FAILED', notificationError, failure);
        }
      }
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
      own('themeLayers', () => ctx.theme.overrideTokens('hanamesh-brand', {
        '--dsw-alias-state-business-primary': {light: '#7059e8', dark: '#a99aff'},
      }));
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
              name: slot, id: 'hanamesh-brand', order: 80, label: 'HanaMesh',
            }, component));
          } catch (error) { return reject(error); }
        }));
      }
      checkpoint = own('waits', () => ctx.slots.inject(checkpointSlot, () => {
        if (closed || passed) return () => {};
        try {
          return own('slots', () => ctx.slots.register({
            name: checkpointSlot, id: 'hanamesh-brand:compatibility', order: 80, label: 'HanaMesh compatibility',
          }, () => HanaMeshCompatibilityCheckpoint(() => { if (!passed) validateSlots(ctx); })));
        } catch (error) { return reject(error); }
      }));
      initializing = false; publish();
      return dispose;
    } catch (error) { dispose(); throw error; }
  }, 'hanamesh-brand:client');
}
