import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutDashboard, Activity, Landmark } from 'lucide-react';
import { Header } from './components/Header';
import { Landing } from './components/Landing';
import { BenchmarkBanner } from './components/BenchmarkBanner';
import { KpiGrid } from './components/KpiGrid';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { ServerAnalyticsPanel } from './components/ServerAnalyticsPanel';
import { BankRadarBanner } from './components/BankRadarBanner';
import { EventList } from './components/EventList';
import { NotificationPreviewModal } from './components/NotificationPreviewModal';
import { CustomerPaymentPortal } from './components/CustomerPaymentPortal';
import { RecoveryPortalModal } from './components/RecoveryPortalModal';
import { API_STREAM_URL, API_TEST_URL, adminHeaders } from './config/api';
import { RECOVERED_STATUSES } from './types/recovery';
import type { DunningEvent, BenchmarkReport } from './types/recovery';

type Section = 'dashboard' | 'radar' | 'analytics';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'radar', label: 'Bank Radar', icon: Landmark },
  { id: 'analytics', label: 'Analytics', icon: Activity },
];

export default function App() {
  const [events, setEvents] = useState<DunningEvent[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [targetEmail, setTargetEmail] = useState('customer@example.com');
  const [activeModalEvent, setActiveModalEvent] = useState<DunningEvent | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [activeCustomerPaymentId, setActiveCustomerPaymentId] = useState<string | null>(null);
  const [portalPaymentId, setPortalPaymentId] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(() => !new URLSearchParams(window.location.search).has('payId'));
  const [section, setSection] = useState<Section>('dashboard');
  const [resettingDemo, setResettingDemo] = useState(false);
  const [historyNonce, setHistoryNonce] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payId = params.get('payId');
    if (payId) {
      setActiveCustomerPaymentId(payId);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_STREAM_URL}/history`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
      })
      .then((data) => setEvents(Array.isArray(data) ? data.reverse() : []))
      .catch((err) => {
        if (err.name !== 'AbortError') console.log('Waiting for backend server...');
      });

    const eventSource = new EventSource(`${API_STREAM_URL}/events`);
    eventSource.addEventListener('recovery-event', (e) => {
      try {
        const incoming: DunningEvent = JSON.parse(e.data);
        setEvents((prev) => {
          const idx = prev.findIndex((item) => item.paymentId === incoming.paymentId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = incoming;
            return updated;
          }
          return [incoming, ...prev];
        });
      } catch {
        console.error('Failed to parse SSE event');
      }
    });

    return () => {
      controller.abort();
      eventSource.close();
    };
  }, [historyNonce]);

  const runSimulation = useCallback(async (type: 'SOFT' | 'HARD') => {
    setLoadingSim(true);
    try {
      const res = await fetch(
        `${API_TEST_URL}/simulate?type=${type}&email=${encodeURIComponent(targetEmail)}`,
        { method: 'POST', headers: adminHeaders }
      );
      if (!res.ok) console.error('Simulation failed:', res.status);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoadingSim(false);
    }
  }, [targetEmail]);

  const runBatchBenchmark = useCallback(async () => {
    setLoadingSim(true);
    try {
      const res = await fetch(`${API_TEST_URL}/simulate-batch?totalEvents=50`, {
        method: 'POST',
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error('Benchmark failed');
      const data: BenchmarkReport = await res.json();
      setBenchmarkReport(data);
    } catch (err) {
      console.error('Benchmark error:', err);
    } finally {
      setLoadingSim(false);
    }
  }, []);

  const runResetDemo = useCallback(async () => {
    setResettingDemo(true);
    try {
      const res = await fetch(`${API_TEST_URL}/reset-demo?seed=true`, {
        method: 'POST',
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error('Reset failed');
      setHistoryNonce((n) => n + 1);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setResettingDemo(false);
    }
  }, []);

  const totalFailed = events.length;
  const totalRecoveredCount = useMemo(
    () => events.filter((e) => RECOVERED_STATUSES.has(e.status)).length,
    [events]
  );
  const totalRevenueSalvaged = useMemo(
    () => events
      .filter((e) => RECOVERED_STATUSES.has(e.status))
      .reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [events]
  );

  const handlePreview = useCallback((event: DunningEvent) => setActiveModalEvent(event), []);
  const handleOpenPortal = useCallback((paymentId: string) => setPortalPaymentId(paymentId), []);

  if (showLanding) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  if (activeCustomerPaymentId) {
    return (
      <CustomerPaymentPortal
        paymentId={activeCustomerPaymentId}
        onBackToDashboard={() => setActiveCustomerPaymentId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      <Header
        targetEmail={targetEmail}
        setTargetEmail={setTargetEmail}
        loadingSim={loadingSim}
        onSimulate={runSimulation}
        onBenchmark={runBatchBenchmark}
        onResetDemo={runResetDemo}
        resettingDemo={resettingDemo}
        onGoHome={() => setShowLanding(true)}
      />

      <BenchmarkBanner
        report={benchmarkReport}
        onDismiss={() => setBenchmarkReport(null)}
      />

      <KpiGrid
        totalFailed={totalFailed}
        totalRecoveredCount={totalRecoveredCount}
        totalRevenueSalvaged={totalRevenueSalvaged}
      />

      {/* Section Tabs */}
      <nav className="flex items-center gap-2 border-b border-slate-200 mt-2 mb-6 overflow-x-auto">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              section === id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {section === 'dashboard' && (
        <EventList
          events={events}
          onPreview={handlePreview}
          onOpenPortal={handleOpenPortal}
        />
      )}

      {section === 'radar' && (
        <BankRadarBanner />
      )}

      {section === 'analytics' && (
        <div className="space-y-6">
          <ServerAnalyticsPanel />
          <AnalyticsPanel events={events} />
        </div>
      )}

      <NotificationPreviewModal
        event={activeModalEvent}
        onClose={() => setActiveModalEvent(null)}
      />

      {portalPaymentId && (
        <RecoveryPortalModal
          paymentId={portalPaymentId}
          onClose={() => setPortalPaymentId(null)}
        />
      )}
    </div>
  );
}
