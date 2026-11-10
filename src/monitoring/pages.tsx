import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ExternalLink, Mail, Pause, Play, Trash2 } from 'lucide-react';
import { PageShell, Panel, btnOutline, btnPrimary, th, td } from '../components/layout/PageShell';
import { Modal } from '../components/ui/Modal';
import { Popover } from '../components/ui/Popover';
import { useUi } from '../store/uiStore';
import { useMonitoring, EVENT_TYPES, type EventType, type Frequency, type Rule } from './store';
import { useSaved } from '../store/savedStore';
import { useCollections } from '../store/collectionsStore';
import { CategoryChips, NewsRows } from '../components/news/NewsTable';
import { CountrySelect } from '../components/ui/CountrySelect';
import { globalNews, NEWS_CATEGORIES } from '../data/news';
import { INDUSTRY_ITEMS } from '../data/taxonomies/industries';
import { load, save } from '../lib/storage';
import { formatInt } from '../lib/format';
import { useCurrentUser } from '../auth/authStore';
import { Pager } from '../pages/company/ui';

const dt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ------------------------------------------------------------------ bell
export function NotificationsBell() {
  const alerts = useMonitoring((s) => s.alerts);
  const markRead = useMonitoring((s) => s.markRead);
  const unread = alerts.filter((a) => !a.read);
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  const close = useUi((s) => s.close);
  return (
    <>
      <button ref={setEl} onClick={() => toggle('bell')} aria-label={`Notifications: ${unread.length} unread`} data-bell className="relative w-[34px] h-[34px] flex items-center justify-center rounded-btn hover:bg-[#EFEFEF] text-ink">
        <Bell size={18} />
        {unread.length > 0 && <span className="absolute -top-[2px] -right-[2px] min-w-[18px] h-[18px] px-[4px] rounded-full bg-[#D7263D] text-white text-[11px] font-bold flex items-center justify-center" data-bell-count>{unread.length > 99 ? '99+' : unread.length}</span>}
      </button>
      <Popover id="bell" anchor={el} width={360} caret={false} placement="bottom-end" className="py-[4px]">
        <div className="flex items-center justify-between px-[14px] py-[8px] border-b border-border">
          <span className="text-[14px] font-semibold text-ink">Alerts</span>
          <button className="text-[13px] text-primary hover:underline" onClick={() => markRead(unread.map((a) => a.id))}>Mark all read</button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto nb-scroll">
          {alerts.slice(0, 8).map((a) => (
            <li key={a.id}>
              <Link to={a.link} onClick={() => { markRead([a.id]); close('bell'); }} className={`block px-[14px] py-[8px] hover:bg-page ${a.read ? '' : 'bg-primary-light/50'}`}>
                <div className="text-[12px] text-muted">{a.type} · {dt(a.ts)}</div>
                <div className={`text-[14px] ${a.read ? 'text-text' : 'text-ink font-semibold'}`}>{a.title}</div>
              </Link>
            </li>
          ))}
          {!alerts.length && <li className="px-[14px] py-[12px] text-[14px] text-text">No alerts yet.</li>}
        </ul>
        <div className="flex justify-between px-[14px] py-[8px] border-t border-border text-[13px]">
          <Link to="/alerts" onClick={() => close('bell')} className="text-primary hover:underline">Open inbox</Link>
          <Link to="/monitoring" onClick={() => close('bell')} className="text-primary hover:underline">Manage monitoring</Link>
        </div>
      </Popover>
    </>
  );
}

