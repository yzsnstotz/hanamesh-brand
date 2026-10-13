// FIXTURE ONLY, for normal installation into the isolated real CLIENT.
// It declares actual slots through the public service; it never mounts fake UI.
// The normal owner must first be disabled by PM's specified normal operations.
export const name = 'hanamesh-brand-negative-declarer';
export const inject = ['slots'];
export function apply(ctx, config) {
  const key = 'conversation.hero.brand.mark';
  if (!['kind', 'scope'].includes(config?.mismatch)) throw Error('negative fixture requires mismatch kind|scope');
  if (!Number.isSafeInteger(config.priority) || config.priority <= 0)
    throw Error('negative fixture requires explicit positive shadow priority above the normal root');
  const spec = config.mismatch === 'kind'
    ? {kind: 'chain', scope: 'root'} : {kind: 'single', scope: 'session'};
  ctx.slots.register({name: 'root', priority: config.priority,
    children: {[key]: spec}}, () => null);
  // A shadowed root entry can declare children without replacing the product.
  const root = ctx.slots.snapshot('root')[0];
  const fixture = root?.occupants.find(row => row.priority === config.priority);
  if (!fixture || fixture.active) throw Error('negative fixture must not replace normal product root');
}
