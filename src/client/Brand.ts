import {createElement, useLayoutEffect, useRef} from 'react';

/** Presentation supplied by both sidebar and conversation hero hosts. */
export interface BrandMarkProps {size: number; className?: string}

/** The purple H mark from the previous HanaMesh fork, as a slot occupant. */
export function HanaMeshMark({size, className}: BrandMarkProps) {
  return createElement('span', {
    'aria-hidden': true, className,
    style: {display: 'inline-grid', placeItems: 'center', width: size, height: size,
      borderRadius: Math.round(size * 0.28), background: '#7059e8', color: '#fff',
      fontFamily: 'system-ui, sans-serif', fontSize: Math.round(size * 0.56), fontWeight: 700},
  }, 'H');
}

export function HanaMeshName() { return createElement('span', null, 'HanaMesh'); }

/** Null-rendering component: the normal AppFrame commit is the check boundary. */
function FirstCommit({onCommit}: {onCommit: () => void}) {
  const committed = useRef(false);
  useLayoutEffect(() => {
    if (!committed.current) { committed.current = true; onCommit(); }
  }, [onCommit]);
  return null;
}
/** Build a normal React element without running hooks in a registry callback. */
export function HanaMeshCompatibilityCheckpoint(onCommit: () => void) {
  return createElement(FirstCommit, {onCommit});
}
