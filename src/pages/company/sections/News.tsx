import { CategoryChips, NewsRows } from '../../../components/news/NewsTable';
import { NEWS_CATEGORIES } from '../../../data/news';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import type { SectionProps } from '../CompanyPage';
import { getCompany } from '../../../data/dataset';
import { formatDate, formatInt } from '../../../lib/format';
import { profilePath } from '../../../lib/nav';
import { Card, Pager, SectionTitle } from '../ui';

export function News({ p }: SectionProps) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [cats, setCats] = useState<string[]>([]);
  const filtered = cats.length ? p.news.filter((n) => n.categories?.some((c) => cats.includes(c))) : p.news;
  const counts = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c, p.news.filter((n) => n.categories?.includes(c)).length]));
  const shown = filtered.slice((page - 1) * size, page * size);
  return (
    <>
      <SectionTitle>News</SectionTitle>
      <div className="mb-[10px]"><CategoryChips value={cats} onChange={(v) => { setCats(v); setPage(1); }} counts={counts} /></div>
      <div className="flex items-center justify-between mb-[10px] text-[14px] text-text">
        <span>Showing <strong className="text-ink">{shown.length} of {formatInt(filtered.length)}</strong> related company news articles found</span>
        <Pager total={filtered.length} page={page} size={size} onPage={(n) => { setPage(n); window.scrollTo(0, 0); }} onSize={(n) => { setSize(n); setPage(1); }} />
      </div>
      <Card bodyClass="p-0" source="news"><NewsRows items={shown} /></Card>
    </>
  );
}
