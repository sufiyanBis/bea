import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Maximize2, Minimize2, Search } from 'lucide-react';
import { Popover } from '../ui/Popover';
import { Checkbox } from '../ui/Checkbox';
import { useIsOpen, useUi } from '../../store/uiStore';
import { useQuery } from '../../store/queryStore';
import { CRITERIA, pickerTreeFor } from '../../criteria/registry';
import type { PickerNode } from '../../criteria/types';
import { bus } from '../../lib/eventBus';
import { Highlight } from './icons';

export const PICKER_ID = 'criteria-picker';

/** Filter the picker tree by tracked-only flag and search term. */
function filterTree(nodes: PickerNode[], term: string, includeTracked: boolean, parentMatch = false): PickerNode[] {
  const t = term.trim().toLowerCase();
  const out: PickerNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'criterion') {
      const def = CRITERIA[n.id];
      if (!includeTracked && def.trackedOnly) continue;
      if (!t || parentMatch || def.label.toLowerCase().includes(t)) out.push(n);
    } else {
      const selfMatch = !!t && n.label.toLowerCase().includes(t);
      const children = filterTree(n.children, term, includeTracked, parentMatch || selfMatch);
      if (children.length) out.push({ ...n, children });
    }
  }
  return out;
}

function allGroupIds(nodes: PickerNode[]): string[] {
  return nodes.flatMap((n) => (n.kind === 'group' ? [n.id, ...allGroupIds(n.children)] : []));
}

export function AddCriteriaPopover({ anchor }: { anchor: HTMLElement | null }) {
  const isOpen = useIsOpen(PICKER_ID);
  const close = useUi((s) => s.close);
  const addCriterion = useQuery((s) => s.addCriterion);
  const [term, setTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [includeTracked, setIncludeTracked] = useState(true);

  useEffect(() => {
    if (isOpen) bus.emit('picker:open');
    else { setTerm(''); setExpanded(new Set()); }
  }, [isOpen]);

  const entity = useQuery((s) => s.entity);
  const tree = useMemo(() => filterTree(pickerTreeFor(entity), term, includeTracked), [term, includeTracked, entity]);
  const searching = term.trim().length > 0;
  const allIds = useMemo(() => allGroupIds(tree), [tree]);
  const allExpanded = allIds.length > 0 && allIds.every((id) => expanded.has(id));

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.add(id); bus.emit(`group:expand:${id}`); }
      return next;
    });
  };

  const pick = (defId: string) => {
    close(PICKER_ID);
    addCriterion(defId);
  };

  const renderNodes = (nodes: PickerNode[], depth: number, greyed = false) =>
    nodes.map((n) => {
      const pad = { paddingLeft: 14 + depth * 15 };
      if (n.kind === 'criterion') {
        const def = CRITERIA[n.id];
        return (
          <button
            key={n.id}
            data-tour={`criterion-${n.id}`}
            onClick={() => pick(n.id)}
            style={pad}
            className={`w-full text-left pr-3 py-[6px] text-[15px] hover:bg-[#F0F0F0] focus:bg-[#F0F0F0] focus:outline-none ${greyed || def.legacy ? 'text-muted' : 'text-ink'}`}
          >
            <Highlight text={def.label} term={term} />
          </button>
        );
      }
      const open = searching || expanded.has(n.id);
      return (
        <div key={n.id}>
          <button
            data-tour={`group-${n.id}`}
            onClick={() => toggleGroup(n.id)}
            aria-expanded={open}
            style={pad}
            className={`w-full text-left pr-3 py-[6px] text-[15px] flex items-center gap-[6px] hover:bg-[#F0F0F0] focus:bg-[#F0F0F0] focus:outline-none ${n.legacy ? 'text-muted' : 'text-ink'}`}
          >
            <span className="font-semibold"><Highlight text={n.label} term={term} /></span>
            <span className="text-muted font-normal">({n.children.length})</span>
            <ChevronRight size={15} className={`text-text transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
          </button>
          {open && renderNodes(n.children, depth + 1, greyed || n.legacy)}
        </div>
      );
    });

  return (
    <Popover id={PICKER_ID} anchor={anchor} width={560} placement="bottom-start" tourKey="criteria-picker">
      <div className="p-[12px] flex items-center gap-[10px] border-b border-border">
        <div className="relative flex-1">
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search for criteria..."
            aria-label="Search for criteria"
            className="w-full h-[32px] border border-border rounded-btn pl-3 pr-8 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-primary"
          />
          <Search size={15} className="absolute right-[10px] top-[9px] text-text pointer-events-none" />
        </div>
        <button
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(allIds))}
          className="inline-flex items-center gap-[6px] h-[32px] px-[12px] border border-primary rounded-btn text-primary text-[14px] font-semibold hover:bg-primary-light"
        >
          {allExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div className="max-h-[440px] overflow-y-auto nb-scroll py-[4px]">
        {tree.length ? renderNodes(tree, 0) : <div className="px-4 py-3 text-[14px] text-muted">No criteria match “{term}”.</div>}
      </div>
      <div className="border-t border-border px-[14px] py-[10px]">
        <Checkbox checked={includeTracked} onChange={setIncludeTracked} className="text-[14px] text-ink">
          Include tracked-only criteria
        </Checkbox>
      </div>
    </Popover>
  );
}
