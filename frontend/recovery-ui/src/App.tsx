import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BenchmarkBanner } from './components/BenchmarkBanner';
import { KpiGrid } from './components/KpiGrid';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { EventList } from './components/EventList';
import { NotificationPreviewModal } from './components/NotificationPreviewModal';
import type { DunningEvent, BenchmarkReport } from './types/recovery';

export default function App() {
  const [events, setEvents] = useState<DunningEvent[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [targetEmail, setTargetEmail] = useState('customer@example.com');
  const [activeModalEvent, setActiveModalEvent] = useState<DunningEvent | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/v1/stream/history')
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data) ? data.reverse() : []))
      .catch(() => console.log('Waiting for backend server...'));

    const eventSource = new EventSource('http://localhost:8080/api/v1/stream/events');

    eventSource.addEventListener('recovery-event', (e) => {
      const incoming: DunningEvent = JSON.parse(e.data);
      setEvents((prev) => [incoming, ...prev]);
    });

    return () => eventSource.close();
  }, []);

  const runSimulation = async (type: 'SOFT' | 'HARD') => {
    setLoadingSim(true);
    try {
      await fetch(
        `http://localhost:8080/api/v1/test/simulate?type=${type}&email=${encodeURIComponent(targetEmail)}`,
        { method: 'POST' }
      );
    } finally {
      setLoadingSim(false);
    }
  };

  const runBatchBenchmark = async () => {
    setLoadingSim(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/test/simulate-batch?totalEvents=50', {
        method: 'POST',
      });
      const data: BenchmarkReport = await res.json();
      setBenchmarkReport(data);
    } finally {
      setLoadingSim(false);
    }
  };

  const totalFailed = events.length;
  const totalRecoveredCount = events.filter(
    (e) => e.status === 'RECOVERED_ACTION_TAKEN' || e.status === 'RECOVERED_RETRY_SUCCESS'
  ).length;
  const totalRevenueSalvaged = events
    .filter((e) => e.status === 'RECOVERED_ACTION_TAKEN' || e.status === 'RECOVERED_RETRY_SUCCESS')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

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

      {/* Live Analytics & Financial Audit Export */}
      <AnalyticsPanel events={events} />

      <EventList
        events={events}
        onPreview={(event) => setActiveModalEvent(event)}
      />

      <NotificationPreviewModal
        event={activeModalEvent}
        onClose={() => setActiveModalEvent(null)}
      />
    </div>
  );
}