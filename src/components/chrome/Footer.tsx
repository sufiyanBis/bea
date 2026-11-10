import { Link } from 'react-router-dom';
import { BRAND_NAME, COPYRIGHT_FROM, COPYRIGHT_TO, PROTOTYPE_NOTICE } from '../../config';

const LINKS = ['Cookies', 'Terms & Conditions', 'Privacy Policy'];
const ROUTES: [string, string][] = [['Accessibility', '/accessibility'], ['Support', '/support'], ['Service status', '/status'], ['Service & governance', '/governance'], ['Data sources', '/data-sources']];

export function Footer() {
  return (
    <footer data-app-footer className="bg-[#EDEDED] border-t border-border mt-16">
      <div className="max-w-content mx-auto px-5 py-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-text">
        {LINKS.map((l) => (
          <a key={l} href="#" onClick={(e) => e.preventDefault()} className="hover:text-primary hover:underline">{l}</a>
        ))}
        {ROUTES.map(([l, to]) => <Link key={to} to={to} className="hover:text-primary hover:underline">{l}</Link>)}
        <span className="text-muted">© Copyright {COPYRIGHT_FROM}-{COPYRIGHT_TO} {BRAND_NAME}.</span>
        <span className="basis-full text-[13px] text-text font-semibold" data-footer-notice>{PROTOTYPE_NOTICE}</span>
      </div>
    </footer>
  );
}
