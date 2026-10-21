import {createElement, useLayoutEffect, useRef} from 'react';
import type {BrandFailure} from './index.ts';

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

/** A non-modal error owned by the Brand plugin, mounted through shell.overlay. */
export function HanaMeshBrandFailure({failure, language}: {failure: BrandFailure; language: string}) {
  const zh = language === 'zh';
  const resourceLabels = zh ? {slots: '标志与检查组件', dictionaries: '字典', themeLayers: '主题覆盖', waits: '等待'} : {slots: 'Marks and checks', dictionaries: 'Dictionaries', themeLayers: 'Theme overrides', waits: 'Waits'};
  return createElement('section', {
    role: 'alert', 'aria-label': zh ? 'HanaMesh 品牌错误' : 'HanaMesh Brand error',
    'data-hanamesh-brand-error': true,
    style: {position: 'absolute', right: 16, bottom: 16, zIndex: 1, pointerEvents: 'auto',
      boxSizing: 'border-box', width: 'min(420px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto',
      padding: 16, border: '1px solid var(--dsw-alias-state-error-primary)', borderRadius: 12,
      background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)', font: '14px/1.5 system-ui,sans-serif'},
  }, createElement('h2', {style: {fontSize: 16, margin: '0 0 8px'}}, zh ? 'HanaMesh 品牌未启用' : 'HanaMesh Brand is unavailable'),
  createElement('p', null, failure.cleanup
    ? (zh ? '品牌兼容检查失败，部分资源未能撤回，标志或主题覆盖可能仍在生效。' : 'Brand compatibility failed. Some marks or theme overrides may still apply because cleanup did not finish.')
    : (zh ? '品牌兼容检查失败，已撤回本插件的标志和主题覆盖；原工作台继续使用。' : 'Brand compatibility failed. Its marks and theme override were removed; the original workspace remains available.')),
  failure.cleanup ? createElement('div', null,
    createElement('p', null, zh ? '未释放的品牌资源：' : 'Brand resources still owned:', Object.entries(failure.cleanup.remaining).map(([kind,count]) => `${resourceLabels[kind as keyof typeof resourceLabels]} ${count}`).join(' · ')),
    createElement('ul', null, ...failure.cleanup.reasons.map((reason,index) => createElement('li', {key: index, style: {overflowWrap: 'anywhere'}}, reason)))) : null,
  createElement('p', {style: {overflowWrap: 'anywhere'}}, failure.message),
  createElement('p', null, zh ? '请在插件管理中检查 HanaMesh Brand 与宿主版本，或停用此品牌插件。' : 'Check HanaMesh Brand and host versions in plugin management, or disable this brand plugin.'));
}
