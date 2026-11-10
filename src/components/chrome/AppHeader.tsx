import { NotificationsBell } from '../../monitoring/pages';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompany } from '../../data/dataset';
import { LUMEN_ID, go, profilePath, recentProfiles } from '../../lib/nav';
import { useAuth, useCurrentUser } from '../../auth/authStore';
import { useAdminMenuItems } from '../../auth/guards';
import { ChevronRight, Grip } from 'lucide-react';
import { BRAND_NAME } from '../../config';
import { BeamLogo } from './BeamLogo';
import { Popover } from '../ui/Popover';
import { useIsOpen, useUi } from '../../store/uiStore';

export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2 select-none" aria-label={BRAND_NAME}>
      <BeamLogo size={26} />
      <span className="font-serif text-[22px] text-ink leading-none tracking-[-0.01em]">{BRAND_NAME}</span>
    </span>
  );
}

interface NavLinkItem { label: string; to?: string; hint?: string; logo?: string }

const USER_MENU: NavLinkItem[] = [
  { label: 'Account', to: '/account' },
  { label: 'Plan & allowances', to: '/plan' },
  { label: 'Tender coverage', to: '/tender-coverage', hint: 'Demo' },
];

const NAV: { label: string; items: NavLinkItem[] }[] = [
  { label: `My ${BRAND_NAME}`, items: [...['Dashboard', 'My collections', 'Saved searches'].map((label) => ({ label })), { label: 'Alerts', to: '/alerts' }, { label: 'Monitoring', to: '/monitoring' }, { label: 'Comparisons', to: '/comparisons' }, { label: 'Reports', to: '/reports' }, { label: 'Downloads', to: '/downloads' }, { label: 'Account settings', to: '/account' }, { label: 'Plan & allowances', to: '/plan' }] },
  { label: 'Search', items: [{ label: 'Advanced search', to: '/' }, { label: 'People search', to: '/?find=people' }, ...['Fundraising search', 'Investor search'].map((label) => ({ label }))] },
  { label: 'News & Reports', items: [{ label: 'Latest news', to: '/news' }, { label: 'My reports', to: '/reports' }, { label: 'New report', to: '/reports/new' }, { label: 'Webinars' }, { label: 'Data sources & methodology', to: '/data-sources' }] },
];

function NavItem({ label, items, tourKey, width = 210, footer, placement }: { label: string; items: NavLinkItem[]; tourKey?: string; width?: number; footer?: string; placement?: 'bottom-start' | 'bottom-end' }) {
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  const close = useUi((s) => s.close);
  const id = `nav:${label}`;
  return (
    <>
      <button ref={setEl} data-tour={tourKey} onClick={() => toggle(id)} className="flex items-center gap-[3px] text-[15px] text-ink hover:text-primary h-full">
        {label}
        <ChevronRight size={13} className="text-muted mt-[1px]" />
      </button>
      <Popover id={id} anchor={el} width={width} caret={false} className="py-1" placement={placement}>
        {items.map((it) =>
          it.to ? (
            <Link key={it.label + it.to} to={it.to} onClick={() => close(id)} className="flex items-center gap-[8px] px-4 py-2 text-[14px] text-ink hover:bg-page">
              {it.logo && <img src={it.logo} alt="" className="w-[20px] h-[20px] border border-border rounded-[2px]" />}
              <span className="truncate">{it.label}</span>
              {it.hint && <span className="ml-auto text-[12px] text-muted shrink-0">{it.hint}</span>}
            </Link>
          ) : (
            <a key={it.label} href="#" onClick={(e) => { e.preventDefault(); close(id); }} className="block px-4 py-2 text-[14px] text-ink hover:bg-page">
              {it.label}
            </a>
          ),
        )}
        {footer && <div className="px-4 pt-2 pb-1 mt-1 border-t border-border text-[12px] text-muted">{footer}</div>}
      </Popover>
    </>
  );
}

/** "Company profile" menu: the demo company plus recently viewed profiles. */
function CompanyProfileNav() {
  // re-read recent profiles each time the menu opens
  const isOpen = useIsOpen('nav:Company profile');
  const items = useMemo<NavLinkItem[]>(() => {
    const demo = getCompany(LUMEN_ID);
    const recent = recentProfiles().filter((id) => id !== LUMEN_ID).map(getCompany).filter(Boolean).slice(0, 5);
    return [
      { label: demo?.name ?? 'Lumen Bank', to: profilePath(LUMEN_ID), hint: 'Demo', logo: demo?.logo },
      ...recent.map((c) => ({ label: c!.name, to: profilePath(c!.id), hint: 'Recent', logo: c!.logo })),
    ];
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  return <NavItem label="Company profile" items={items} tourKey="nav-company-profile" width={280} footer="Tip: click any company name in your search results to open its profile." />;
}

function UserMenu() {
  const user = useCurrentUser();
  const admin = useAdminMenuItems();
  const signOut = useAuth((s) => s.signOut);
  const [el, setEl] = useState<HTMLButtonElement | null>(null);
  const toggle = useUi((s) => s.toggle);
  const close = useUi((s) => s.close);
  if (!user) return <Link to="/sign-in" className="hover:text-primary">Sign in</Link>;
  const id = 'nav:user';
  const item = 'flex items-center gap-[8px] w-full text-left px-4 py-2 text-[14px] text-ink hover:bg-page';
  return (
    <>
      <button ref={setEl} data-tour="user-menu" data-user-menu onClick={() => toggle(id)} className="flex items-center gap-[3px] hover:text-primary h-full">
        {user.name.split(' ')[0]}<ChevronRight size={13} className="text-muted" />
      </button>
      <Popover id={id} anchor={el} width={240} caret={false} className="py-1" placement="bottom-end">
        <div className="px-4 py-2 border-b border-border"><div className="text-[14px] font-semibold text-ink">{user.name}</div><div className="text-[12px] text-muted">{user.email} · {user.role}</div></div>
        {[...USER_MENU, ...admin].map((it) => <Link key={it.to} to={it.to!} onClick={() => close(id)} className={item}>{it.label}{it.hint && <span className="ml-auto text-[12px] text-muted">{it.hint}</span>}</Link>)}
        <div className="border-t border-border mt-1 pt-1">
          <Link to="/sign-in" onClick={() => { close(id); signOut(); }} className={item} data-switch-user>Switch user</Link>
          <button onClick={() => { close(id); signOut(); go('/sign-in'); }} className={item} data-sign-out>Sign out</button>
        </div>
      </Popover>
    </>
  );
}

export function AppHeader() {
  return (
    <header data-app-header className="bg-surface border-b border-border h-[52px]">
      <div className="h-full px-[20px] flex items-center">
        <Link to="/" className="mr-[34px]" aria-label={`${BRAND_NAME} home`}>
          <BrandMark />
        </Link>
        <nav className="flex items-center gap-[26px] h-full">
          {NAV.map((n) => <NavItem key={n.label} {...n} />)}
          <CompanyProfileNav />
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-[24px] text-[15px] text-ink">
          <Link to="/help" className="hover:text-primary">Help</Link>
          <Link to="/whats-new" className="hover:text-primary">What&apos;s New</Link>
          <NotificationsBell />
          <UserMenu />
          <button aria-label="Apps" className="w-[34px] h-[34px] bg-[#EFEFEF] rounded-btn flex items-center justify-center text-ink hover:bg-[#e4e4e4]">
            <Grip size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
