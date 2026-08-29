import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
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

export default function App() {
  const [events, setEvents] = useState<DunningEvent[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [targetEmail, setTargetEmail] = useState('customer@example.com');
  const [activeModalEvent, setActiveModalEvent] = useState<DunningEvent | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [activeCustomerPaymentId, setActiveCustomerPaymentId] = useState<string | null>(null);
  const [portalPaymentId, setPortalPaymentId] = useState<string | null>(null);

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
  }, []);

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

      <BankRadarBanner />

      <ServerAnalyticsPanel />

      <AnalyticsPanel events={events} />

      <EventList
        events={events}
        onPreview={handlePreview}
        onOpenPortal={handleOpenPortal}
      />

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
