import { FolderOpen, HelpCircle, RotateCcw, Save } from 'lucide-react';
import { useUi } from '../../store/uiStore';
import { useQuery } from '../../store/queryStore';
import { useResults } from '../../store/resultsStore';
import { useTour } from '../../store/tourStore';

export function PageActions() {
  const open = useUi((s) => s.open);
  const resetQuery = useQuery((s) => s.reset);
  const clearResults = useResults((s) => s.clear);
  const startTour = useTour((s) => s.start);

  const seg = 'whitespace-nowrap inline-flex items-center gap-[6px] h-[30px] px-[13px] text-[15px] font-semibold text-primary bg-white hover:bg-primary-light';
  return (
    <div className="flex items-center gap-[18px] shrink-0">
      <button onClick={() => startTour(0)} className="inline-flex items-center gap-[5px] text-[15px] font-semibold text-primary hover:underline">
        <HelpCircle size={16} />
        Tour
      </button>
      <div className="inline-flex border border-primary rounded-btn overflow-hidden divide-x divide-primary">
        <button className={seg} onClick={() => open('save-search', 'modal')}><Save size={15} />Save search</button>
        <button className={seg} onClick={() => open('open-search', 'modal')}><FolderOpen size={15} />Open search</button>
        <button className={seg} onClick={() => { resetQuery(); clearResults(); }}><RotateCcw size={15} />Reset search</button>
      </div>
    </div>
  );
}
