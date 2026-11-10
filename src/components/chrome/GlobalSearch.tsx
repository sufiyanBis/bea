import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Popover } from '../ui/Popover';
import { useUi } from '../../store/uiStore';
import { getCompanies } from '../../data/dataset';
import { go, profilePath } from '../../lib/nav';
import { Flag } from '../ui/Flag';
import { CountrySelect } from '../ui/CountrySelect';
import { countryName } from '../../data/countries/iso3166';

const ID = 'global-search';

/** `wide`: full-width row on the search page (search 70%, country scope 30%). */
export function GlobalSearch({ wide = false }: { wide?: boolean }) {
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const open = useUi((s) => s.open);
  const close = useUi((s) => s.close);


  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return [];
    const out = [];
    for (const c of getCompanies()) {
      if (scope.length && !scope.includes(c.country)) continue;
      if (c.name.toLowerCase().includes(t)) out.push(c);
      if (out.length >= 8) break;
    }
    return out;
  }, [term, scope]);

  const scopeSelect = (
    <CountrySelect
      mode="multi" value={scope} onChange={setScope} label="Search scope" size="md" compact={!wide} tourKey="global-search-scope"
      className={wide ? '!h-[44px] w-full !max-w-none !px-3 text-[15px]' : ''}
    />
  );
  return (
    <div className={wide ? 'flex items-center gap-[12px] w-full' : 'flex items-center gap-[6px] max-w-full'} data-global-search>
    {!wide && scopeSelect}
    <div ref={setEl} className={wide ? 'relative basis-[70%] min-w-0' : 'relative w-[280px] max-w-full'}>
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); e.target.value.trim().length >= 2 ? open(ID) : close(ID); }}
        onFocus={() => term.trim().length >= 2 && open(ID)}
        placeholder={wide ? 'Search companies by name' : 'Search companies'}
        aria-label="Search companies"
        className={`w-full border border-border rounded-btn text-ink placeholder:text-muted focus:outline-none focus:border-primary ${wide ? 'h-[44px] pl-[42px] pr-3 text-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'h-[32px] pl-3 pr-9 text-[14px]'}`}
      />
      <Search size={wide ? 18 : 16} className={`absolute text-ink pointer-events-none ${wide ? 'left-[14px] top-[13px]' : 'right-[10px] top-[8px]'}`} />
      <Popover id={ID} anchor={el} width={wide ? (el?.offsetWidth ?? 300) : 300} caret={false} className="py-1">
        {matches.length === 0 ? (
          <div className="px-3 py-2 text-[14px] text-muted">No companies match “{term}”</div>
        ) : (
          matches.map((c) => (
            <button
              key={c.id}
              onClick={() => { close(ID); setTerm(''); go(profilePath(c.id)); }}
              className="w-full text-left flex items-center gap-2 px-3 py-[6px] hover:bg-page"
            >
              <img src={c.logo} alt="" className="w-6 h-6 border border-border rounded-[2px]" />
              <span className="text-[14px] text-ink truncate">{c.name}</span>
              <span className="ml-auto text-[12px] text-muted shrink-0 flex items-center gap-[4px]"><Flag code={c.country} className="text-[13px]" />{c.country === 'GB' ? c.headOffice : countryName(c.country)}</span>
            </button>
          ))
        )}
      </Popover>
    </div>
    {wide && <div className="basis-[30%] min-w-0 flex">{scopeSelect}</div>}
    </div>
  );
}
