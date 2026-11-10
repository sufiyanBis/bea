import { CompareToggle } from '../../../components/compare/CompareTray';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListPlus, Sheet } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import { getCompany } from '../../../data/dataset';
import { similarIds } from '../../../data/profile/similarity';
import { INDUSTRY_BY_ID } from '../../../data/taxonomies/industries';
import { joinAnd } from '../../../lib/format';
import { profilePath } from '../../../lib/nav';
import { downloadBlob, toCsv } from '../../../lib/download';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useCollections } from '../../../store/collectionsStore';
import { useResults } from '../../../store/resultsStore';
import { useUi } from '../../../store/uiStore';
import { InfoBar, SectionTitle, Tip, useToast } from '../ui';

export function SimilarCompanies({ c }: SectionProps) {
  const ids = similarIds(c.id);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const collections = useCollections((s) => s.collections);
  const setTarget = useResults((s) => s.setCollectionTarget);
  const open = useUi((s) => s.open);
  const toast = useToast((s) => s.show);
  const rows = ids.filter((id) => !hidden.includes(id)).map((id) => getCompany(id)!).filter(Boolean);
  const allOn = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const label = (ids2: string[]) => ids2.map((i) => INDUSTRY_BY_ID.get(i)).filter(Boolean);

  const notSimilar = (id: string, name: string) => {
    setHidden((h) => [...h, id]);
    setSel((s) => s.filter((x) => x !== id));
    toast(`${name} marked as not similar.`, { label: 'Undo', run: () => setHidden((h) => h.filter((x) => x !== id)) });
  };
  const addToCollection = (list: string[]) => { setTarget(list); open('collection-modal', 'modal'); };
  const exportCsv = () => {
    const chosen = rows.filter((r) => sel.includes(r.id));
    downloadBlob(toCsv(['Name', 'Industries', 'Buzzwords', 'Description', 'Website'], chosen.map((r) => [
      r.name, joinAnd(label(r.industries).filter((x) => x!.type === 'industry').map((x) => x!.label)), label(r.industries).filter((x) => x!.type === 'buzzword').map((x) => x!.label).join(', '), r.description, r.website ?? '',
    ])), `similar-to-${c.id}.csv`, 'text/csv;charset=utf-8');
  };

  return (
    <>
      <SectionTitle>Similar Companies</SectionTitle>
      <InfoBar>Our machine learning algorithm analyses company descriptions, matching companies with their most similar counterparts on the platform.</InfoBar>
      <div className="flex items-center justify-between mt-[14px] mb-[10px] min-h-[34px]">
        <p className="text-[14px] text-text">Showing {rows.length} similar companies.</p>
        {sel.length > 0 && (
          <div className="flex items-center gap-[12px] bg-tab-active text-white rounded-btn px-[12px] h-[34px] text-[14px]" role="toolbar" aria-label="Bulk actions">
            <strong>{sel.length} selected</strong><span className="opacity-50">·</span>
            <button onClick={() => addToCollection(sel)} className="inline-flex items-center gap-[5px] hover:underline"><ListPlus size={15} />Add to collection</button><span className="opacity-50">·</span>
            <button onClick={exportCsv} className="inline-flex items-center gap-[5px] hover:underline"><Sheet size={15} />Export CSV</button>
          </div>
        )}
      </div>
      <div className="bg-surface border border-card-border rounded-card" data-tour="similar-table">
        <div className="grid grid-cols-[36px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_170px] gap-x-[14px] items-center px-[14px] py-[9px] border-b border-card-border text-[14px] font-semibold text-ink">
          <Checkbox checked={allOn ? 'on' : sel.length ? 'mixed' : 'off'} onChange={(on) => setSel(on ? rows.map((r) => r.id) : [])} ariaLabel="Select all similar companies" />
          <span>Name</span><span>Industries</span><span>Buzzwords</span><span />
        </div>
        {rows.map((r) => {
          const inCols = collections.filter((col) => col.companyIds.includes(r.id)).length;
          const ind = label(r.industries);
          return (
            <div key={r.id} className="grid grid-cols-[36px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_170px] gap-x-[14px] px-[14px] py-[10px] border-b border-card-border last:border-0 hover:bg-[#FAFAFA]">
              <span className="pt-[10px]"><Checkbox checked={sel.includes(r.id)} onChange={(on) => setSel((s) => (on ? [...s, r.id] : s.filter((x) => x !== r.id)))} ariaLabel={`Select ${r.name}`} /></span>
              <Link to={profilePath(r.id)} className="flex items-center gap-[10px] min-w-0">
                <img src={r.logo} alt="" className="w-[36px] h-[36px] border border-border rounded-[3px] shrink-0" />
                <span className="font-semibold text-ink hover:text-primary hover:underline truncate">{r.name}</span>
              </Link>
              <span className="text-[14px] text-text self-center truncate">{joinAnd(ind.filter((x) => x!.type === 'industry').map((x) => x!.label)) || '—'}</span>
              <span className="text-[14px] text-text self-center truncate">{ind.filter((x) => x!.type === 'buzzword').map((x) => x!.label).join(', ') || '—'}</span>
              <div className="row-span-2 flex flex-col items-end gap-[4px]">
                <button onClick={() => addToCollection([r.id])} className={`inline-flex items-center gap-[5px] h-[30px] px-[10px] border border-primary rounded-btn text-[13px] font-semibold text-primary ${inCols ? 'bg-collections-btn' : 'bg-white hover:bg-primary-light'}`}>
                  <ListPlus size={15} />{inCols ? `In ${inCols} collection${inCols > 1 ? 's' : ''}` : 'Add to collection'}
                </button>
                <CompareToggle id={r.id} label="Add to compare" className="!h-[26px] !px-[8px] !text-[12px]" />
                <button onClick={() => notSimilar(r.id, r.name)} className="text-[13px] text-primary hover:underline">Not similar</button>
              </div>
              <div className="col-start-2 col-span-3 min-w-0">
                <Tip text={r.description}><span className="block truncate text-[13px] text-muted cursor-default max-w-full">{r.description}</span></Tip>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
