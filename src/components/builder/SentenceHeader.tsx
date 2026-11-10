import { useState } from 'react';
import { Check, ChevronDown, FlaskConical } from 'lucide-react';
import { useQuery } from '../../store/queryStore';
import { useUi } from '../../store/uiStore';
import { Popover } from '../ui/Popover';
import { CompactSelect } from '../ui/CompactSelect';
import { CountrySelect } from '../ui/CountrySelect';
import { FlagDE } from './icons';
import { ENTITY_LABELS } from './entity';
import type { Entity } from '../../data/types';

const ENTITY_MENU = 'entity-menu';

function EntityOption({ e }: { e: Entity }) {
  return (
    <span className="inline-flex items-center gap-[6px]">
      {e === 'de' && <FlaskConical size={14} className="text-primary" />}
      {ENTITY_LABELS[e].select}
      {e === 'de' && <FlagDE />}
    </span>
  );
}

export function SentenceHeader() {
  const entity = useQuery((s) => s.entity);
  const combinator = useQuery((s) => s.combinator);
  const setEntity = useQuery((s) => s.setEntity);
  const setCombinator = useQuery((s) => s.setCombinator);
  const countries = useQuery((s) => s.countries);
  const setCountries = useQuery((s) => s.setCountries);
  const toggle = useUi((s) => s.toggle);
  const close = useUi((s) => s.close);
  const [el, setEl] = useState<HTMLButtonElement | null>(null);

  return (
    <div className="bg-page border-b border-border px-[20px] py-[14px] flex items-center gap-[8px] text-[15px] text-text flex-wrap">
      <span>Find</span>
      <button
        ref={setEl}
        data-tour="entity-select"
        onClick={() => toggle(ENTITY_MENU)}
        className="inline-flex items-center gap-2 bg-white border border-border rounded-btn h-[28px] pl-2 pr-2 text-[14px] text-ink hover:border-[#c8c8c8]"
      >
        <EntityOption e={entity} />
        <ChevronDown size={14} className="text-text" />
      </button>
      <Popover id={ENTITY_MENU} anchor={el} width={240} caret={false} className="py-1">
        {(['companies', 'people', 'de', 'funds'] as Entity[]).map((e) => (
          <button
            key={e}
            onClick={() => { setEntity(e); close(ENTITY_MENU); }}
            className="w-full flex items-center justify-between px-3 py-[6px] text-[14px] text-ink hover:bg-page"
          >
            <EntityOption e={e} />
            {e === entity && <Check size={14} className="text-primary" />}
          </button>
        ))}
      </Popover>
      {(entity === 'companies' || entity === 'people') && (
        <>
          <span>in</span>
          <CountrySelect mode="multi" value={countries} onChange={setCountries} label="Countries" tourKey="country-scope" />
        </>
      )}
      <span>where</span>
      <CompactSelect
        ariaLabel="Match all or any"
        value={combinator}
        onChange={setCombinator}
        options={[{ value: 'all', label: 'all' }, { value: 'any', label: 'any' }]}
      />
      <span>of the following apply:</span>
    </div>
  );
}
