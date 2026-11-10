import type { Company } from '../../data/types';
import type { ColumnId } from '../../store/resultsStore';
import { INDUSTRY_BY_ID } from '../../data/taxonomies/industries';
import { SIGNAL_LABEL } from '../../data/taxonomies/signals';
import { formatDate, formatInt, formatMoney, joinAnd } from '../../lib/format';
import { Flag } from '../ui/Flag';
import { formatMoneyLocal } from '../../lib/money';
import { countryName } from '../../data/countries/iso3166';
import { riskOf } from '../../data/riskIndex';
import { parentEdge, ultimateParentId } from '../../data/groups';
import { getCompany } from '../../data/dataset';
import type { SortKey } from '../../query/sort';

export const industryLabels = (c: Company) => c.industries.map((id) => INDUSTRY_BY_ID.get(id)?.label ?? id);

export const COLUMN_WIDTH: Record<ColumnId, string> = {
  name: '270px',
  industries: 'minmax(180px, 1.7fr)',
  headOffice: 'minmax(130px, 1fr)',
  fundraisingTotal: '170px',
  latestFundraisingDate: '140px',
  turnover: '160px',
  employees: '100px',
  stage: '120px',
  foundedDate: '110px',
  website: 'minmax(140px, 1fr)',
  chStatus: '130px',
  signals: 'minmax(140px, 1fr)',
  creditRating: '170px',
  ultimateParent: 'minmax(150px, 1fr)',
  nextAccountsDue: '130px',
};

export const SORTABLE: Partial<Record<ColumnId, SortKey>> = {
  name: 'name',
  fundraisingTotal: 'fundraisingTotal',
  latestFundraisingDate: 'latestFundraisingDate',
  turnover: 'turnover',
  employees: 'employees',
  foundedDate: 'foundedDate',
};

export function cellText(c: Company, col: ColumnId): string {
  switch (col) {
    case 'name': return c.name;
    case 'industries': return joinAnd(industryLabels(c));
    case 'headOffice': return c.country && c.country !== 'GB' ? `${c.headOffice}, ${countryName(c.country)}` : c.headOffice;
    case 'fundraisingTotal': return formatMoneyLocal(c, c.fundraisingTotal);
    case 'latestFundraisingDate': return formatDate(c.latestFundraisingDate);
    case 'turnover': return formatMoneyLocal(c, c.turnover);
    case 'employees': return c.employees != null ? formatInt(c.employees) : '';
    case 'stage': return c.stage;
    case 'foundedDate': return formatDate(c.foundedDate);
    case 'website': return c.website?.replace(/^https?:\/\/(www\.)?/, '') ?? '';
    case 'chStatus': return c.chStatus;
    case 'signals': return joinAnd(c.signals.map((s) => SIGNAL_LABEL.get(s) ?? s));
    case 'creditRating': return riskOf(c).rating;
    case 'ultimateParent': return parentEdge(c.id) ? getCompany(ultimateParentId(c.id))?.name ?? '' : '';
    case 'nextAccountsDue': return formatDate(riskOf(c).nextAccountsDue);
  }
}

export function Cell({ c, col }: { c: Company; col: ColumnId }) {
  const txt = cellText(c, col);
  if (col === 'headOffice') {
    return (
      <span className="flex items-center gap-[7px] min-w-0">
        <Flag code={c.country ?? 'GB'} />
        <span className="truncate">{txt}</span>
      </span>
    );
  }
  if (col === 'website' && c.website) {
    return <a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block" onClick={(e) => e.stopPropagation()}>{txt}</a>;
  }
  return <span className="truncate block" title={txt}>{txt}</span>;
}
