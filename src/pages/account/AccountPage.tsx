import { UsageMeter } from '../../export/BulkExportModal';
import { Link } from 'react-router-dom';
import { PageShell, Panel, btnOutline } from '../../components/layout/PageShell';
import { TV } from '../../components/ui/Sample';
import { TENDER } from '../../config';
import { useCurrentUser } from '../../auth/authStore';
import { AllowanceFacts } from './PlanPage';

export default function AccountPage() {
  const user = useCurrentUser();
  return (
    <PageShell title="Account" actions={<Link to="/plan" className={btnOutline}>Plan & allowances</Link>}>
      <div className="grid grid-cols-2 gap-[20px] items-start">
        <Panel title="Your account">
          <dl className="text-[14px]">
            <div className="flex py-[8px] border-b border-card-border"><dt className="w-[40%] text-text">Name</dt><dd className="text-ink">{user?.name}</dd></div>
            <div className="flex py-[8px] border-b border-card-border"><dt className="w-[40%] text-text">Email</dt><dd className="text-ink">{user?.email}</dd></div>
            <div className="flex py-[8px] border-b border-card-border"><dt className="w-[40%] text-text">Role</dt><dd className="text-ink">{user?.role} (full access to every feature)</dd></div>
            <div className="flex py-[8px]"><dt className="w-[40%] text-text">Organisation</dt><dd className="text-ink"><TV v={TENDER.clientOrg} /></dd></div>
          </dl>
        </Panel>
        <Panel title="Licences">
          <p className="text-[15px] text-ink font-semibold" data-licences>
            Licences: {TENDER.seats.value} of {TENDER.seats.value} assigned · Full access for all users
          </p>
          <p className="text-[14px] text-text mt-[8px]">Every user has every feature. The only extra for Administrators is the Admin console.</p>
        </Panel>
        <Panel title="Exports and allowance" className="col-span-2"><div className="mb-[14px]"><UsageMeter /></div><AllowanceFacts /></Panel>
      </div>
    </PageShell>
  );
}
