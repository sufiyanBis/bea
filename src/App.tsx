import { lazy, ReactNode, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { RequireAdmin, RequireAuth } from './auth/guards';
import { UsageTracker } from './usage/tracker';
import './auth/audit';
import { AppHeader } from './components/chrome/AppHeader';
import { PrototypeBanner } from './components/chrome/PrototypeBanner';
import { Footer } from './components/chrome/Footer';
import { FloatingHelp } from './components/chrome/FloatingHelp';
import { CollectionModal } from './components/results/CollectionModal';
import { CompanyDrawer } from './components/results/CompanyDrawer';
import { TourEngine } from './components/tour/TourEngine';
import { BookDemoModal } from './components/tour/BookDemoModal';
import { SaveSearchModal, OpenSearchModal, HelpModal } from './components/chrome/SearchModals';
import { SearchPage } from './pages/search/SearchPage';
import { setNavigate } from './lib/nav';
import { ROUTER_BASENAME } from './config';
import { RouteErrorBoundary } from './components/errors/RouteErrorBoundary';
import { CompareTray } from './components/compare/CompareTray';
import { ShortcutsOverlay } from './components/chrome/ShortcutsOverlay';
import { BulkExportModal } from './export/BulkExportModal';
import { installBulkHandler } from './export/exportJobs';

installBulkHandler();

const CompanyPage = lazy(() => import('./pages/company/CompanyPage'));
const TenderCoveragePage = lazy(() => import('./pages/tender/TenderCoveragePage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const PlanPage = lazy(() => import('./pages/account/PlanPage'));
const DataSourcesPage = lazy(() => import('./pages/sources/DataSourcesPage'));
const ComparePage = lazy(() => import('./pages/compare/ComparePage'));
const ComparisonsPage = lazy(() => import('./pages/compare/ComparePage').then((m) => ({ default: m.ComparisonsPage })));
const ReportBuilderPage = lazy(() => import('./reports/ReportBuilderPage'));
const ReportsPage = lazy(() => import('./reports/ReportBuilderPage').then((m) => ({ default: m.ReportsPage })));
const DownloadsPage = lazy(() => import('./export/DownloadsPage'));
const SignInPage = lazy(() => import('./auth/SignInPage'));
const AdminPage = lazy(() => import('./admin/AdminPage'));
const PersonPage = lazy(() => import('./pages/people/PersonPage'));
const NewsPage = lazy(() => import('./monitoring/pages').then((m) => ({ default: m.NewsPage })));
const AlertsPage = lazy(() => import('./monitoring/pages').then((m) => ({ default: m.AlertsPage })));
const MonitoringPage = lazy(() => import('./monitoring/pages').then((m) => ({ default: m.MonitoringPage })));
const info = () => import('./pages/info/InfoPages');
const HelpPage = lazy(() => info().then((m) => ({ default: m.HelpPage })));
const HelpArticlePage = lazy(() => info().then((m) => ({ default: m.HelpArticlePage })));
const SupportPage = lazy(() => info().then((m) => ({ default: m.SupportPage })));
const AccessibilityPage = lazy(() => info().then((m) => ({ default: m.AccessibilityPage })));
const WhatsNewPage = lazy(() => info().then((m) => ({ default: m.WhatsNewPage })));
const StatusPage = lazy(() => info().then((m) => ({ default: m.StatusPage })));
const GovernancePage = lazy(() => info().then((m) => ({ default: m.GovernancePage })));
const NotFoundPage = lazy(() => import('./pages/misc/NotFoundPage'));

function NavBridge() {
  const navigate = useNavigate();
  useEffect(() => setNavigate((to, opts) => navigate(to, opts)), [navigate]);
  return null;
}

const lazyEl = (node: ReactNode) => <RouteErrorBoundary><Suspense fallback={<div className="py-20 text-center text-muted">Loading…</div>}>{node}</Suspense></RouteErrorBoundary>;

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <NavBridge />
      <UsageTracker />
      <div className="min-h-screen flex flex-col bg-page">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-[6px] focus:left-[6px] focus:z-[100] focus:bg-white focus:text-primary focus:px-[14px] focus:py-[8px] focus:rounded-btn focus:shadow-lg focus:outline focus:outline-2 focus:outline-primary" data-skip-link>Skip to content</a>
        <div className="sticky top-0 z-40" data-app-chrome>
          <PrototypeBanner />
          <AppHeader />
        </div>
        <main className="flex-1 focus:outline-none" id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/sign-in" element={lazyEl(<SignInPage />)} />
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/:tab" element={<RequireAuth><RequireAdmin>{lazyEl(<AdminPage />)}</RequireAdmin></RequireAuth>} />
            <Route path="/" element={<RequireAuth><RouteErrorBoundary route="/"><SearchPage /></RouteErrorBoundary></RequireAuth>} />
            <Route path="/companies/:id/:section?" element={<RequireAuth>{lazyEl(<CompanyPage />)}</RequireAuth>} />
            <Route path="/tender-coverage" element={<RequireAuth>{lazyEl(<TenderCoveragePage />)}</RequireAuth>} />
            <Route path="/account" element={<RequireAuth>{lazyEl(<AccountPage />)}</RequireAuth>} />
            <Route path="/plan" element={<RequireAuth>{lazyEl(<PlanPage />)}</RequireAuth>} />
            <Route path="/data-sources" element={<RequireAuth>{lazyEl(<DataSourcesPage />)}</RequireAuth>} />
            <Route path="/compare" element={<RequireAuth>{lazyEl(<ComparePage />)}</RequireAuth>} />
            <Route path="/comparisons" element={<RequireAuth>{lazyEl(<ComparisonsPage />)}</RequireAuth>} />
            <Route path="/reports" element={<RequireAuth>{lazyEl(<ReportsPage />)}</RequireAuth>} />
            <Route path="/reports/new" element={<RequireAuth>{lazyEl(<ReportBuilderPage key="new" />)}</RequireAuth>} />
            <Route path="/reports/:id" element={<RequireAuth>{lazyEl(<ReportBuilderPage />)}</RequireAuth>} />
            <Route path="/downloads" element={<RequireAuth>{lazyEl(<DownloadsPage />)}</RequireAuth>} />
            <Route path="/people/:id" element={<RequireAuth>{lazyEl(<PersonPage />)}</RequireAuth>} />
            <Route path="/news" element={<RequireAuth>{lazyEl(<NewsPage />)}</RequireAuth>} />
            <Route path="/alerts" element={<RequireAuth>{lazyEl(<AlertsPage />)}</RequireAuth>} />
            <Route path="/monitoring" element={<RequireAuth>{lazyEl(<MonitoringPage />)}</RequireAuth>} />
            <Route path="/help" element={<RequireAuth>{lazyEl(<HelpPage />)}</RequireAuth>} />
            <Route path="/help/:article" element={<RequireAuth>{lazyEl(<HelpArticlePage />)}</RequireAuth>} />
            <Route path="/support" element={<RequireAuth>{lazyEl(<SupportPage />)}</RequireAuth>} />
            <Route path="/accessibility" element={lazyEl(<AccessibilityPage />)} />
            <Route path="/whats-new" element={<RequireAuth>{lazyEl(<WhatsNewPage />)}</RequireAuth>} />
            <Route path="/status" element={lazyEl(<StatusPage />)} />
            <Route path="/governance" element={<RequireAuth>{lazyEl(<GovernancePage />)}</RequireAuth>} />
            <Route path="*" element={<RequireAuth>{lazyEl(<NotFoundPage />)}</RequireAuth>} />
          </Routes>
        </main>
        <Footer />
        <FloatingHelp />
        <CollectionModal />
        <CompanyDrawer />
        <BookDemoModal />
        <SaveSearchModal />
        <OpenSearchModal />
        <HelpModal />
        <CompareTray />
        <BulkExportModal />
        <ShortcutsOverlay />
        <TourEngine />
      </div>
    </BrowserRouter>
  );
}
