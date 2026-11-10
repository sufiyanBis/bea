import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, offset, flip, shift, arrow, Placement } from '@floating-ui/react';
import { X } from 'lucide-react';
import { useTour, hasSeenTour } from '../../store/tourStore';
import { useUi } from '../../store/uiStore';
import { bus } from '../../lib/eventBus';
import { TOURS, TourStep } from './steps';
import { BRAND_NAME } from '../../config';
import { readQueryParam } from '../../lib/urlState';

/** Find the first visible element for a data-tour key. */
function findTarget(key: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(key)}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

const elKeys = new WeakMap<HTMLElement, number>();
let elSeq = 0;
/** Stable numeric key per DOM element, so the tooltip remounts when its anchor changes. */
function elementKey(el: HTMLElement) {
  if (!elKeys.has(el)) elKeys.set(el, ++elSeq);
  return elKeys.get(el)!;
}

function isInView(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return r.top >= 60 && r.bottom <= window.innerHeight - 20;
}

export function TourEngine() {
  const { active, tourIndex, stepIndex, next, end, start } = useTour();
  const tour = TOURS[tourIndex];
  const step: TourStep | undefined = active ? tour?.steps[stepIndex] : undefined;
  // The found anchor is tagged with the step it belongs to, so a stale element is never used.
  const [found, setFound] = useState<{ el: HTMLElement; stepId: string; recovering: boolean } | null>(null);

  // Auto-start once on first visit.
  useEffect(() => {
    // not on shared links: the tour's first step would wipe the shared search
    if (!hasSeenTour() && !readQueryParam()) {
      const t = setTimeout(() => start(0), 900);
      return () => clearTimeout(t);
    }
  }, [start]);

  // End when we run out of steps.
  useEffect(() => {
    if (active && tour && stepIndex >= tour.steps.length) end();
  }, [active, tour, stepIndex, end]);

  // onEnter + advance on the step's event.
  useEffect(() => {
    if (!step) return;
    try { step.onEnter?.(); } catch (e) { console.warn('[tour] onEnter failed', e); }
    if (step.mode !== 'action' || !step.advanceOn) return;
    return bus.on((name) => { if (name === step.advanceOn) next(); });
  }, [step, next]);

  // Locate the target (and fall back to the recovery target when the user went off-script).
  useEffect(() => {
    setFound(null);
    if (!step || !step.target) return;
    let missingSince = 0;
    let scrolled: HTMLElement | null = null;
    const put = (el: HTMLElement | null, recovering: boolean) =>
      setFound((prev) => (el ? (prev?.el === el && prev.recovering === recovering ? prev : { el, stepId: step.id, recovering }) : null));
    const tick = () => {
      if (step.doneIf?.()) { next(); return; }
      const el = findTarget(step.target!);
      if (el) {
        missingSince = 0;
        put(el, false);
        if (scrolled !== el && !isInView(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        scrolled = el;
        return;
      }
      if (!missingSince) missingSince = Date.now();
      put(step.recover && Date.now() - missingSince > 700 ? findTarget(step.recover.target) : null, true);
    };
    tick();
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [step, next]);

  if (!step) return null;
  if (step.mode === 'final') return <TourFinalModal onEnd={end} copy={tour.final} />;
  if (!found || found.stepId !== step.id) return null;
  const { el: target, recovering } = found;

  const text = recovering ? step.recover!.text : typeof step.text === 'function' ? step.text() : step.text;
  const placement = recovering ? step.recover!.placement ?? 'bottom-start' : step.placement ?? 'bottom';
  const showBeacon = recovering || (step.mode === 'action' && step.beacon);
  return createPortal(
    <div data-layer-ignore>
      {showBeacon && <Beacon target={target} at={recovering ? 'left' : step.beaconAt ?? 'right'} />}
      {text && <TourTooltip
        key={`${step.id}-${recovering}-${elementKey(target)}`}
        target={target}
        placement={placement}
        text={text ?? ''}
        showNext={step.mode === 'next' && !recovering}
        progress={`${stepIndex + 1} / ${tour.steps.length - 1}`}
        onNext={next}
        onClose={end}
      />}
    </div>,
    document.body,
  );
}

function TourTooltip({ target, placement, text, showNext, onNext, onClose, progress }: {
  target: HTMLElement; placement: Placement; text: string; showNext: boolean; onNext: () => void; onClose: () => void; progress: string;
}) {
  const arrowRef = useRef<HTMLDivElement>(null);
  const { refs, floatingStyles, middlewareData, placement: final } = useFloating({
    placement,
    elements: { reference: target },
    // anchors inside popovers/modals move after mounting, so track every frame
    whileElementsMounted: (r, f, u) => autoUpdate(r, f, u, { animationFrame: true }),
    middleware: [offset(16), flip({ padding: 12 }), shift({ padding: 12 }), arrow({ element: arrowRef, padding: 12 })],
  });
  const side = final.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
  const a = middlewareData.arrow;
  const arrowSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side];

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, zIndex: 95 }}
      role="dialog"
      aria-live="polite"
      aria-label="Tour step"
      className="w-[250px] bg-white rounded-tour shadow-[0_6px_24px_rgba(0,0,0,0.22)] font-tour text-[13px] leading-[1.5] text-ink animate-fadein"
      data-tour-tooltip
    >
      <div
        ref={arrowRef}
        className="absolute w-[12px] h-[12px] bg-white rotate-45 border border-black/10 shadow-[0_0_4px_rgba(0,0,0,0.12)]"
        style={{ left: a?.x, top: a?.y, [arrowSide]: -6 }}
      />
      <div className="relative bg-white rounded-tour px-[16px] pt-[14px] pb-[12px]">
        <button onClick={onClose} aria-label="End tour" className="absolute right-[8px] top-[8px] text-muted hover:text-ink"><X size={14} /></button>
        <p className="pr-[10px]">{text}</p>
        <div className="flex items-center justify-between mt-[10px]">
          <span className="text-[11px] text-muted">{progress}</span>
          {showNext && (
            <button autoFocus onClick={onNext} className="h-[28px] px-[16px] bg-tour-yellow border border-ink rounded-[4px] text-[13px] font-semibold text-ink hover:brightness-95">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pulsing yellow dot over the element the user must click. */
function Beacon({ target, at }: { target: HTMLElement; at: 'left' | 'right' | 'center' }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const r = target.getBoundingClientRect();
      const x = at === 'left' ? r.left + 8 : at === 'right' ? r.right - 12 : r.left + r.width / 2;
      setPos((p) => (p && Math.abs(p.x - x) < 0.5 && Math.abs(p.y - (r.top + r.height / 2)) < 0.5 ? p : { x, y: r.top + r.height / 2 }));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [target, at]);
  if (!pos) return null;
  return (
    <div className="fixed pointer-events-none" style={{ left: pos.x - 9, top: pos.y - 9, zIndex: 94 }} aria-hidden data-tour-beacon>
      <span className="absolute inset-0 rounded-full bg-beacon/70 animate-beacon" />
      <span className="absolute inset-0 rounded-full bg-beacon/70 animate-beacon [animation-delay:0.7s]" />
      <span className="relative block w-[18px] h-[18px] rounded-full bg-beacon border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
    </div>
  );
}

function TourFinalModal({ onEnd, copy }: { onEnd: () => void; copy?: { title: string; body: string } }) {
  const open = useUi((s) => s.open);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onEnd();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEnd]);
  return createPortal(
    <div data-layer-ignore className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center animate-fadein" onMouseDown={(e) => e.target === e.currentTarget && onEnd()}>
      <div role="dialog" aria-modal="true" aria-label="Tour complete" className="w-[375px] bg-white rounded-tour shadow-[0_10px_40px_rgba(0,0,0,0.3)] px-[26px] py-[24px] font-tour text-ink" data-tour="tour-final">
        <h2 className="text-[18px] font-bold mb-[10px]">{copy?.title ?? "And that's just the start"}</h2>
        <p className="text-[14px] leading-[1.55] text-[#3a3a3a]">
          {copy?.body ?? `There's so much more to do and see on the ${BRAND_NAME} platform. Want a personalised tour? Get in contact to arrange with one of our experts, or take a look at what a ${BRAND_NAME} company profile looks like.`}
        </p>
        <button
          autoFocus
          onClick={() => { onEnd(); open('book-demo', 'modal'); }}
          className="mt-[18px] h-[34px] px-[18px] bg-tour-yellow border border-ink rounded-[4px] text-[14px] font-semibold hover:brightness-95"
        >
          Book a demo
        </button>
      </div>
    </div>,
    document.body,
  );
}
