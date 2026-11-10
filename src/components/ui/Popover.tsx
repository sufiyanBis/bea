import { ReactNode, useEffect, useRef } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, arrow, FloatingPortal, Placement } from '@floating-ui/react';
import { useIsOpen, useUi } from '../../store/uiStore';

interface Props {
  id: string;
  anchor: HTMLElement | null;
  children: ReactNode;
  placement?: Placement;
  width?: number;
  className?: string;
  caret?: boolean;
  tourKey?: string;
}

/** Anchored popover tied to the global layer stack (outside click + Esc close). */
export function Popover({ id, anchor, children, placement = 'bottom-start', width, className = '', caret = true, tourKey }: Props) {
  const isOpen = useIsOpen(id);
  const close = useUi((s) => s.close);
  const arrowRef = useRef<HTMLDivElement>(null);
  const { refs, floatingStyles, middlewareData, placement: finalPlacement } = useFloating({
    open: isOpen,
    placement,
    elements: { reference: anchor },
    whileElementsMounted: autoUpdate,
    middleware: [offset(caret ? 10 : 4), flip({ padding: 8 }), shift({ padding: 8 }), arrow({ element: arrowRef, padding: 14 })],
  });

  // focus return: when the popover closes while focus was inside it (or lost to <body>), go back to the trigger
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) anchor?.focus?.();
  }, [isOpen, anchor]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const floating = refs.floating.current;
      if (floating?.contains(t) || anchor?.contains(t)) return;
      if (t.closest?.('[data-layer-ignore]')) return;
      close(id);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen, anchor, id, close, refs.floating]);

  if (!isOpen || !anchor) return null;
  const side = finalPlacement.split('-')[0];
  const a = middlewareData.arrow;
  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, width, zIndex: 60 }}
        className={`bg-surface border border-border rounded-card shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${className}`}
        role="dialog"
        data-tour={tourKey}
      >
        {caret && (
          <div
            ref={arrowRef}
            className={`absolute w-3 h-3 rotate-45 bg-surface border-inherit ${side === 'bottom' ? 'border-l border-t -top-[7px]' : 'border-r border-b -bottom-[7px]'}`}
            style={{ left: a?.x ?? 16 }}
          />
        )}
        {children}
      </div>
    </FloatingPortal>
  );
}
