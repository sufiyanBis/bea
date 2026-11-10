import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Criterion, DateRange, Range } from '../../criteria/types';
import { CRITERIA, selectionLabel } from '../../criteria/registry';
import { useQuery } from '../../store/queryStore';
import { useUi } from '../../store/uiStore';
import { CompactSelect, SelectButton } from '../ui/CompactSelect';
import { IndustriesModal } from './IndustriesModal';
import { ListPopover } from './ListPopover';
import { TreePopover } from './TreePopover';

const inputCls = 'h-[28px] border border-border rounded-btn px-2 text-[14px] text-ink bg-white focus:outline-none focus:border-primary';

export function CriterionRow({ c, index, combinator }: { c: Criterion; index: number; combinator: 'all' | 'any' }) {
  const def = CRITERIA[c.defId];
  const update = useQuery((s) => s.updateCriterion);
  const remove = useQuery((s) => s.removeCriterion);
  const justAdded = useQuery((s) => s.justAdded);
  const clearJustAdded = useQuery((s) => s.clearJustAdded);
  const open = useUi((s) => s.open);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const pickerId =
    def.valueType === 'tree-modal' ? `industries:${c.uid}` : def.valueType === 'list-popover' ? `list:${c.uid}` : def.valueType === 'tree-popover' ? `tree:${c.uid}` : null;
  const openPicker = () => pickerId && open(pickerId, def.valueType === 'tree-modal' ? 'modal' : 'popover');

  // Auto-open the picker for a freshly added row.
  useEffect(() => {
    if (justAdded !== c.uid) return;
    if (pickerId && def.valueType !== 'tree-modal' && !anchor) return; // wait for the anchor to mount
    if (pickerId) openPicker();
    // keep justAdded for one tick so text inputs can autofocus
    const t = setTimeout(clearJustAdded, 0);
    return () => clearTimeout(t);
  }, [justAdded, c.uid, anchor]); // eslint-disable-line react-hooks/exhaustive-deps

  const prefix = index > 0 ? (combinator === 'all' ? 'and' : 'or') : '';
  const phrase = index === 0 ? def.phrase.charAt(0).toUpperCase() + def.phrase.slice(1) : def.phrase;
  const showOp = def.operators.length > 1 || def.operators[0].label !== '';

  const opSelect = showOp && (
    <CompactSelect
      ariaLabel={`${def.label} operator`}
      value={c.op}
      onChange={(op) => update(c.uid, { op })}
      options={def.operators.map((o) => ({ value: o.value, label: o.label }))}
    />
  );

  const valueEl = (() => {
    switch (def.valueType) {
      case 'tree-modal':
      case 'list-popover':
      case 'tree-popover':
        return (
          <SelectButton buttonRef={setAnchor} onClick={openPicker} tourKey={`value-${c.defId}`} ariaLabel={`${def.label} value`}>
            {selectionLabel(def, c.value)}
          </SelectButton>
        );
      case 'text':
        return (
          <input
            className={`${inputCls} w-[280px]`}
            value={(c.value as string) ?? ''}
            placeholder="Type to filter..."
            aria-label={`${def.label} value`}
            onChange={(e) => update(c.uid, { value: e.target.value })}
            autoFocus={justAdded === c.uid}
          />
        );
      case 'range': {
        const r = (c.value ?? {}) as Range;
        const num = (s: string) => (s === '' ? null : Number(s));
        const pre = def.unit === '£' ? <span className="text-text">£</span> : null;
        return (
          <span className="inline-flex items-center gap-[6px]">
            {pre}
            <input type="number" className={`${inputCls} w-[110px]`} placeholder="min" aria-label={`${def.label} minimum`} value={r.min ?? ''} onChange={(e) => update(c.uid, { value: { ...r, min: num(e.target.value) } })} />
            <span>and</span>
            {pre}
            <input type="number" className={`${inputCls} w-[110px]`} placeholder="max" aria-label={`${def.label} maximum`} value={r.max ?? ''} onChange={(e) => update(c.uid, { value: { ...r, max: num(e.target.value) } })} />
            {def.unit === 'years' && <span>years</span>}
            {def.yearOptions && (
              <>
                <span>in</span>
                <select className={inputCls} aria-label={`${def.label} year`} value={r.year ?? ''} onChange={(e) => update(c.uid, { value: { ...r, year: e.target.value ? Number(e.target.value) : null } })}>
                  <option value="">latest accounts</option>
                  {def.yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            )}
          </span>
        );
      }
      case 'date-range': {
        const r = (c.value ?? {}) as DateRange;
        return (
          <span className="inline-flex items-center gap-[6px]">
            <input type="date" className={inputCls} aria-label={`${def.label} from`} value={r.from ?? ''} onChange={(e) => update(c.uid, { value: { ...r, from: e.target.value || null } })} />
            <span>and</span>
            <input type="date" className={inputCls} aria-label={`${def.label} to`} value={r.to ?? ''} onChange={(e) => update(c.uid, { value: { ...r, to: e.target.value || null } })} />
          </span>
        );
      }
      default:
        return null;
    }
  })();

  return (
    <div className="flex items-start gap-[10px] px-[20px] py-[13px] border-b border-border text-[15px] text-text" data-tour={`row-${c.defId}`}>
      <span className="w-[7px] h-[7px] bg-[#9a9a9a] mt-[10px] shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        {def.layout === 'two-line' ? (
          <>
            <div className="flex items-center gap-[8px] flex-wrap">
              {prefix && <span>{prefix}</span>}
              <span>{phrase}</span>
              {opSelect}
            </div>
            <div className="flex items-center gap-[8px] mt-[8px]">
              <span>{def.connector}</span>
              {valueEl}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-[8px] flex-wrap min-h-[28px]">
            {prefix && <span>{prefix}</span>}
            <span className={def.legacy ? 'text-muted' : ''}>{phrase}</span>
            {opSelect}
            {valueEl}
          </div>
        )}
      </div>
      <button
        onClick={() => remove(c.uid)}
        aria-label={`Remove ${def.label}`}
        className="mt-[4px] w-[22px] h-[22px] flex items-center justify-center text-text hover:text-ink rounded-btn hover:bg-page"
      >
        <X size={16} />
      </button>

      {def.valueType === 'tree-modal' && <IndustriesModal id={pickerId!} value={(c.value as string[]) ?? []} onConfirm={(v) => update(c.uid, { value: v })} />}
      {def.valueType === 'list-popover' && <ListPopover id={pickerId!} anchor={anchor} def={def} value={(c.value as string[]) ?? []} onConfirm={(v) => update(c.uid, { value: v })} />}
      {def.valueType === 'tree-popover' && <TreePopover id={pickerId!} anchor={anchor} tree={def.tree!} value={(c.value as string[]) ?? []} onConfirm={(v) => update(c.uid, { value: v })} />}
    </div>
  );
}
