import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Popover } from '../ui/Popover';
import { Checkbox } from '../ui/Checkbox';
import { useIsOpen, useUi } from '../../store/uiStore';
import type { CriterionDef } from '../../criteria/types';
import { slug } from '../../data/taxonomies/industries';
import { bus } from '../../lib/eventBus';
import { Highlight } from './icons';

interface Props {
  id: string;
  anchor: HTMLElement | null;
  def: CriterionDef;
  value: string[];
  onConfirm: (v: string[]) => void;
}

/** Flat multiselect popover (e.g. Companies House status). */
export function ListPopover({ id, anchor, def, value, onConfirm }: Props) {
  const isOpen = useIsOpen(id);
  const close = useUi((s) => s.close);
  const [sel, setSel] = useState<string[]>(value);
  const [filter, setFilter] = useState('');
  const options = useMemo(() => def.options?.() ?? [], [def, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) { setSel(value); setFilter(''); bus.emit(`popover:open:${def.id}`); }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const toggle = (oid: string, on: boolean) => {
    setSel((s) => (on ? [...s, oid] : s.filter((x) => x !== oid)));
    if (on) bus.emit(`item:check:${oid}`);
  };

  return (
    <Popover id={id} anchor={anchor} width={350} tourKey="list-popover">
      <div className="flex items-center justify-between px-[14px] pt-[10px]">
        <span className="text-[13px] text-muted">{def.label}</span>
        <button onClick={() => close(id)} aria-label="Close" className="text-text hover:text-ink"><X size={16} /></button>
      </div>
      <div className="px-[14px] py-[8px]">
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter ..."
          aria-label="Filter options"
          className="w-full h-[30px] border border-border rounded-btn px-2 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-primary"
        />
      </div>
      <div className="max-h-[250px] overflow-y-auto nb-scroll border-y border-border">
        {shown.map((o, i) => (
          <div key={o.id} className={`px-[14px] py-[5px] hover:bg-[#F3F3F3] ${def.dividerAfter && !filter && i === def.dividerAfter ? 'border-t border-border' : ''}`}>
            <Checkbox checked={sel.includes(o.id)} onChange={(on) => toggle(o.id, on)} className="text-[14px] text-ink w-full" tourKey={`list-item-${slug(o.id)}`}>
              <Highlight text={o.label} term={filter} />
              {o.hint && <span className="text-muted ml-1">({o.hint})</span>}
            </Checkbox>
          </div>
        ))}
        {!shown.length && <div className="px-[14px] py-3 text-[14px] text-muted">No matches</div>}
      </div>
      <div className="flex items-center justify-between px-[14px] py-[10px]">
        <span className="text-[13px] text-muted">{sel.length} selected</span>
        <button
          data-tour="list-ok"
          onClick={() => { onConfirm(sel); close(id); bus.emit('popover:ok'); }}
          className="inline-flex items-center gap-[5px] h-[30px] px-[14px] bg-primary text-white rounded-btn text-[14px] font-semibold hover:bg-primary-hover"
        >
          <Check size={15} /> OK
        </button>
      </div>
    </Popover>
  );
}