// ------------------------------------------------------------------ alerts inbox
export function AlertsPage() {
  const { alerts, markRead } = useMonitoring();
  const [type, setType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const shown = alerts.filter((a) => (!type || a.type === type) && (!unreadOnly || !a.read));
  return (
    <PageShell title="Alerts" actions={<Link to="/monitoring" className={btnOutline}>Manage monitoring</Link>}>
      <div className="flex items-center gap-[12px] mb-[12px] text-[14px]">
        <label className="inline-flex items-center gap-[6px]">Type<select value={type} onChange={(e) => setType(e.target.value)} className="h-[30px] border border-border rounded-btn px-2 bg-white"><option value="">All</option>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="inline-flex items-center gap-[6px]"><input type="checkbox" className="accent-primary" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />Unread only</label>
        <span className="text-text">{shown.length} alerts</span>
        <button className={`${btnOutline} ml-auto`} onClick={() => markRead(shown.map((a) => a.id))}>Mark shown as read</button>
      </div>
      <Panel bodyClass="">
        <table className="w-full border-collapse" data-alerts-table>
          <thead><tr>{['', 'Alert', 'Type', 'About', 'When', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
          <tbody>{shown.map((a) => (
            <tr key={a.id} className={a.read ? '' : 'bg-primary-light/40'}>
              <td className={td}>{!a.read && <span role="img" className="inline-block w-[8px] h-[8px] rounded-full bg-[#D7263D]" aria-label="Unread" />}</td>
              <td className={`${td} ${a.read ? '' : 'font-semibold'}`}><Link to={a.link} onClick={() => markRead([a.id])} className="hover:text-primary hover:underline">{a.title}</Link></td>
              <td className={td}>{a.type}</td>
              <td className={td}>{a.target.label}</td>
              <td className={`${td} whitespace-nowrap`}>{dt(a.ts)}</td>
              <td className={`${td} whitespace-nowrap space-x-[10px] text-[13px]`}>
                <button className="text-primary hover:underline" onClick={() => markRead([a.id], !a.read)}>{a.read ? 'Mark unread' : 'Mark read'}</button>
                {a.sourceUrl && <a href={a.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline inline-flex items-center gap-[3px]">Source<ExternalLink size={12} /></a>}
              </td>
            </tr>
          ))}{!shown.length && <tr><td colSpan={6} className={`${td} text-text`}>No alerts.</td></tr>}</tbody>
        </table>
      </Panel>
    </PageShell>
  );
}

// ------------------------------------------------------------------ monitoring rules
export function MonitoringPage() {
  const { rules, updateRule, removeRule, addRule } = useMonitoring();
  const saved = useSaved((s) => s.saved);
  const collections = useCollections((s) => s.collections);
  const open = useUi((s) => s.open);
  const [editing, setEditing] = useState<string | null>(null);
  const [preview, setPreview] = useState<Rule | null>(null);
  const focus = useLocation().hash.slice(1);
  const rule = rules.find((r) => r.id === editing);
  return (
    <PageShell title="Monitoring" actions={<Link to="/alerts" className={btnOutline}><Bell size={15} />Alerts inbox</Link>}
      intro="Get alerts when monitored companies, people, saved searches or collections change. Email delivery is simulated in this prototype.">
      <div className="flex flex-wrap items-center gap-[10px] mb-[12px] text-[14px]">
        <span className="text-text">Monitor a</span>
        <select aria-label="Monitor a saved search" defaultValue="" onChange={(e) => { const s = saved.find((x) => x.id === e.target.value); if (s) addRule({ kind: 'search', id: s.id, label: s.name }); e.target.value = ''; }} className="h-[30px] border border-border rounded-btn px-2 bg-white" data-monitor-search>
          <option value="" disabled>saved search…</option>{saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Monitor a collection" defaultValue="" onChange={(e) => { const c = collections.find((x) => x.id === e.target.value); if (c) addRule({ kind: 'collection', id: c.id, label: c.name }); e.target.value = ''; }} className="h-[30px] border border-border rounded-btn px-2 bg-white" data-monitor-collection>
          <option value="" disabled>collection…</option>{collections.slice(0, 30).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-text">Companies and people: use the Monitor button on their page.</span>
      </div>
      <Panel bodyClass="">
        <table className="w-full border-collapse" data-rules-table>
          <thead><tr>{['Monitoring', 'Type', 'Events', 'Frequency', 'Channels', 'Status', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{rules.map((r) => (
            <tr key={r.id} id={r.id} className={focus === r.id ? 'bg-primary-light/50' : ''} data-rule={r.target.id}>
              <td className={`${td} font-semibold`}><Link to={r.target.kind === 'company' ? `/companies/${r.target.id}` : r.target.kind === 'person' ? `/people/${r.target.id}` : '/'} className="text-primary hover:underline">{r.target.label}</Link></td>
              <td className={`${td} capitalize`}>{r.target.kind === 'search' ? 'saved search' : r.target.kind}</td>
              <td className={`${td} text-[13px]`}>{r.events.length} event types</td>
              <td className={td}>{r.frequency}</td>
              <td className={td}>In-app{r.email ? ', email (simulated)' : ''}</td>
              <td className={td}><span className={`px-[8px] py-[2px] rounded-full text-[12px] font-semibold ${r.paused ? 'bg-[#EFEFEF] text-text' : 'bg-[#DCF3E1] text-[#1E6B34]'}`}>{r.paused ? 'Paused' : 'Active'}</span></td>
              <td className={`${td} whitespace-nowrap space-x-[10px] text-[13px]`}>
                <button className="text-primary hover:underline" onClick={() => { setEditing(r.id); open('edit-rule', 'modal'); }} data-edit-rule={r.target.id}>Edit</button>
                <button className="text-primary hover:underline inline-flex items-center gap-[3px]" onClick={() => updateRule(r.id, { paused: !r.paused })}>{r.paused ? <><Play size={12} />Resume</> : <><Pause size={12} />Pause</>}</button>
                {r.email && <button className="text-primary hover:underline inline-flex items-center gap-[3px]" onClick={() => { setPreview(r); open('email-preview', 'modal'); }} data-email-preview><Mail size={12} />Email preview</button>}
                <button className="text-text hover:text-[#C0392B] inline-flex items-center gap-[3px]" onClick={() => removeRule(r.id)}><Trash2 size={12} />Delete</button>
              </td>
            </tr>
          ))}{!rules.length && <tr><td colSpan={7} className={`${td} text-text`}>Nothing monitored yet.</td></tr>}</tbody>
        </table>
      </Panel>
      {rule && <RuleModal rule={rule} onSave={(p) => updateRule(rule.id, p)} />}
      {preview && <EmailPreview rule={preview} />}
    </PageShell>
  );
}

function RuleModal({ rule, onSave }: { rule: Rule; onSave: (p: Partial<Rule>) => void }) {
  const close = useUi((s) => s.close);
  const [events, setEvents] = useState<EventType[]>(rule.events);
  const [freq, setFreq] = useState<Frequency>(rule.frequency);
  const [email, setEmail] = useState(rule.email);
  return (
    <Modal id="edit-rule" width={560} label="Edit alert rule">
      <div className="px-[22px] py-[16px] border-b border-border"><h2 className="text-[18px] text-ink font-semibold">Alerts for {rule.target.label}</h2></div>
      <div className="px-[22px] py-[16px] space-y-[14px] text-[14px]">
        <fieldset><legend className="font-semibold text-ink mb-[6px]">Events</legend>
          <div className="grid grid-cols-2 gap-x-[12px] gap-y-[4px]">
            {EVENT_TYPES.map((t) => <label key={t} className="inline-flex items-center gap-[6px]"><input type="checkbox" className="accent-primary" checked={events.includes(t)} onChange={(e) => setEvents(e.target.checked ? [...events, t] : events.filter((x) => x !== t))} />{t}</label>)}
          </div>
        </fieldset>
        <fieldset className="flex items-center gap-[14px]"><legend className="font-semibold text-ink mr-[8px]">Frequency</legend>
          {(['Instant', 'Daily digest', 'Weekly digest'] as Frequency[]).map((f) => <label key={f} className="inline-flex items-center gap-[5px]"><input type="radio" name="freq" className="accent-primary" checked={freq === f} onChange={() => setFreq(f)} />{f}</label>)}
        </fieldset>
        <fieldset><legend className="font-semibold text-ink mb-[6px]">Channels</legend>
          <label className="inline-flex items-center gap-[6px] mr-[16px]"><input type="checkbox" checked disabled className="accent-primary" />In-app (always on)</label>
          <label className="inline-flex items-center gap-[6px]"><input type="checkbox" className="accent-primary" checked={email} onChange={(e) => setEmail(e.target.checked)} data-rule-email />Email (simulated in this prototype)</label>
        </fieldset>
      </div>
      <div className="flex justify-end gap-[10px] px-[22px] py-[14px] border-t border-border">
        <button className={btnOutline} onClick={() => close('edit-rule')}>Cancel</button>
        <button className={btnPrimary} disabled={!events.length} onClick={() => { onSave({ events, frequency: freq, email }); close('edit-rule'); }} data-save-rule>Save</button>
      </div>
    </Modal>
  );
}

function EmailPreview({ rule }: { rule: Rule }) {
  const user = useCurrentUser();
  const alerts = useMonitoring((s) => s.alerts.filter((a) => a.ruleId === rule.id).slice(0, 5));
  return (
    <Modal id="email-preview" width={600} label="Email preview">
      <div className="px-[22px] py-[16px] border-b border-border flex items-center justify-between"><h2 className="text-[18px] text-ink font-semibold">Email preview (simulated)</h2><span className="text-[12px] text-muted">Not sent: prototype</span></div>
      <div className="px-[22px] py-[16px] text-[14px]" data-email-body>
        <div className="text-[13px] text-text space-y-[2px] mb-[12px] border-b border-border pb-[10px]">
          <div><strong>To:</strong> {user?.email}</div><div><strong>Subject:</strong> {rule.frequency === 'Instant' ? 'New alert' : rule.frequency}: {rule.target.label}</div>
        </div>
        <p>Hello {user?.name.split(' ')[0]},</p>
        <p className="mt-[8px]">Here is what changed for <strong>{rule.target.label}</strong>:</p>
        <ul className="list-disc pl-[20px] mt-[6px]">{alerts.length ? alerts.map((a) => <li key={a.id}>{a.title}</li>) : <li>No new events yet. Use “Simulate new events” on the Tender coverage page.</li>}</ul>
        <p className="mt-[10px] text-[12px] text-muted">Prototype for client demo. All data shown is sample data. Manage alerts in Monitoring.</p>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ global news
interface NewsSearch { id: string; name: string; cats: string[]; countries: string[]; industry: string; from: string; to: string; collection: string }
const NEWS_KEY = 'nb.newsSearches';

export function NewsPage() {
  const all = globalNews();
  const collections = useCollections((s) => s.collections);
  const [cats, setCats] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [industry, setIndustry] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [collection, setCollection] = useState('');
  const [page, setPage] = useState(1);
  const [searches, setSearches] = useState<NewsSearch[]>(() => load<NewsSearch[]>(NEWS_KEY, [{ id: 'ns-1', name: 'Insolvency in the UK and Ireland', cats: ['Insolvency & administration'], countries: ['GB', 'IE'], industry: '', from: '', to: '', collection: '' }]));
  const filtered = useMemo(() => {
    const col = collections.find((c) => c.id === collection);
    return all.filter((a) => (!cats.length || a.categories.some((c) => cats.includes(c))) && (!countries.length || countries.includes(a.country)) && (!industry || a.industry === industry)
      && (!from || a.date >= from) && (!to || a.date <= to) && (!col || col.companyIds.includes(a.companyId)));
  }, [all, cats, countries, industry, from, to, collection, collections]);
  const counts = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c, all.filter((a) => a.categories.includes(c)).length]));
  const apply = (s: NewsSearch) => { setCats(s.cats); setCountries(s.countries); setIndustry(s.industry); setFrom(s.from); setTo(s.to); setCollection(s.collection); setPage(1); };
  const saveSearch = () => { const name = `News: ${cats.join(', ') || 'all categories'}${countries.length ? ` in ${countries.join(', ')}` : ''}`; const next = [{ id: `ns-${Date.now().toString(36)}`, name, cats, countries, industry, from, to, collection }, ...searches]; setSearches(next); save(NEWS_KEY, next); };
  return (
    <PageShell title="News" wide intro="Company news across every country we cover, tagged by category with a link to the source. Articles and links are samples.">
      <div className="grid grid-cols-[1fr_280px] gap-[18px] items-start">
        <div>
          <div className="mb-[10px]"><CategoryChips value={cats} onChange={(v) => { setCats(v); setPage(1); }} counts={counts} /></div>
          <div className="flex flex-wrap items-center gap-[10px] mb-[10px] text-[14px] text-text" data-news-filters>
            <span>Country</span><CountrySelect mode="multi" value={countries} onChange={(v) => { setCountries(v); setPage(1); }} label="News countries" />
            <label className="inline-flex items-center gap-[6px]">Industry<select value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-[28px] border border-border rounded-btn px-2 bg-white max-w-[200px]"><option value="">All</option>{INDUSTRY_ITEMS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
            <label className="inline-flex items-center gap-[6px]">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-[28px] border border-border rounded-btn px-[4px]" /></label>
            <label className="inline-flex items-center gap-[6px]">to<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-[28px] border border-border rounded-btn px-[4px]" /></label>
            <label className="inline-flex items-center gap-[6px]">Collection<select value={collection} onChange={(e) => setCollection(e.target.value)} className="h-[28px] border border-border rounded-btn px-2 bg-white max-w-[180px]"><option value="">Any</option>{collections.slice(0, 30).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <div className="flex items-center justify-between mb-[8px] text-[14px] text-text">
            <span><strong className="text-ink">{formatInt(filtered.length)}</strong> articles</span>
            <Pager total={filtered.length} page={page} size={20} onPage={setPage} />
          </div>
          <Panel bodyClass="p-0"><NewsRows items={filtered.slice((page - 1) * 20, page * 20)} /></Panel>
        </div>
        <Panel title="Saved news searches" bodyClass="p-[14px]">
          <button className={`${btnOutline} w-full justify-center mb-[10px]`} onClick={saveSearch} data-save-news-search>Save this news search</button>
          <ul className="space-y-[6px] text-[14px]" data-news-searches>{searches.map((s) => <li key={s.id}><button className="text-primary hover:underline text-left" onClick={() => apply(s)}>{s.name}</button></li>)}</ul>
        </Panel>
      </div>
    </PageShell>
  );
}
