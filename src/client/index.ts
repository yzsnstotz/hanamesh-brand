import {HanaMeshMark, HanaMeshName} from './Brand.ts';

// Like Core, keep only the service interface used by this client plugin.
type Dispose = () => void;
interface SlotRegistry {
  inject(name: string, run: () => Dispose): Dispose;
  register(spec: {name: string; id: string; order: number; label: string}, component: unknown): Dispose;
}
interface ClientContext {
  slots: SlotRegistry;
  locale: {register(namespace: string, dictionaries: Record<string, Record<string, string>>): Dispose};
  theme: {overrideTokens(source: string, tokens: Record<string, {light: string; dark: string}>): Dispose};
  effect(run: () => Dispose, label?: string): unknown;
}

export const name = 'hanamesh-brand-client';
export const inject = ['slots', 'locale', 'theme'];

/** Client-only contributions. Each public service owns its restoration semantics. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const disposers: Dispose[] = [];
    const dispose = () => { while (disposers.length) disposers.pop()!(); };
    try {
      disposers.push(ctx.locale.register('hanamesh.brand', {
        zh: {'hero.headline': 'HanaMesh，让创造相连'},
        en: {'hero.headline': 'HanaMesh, connect your creations'},
      }));
      disposers.push(ctx.theme.overrideTokens('hanamesh-brand', {
        '--dsw-alias-state-business-primary': {light: '#7059e8', dark: '#a99aff'},
      }));
      for (const [slot, component] of [
        ['sidebar.brand.mark', HanaMeshMark],
        ['sidebar.brand.name', HanaMeshName],
        ['conversation.hero.brand.mark', HanaMeshMark],
      ] as const) {
        disposers.push(ctx.slots.inject(slot, () => ctx.slots.register({
          name: slot, id: 'hanamesh-brand', order: 80, label: 'HanaMesh',
        }, component)));
      }
      return dispose;
    } catch (error) { dispose(); throw error; }
  }, 'hanamesh-brand:client');
}
