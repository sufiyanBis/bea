import { countryByCode } from '../../data/countries/iso3166';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, IdCard, ListPlus, X } from 'lucide-react';
import { go, profilePath } from '../../lib/nav';
import { useResults } from '../../store/resultsStore';
import { useIsOpen, useUi } from '../../store/uiStore';
import { getCompany } from '../../data/dataset';
import { formatDate, formatInt, formatMoney } from '../../lib/format';
import { SIGNAL_LABEL } from '../../data/taxonomies/signals';
import { STAGE_COLORS } from '../../data/taxonomies/misc';
import { industryLabels } from './cells';
import { Button } from '../ui/Button';

const ID = 'profile-drawer';

/** Simple company profile drawer (full profile mode is a later spec). */
export function CompanyDrawer() {
  const profileId = useResults((s) => s.profileId);
  const openProfile = useResults((s) => s.openProfile);
  const setTarget = useResults((s) => s.setCollectionTarget);
  const isOpen = useIsOpen(ID);
  const open = useUi((s) => s.open);
  const close = useUi((s) => s.close);

  useEffect(() => { if (profileId) open(ID, 'modal'); }, [profileId, open]);
  useEffect(() => { if (!isOpen && profileId) openProfile(null); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = profileId ? getCompany(profileId) : undefined;
  if (!isOpen || !c) return null;

  const facts: [string, string][] = [
    ['Head office', c.headOffice],
    ['Country', `${countryByCode(c.country).flag} ${countryByCode(c.country).name}`],
    [c.registry.idLabel, c.registry.id],
    ['Status', c.chStatus],
    ['Founded', formatDate(c.foundedDate)],
    ['Employees (est.)', c.employees != null ? formatInt(c.employees) : '—'],
    ['Turnover', formatMoney(c.turnover) || '—'],
    ['Total raised', formatMoney(c.fundraisingTotal) || '—'],
    ['Tracking', c.trackingStatus],
  ];

  return createPortal(
    <div data-layer-ignore className="fixed inset-0 z-[65] bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && close(ID)}>
      <aside role="dialog" aria-label={`${c.name} profile`} className="absolute right-0 top-0 h-full w-[560px] max-w-full bg-surface shadow-[-8px_0_24px_rgba(0,0,0,0.15)] flex flex-col animate-fadein">
        <div className="flex items-start gap-[14px] px-[24px] py-[20px] border-b border-border">
          <img src={c.logo} alt="" className="w-[64px] h-[64px] border border-border rounded-[2px]" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] text-ink font-semibold leading-tight">{c.name}</h2>
            <div className="flex items-center gap-[8px] mt-[6px] text-[13px]">
              <span className="inline-flex items-center gap-[5px]"><span className="w-[9px] h-[9px]" style={{ background: STAGE_COLORS[c.stage] }} />{c.stage}</span>
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-[3px]">
                  {c.website.replace(/^https?:\/\/(www\.)?/, '')} <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <button onClick={() => close(ID)} aria-label="Close profile" className="text-text hover:text-ink"><X size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto nb-scroll px-[24px] py-[18px] space-y-[22px] text-[14px]">
          <p className="text-text">{c.description}</p>
          <dl className="grid grid-cols-2 gap-x-[20px] gap-y-[10px]">
            {facts.map(([k, v]) => (
              <div key={k}><dt className="text-muted text-[12px] uppercase tracking-wide">{k}</dt><dd className="text-ink">{v}</dd></div>
            ))}
          </dl>
          <section>
            <h3 className="text-ink font-semibold mb-[6px]">Industries and buzzwords</h3>
            <div className="flex flex-wrap gap-[6px]">
              {industryLabels(c).map((l) => <span key={l} className="px-[8px] py-[2px] bg-page border border-border rounded-btn text-[13px] text-ink">{l}</span>)}
            </div>
          </section>
          {c.signals.length > 0 && (
            <section>
              <h3 className="text-ink font-semibold mb-[6px]">Signals</h3>
              <div className="flex flex-wrap gap-[6px]">
                {c.signals.map((s) => <span key={s} className="px-[8px] py-[2px] bg-primary-light rounded-btn text-[13px] text-primary">{SIGNAL_LABEL.get(s)}</span>)}
              </div>
            </section>
          )}
          {c.fundraisings.length > 0 && (
            <section>
              <h3 className="text-ink font-semibold mb-[6px]">Fundraisings</h3>
              <table className="w-full text-left">
                <thead className="text-muted text-[12px] uppercase"><tr><th className="py-[4px]">Date</th><th>Amount</th><th>Stage</th><th>Investors</th></tr></thead>
                <tbody>
                  {[...c.fundraisings].reverse().map((f) => (
                    <tr key={f.date} className="border-t border-border text-ink">
                      <td className="py-[6px]">{formatDate(f.date)}</td><td>{formatMoney(f.amount)}</td><td>{f.stage}</td><td className="text-text">{f.investors.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <section>
            <h3 className="text-ink font-semibold mb-[6px]">Directors</h3>
            <ul className="space-y-[4px]">
              {c.directors.map((d) => (
                <li key={d.name + d.appointed} className="flex justify-between text-ink">
                  <span>{d.name}{d.resigned && <span className="text-muted"> (resigned {formatDate(d.resigned)})</span>}</span>
                  <span className="text-muted">appointed {formatDate(d.appointed)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="px-[24px] py-[14px] border-t border-border flex justify-end gap-[10px]">
          <Button variant="outline" onClick={() => { close(ID); go(profilePath(c.id)); }}><IdCard size={16} />Open full profile</Button>
          <Button onClick={() => { setTarget([c.id]); open('collection-modal', 'modal'); }}><ListPlus size={16} />Add to collection</Button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
