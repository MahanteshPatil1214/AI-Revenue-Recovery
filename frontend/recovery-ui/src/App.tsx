import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Zap, DollarSign, Clock, RefreshCw, 
  CheckCircle2, Play, MessageSquare, Mail, X, Smartphone 
} from 'lucide-react';

interface DunningEvent {
  id?: number;
  paymentId: string;
  amount: number;
  customerEmail: string;
  customerContact: string;
  errorCode: string;
  errorReason: string;
  category: 'TRANSIENT_SOFT_FAIL' | 'PERMANENT_HARD_FAIL';
  strategyApplied: string;
  reasoningTrace: string;
  recoveryUrl?: string;
  status: string;
  createdAt: string;
}

interface BenchmarkReport {
  batchSize: number;
  hardFailuresEscalated: number;
  softFailuresQueued: number;
  totalValueProcessed: number;
  processingDurationMs: number;
  throughputEventsPerSec: number;
}

export default function App() {
  const [events, setEvents] = useState<DunningEvent[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [targetEmail, setTargetEmail] = useState('customer@example.com');
  const [activeModalEvent, setActiveModalEvent] = useState<DunningEvent | null>(null);
  const [previewTab, setPreviewTab] = useState<'whatsapp' | 'email'>('whatsapp');
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
      await fetch(`http://localhost:8080/api/v1/test/simulate?type=${type}&email=${encodeURIComponent(targetEmail)}`, { method: 'POST' });
    } finally {
      setLoadingSim(false);
    }
  };

  const runBatchBenchmark = async () => {
    setLoadingSim(true);
    try {
      const res = await fetch('http://localhost:8080/api/v1/test/simulate-batch?totalEvents=50', { method: 'POST' });
      const data: BenchmarkReport = await res.json();
      setBenchmarkReport(data);
    } finally {
      setLoadingSim(false);
    }
  };

  const totalFailed = events.length;
  const totalRecoveredCount = events.filter((e) => e.status === 'RECOVERED_ACTION_TAKEN').length;
  const totalRevenueSalvaged = events
    .filter((e) => e.status === 'RECOVERED_ACTION_TAKEN')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Razorpay AI Revenue Recovery Engine</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Autonomous Failure Classifier, Smart-Dunning & Multi-Channel Escalation</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="email"
            placeholder="Target Test Email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 font-mono"
          />
          <button
            onClick={() => runSimulation('SOFT')}
            disabled={loadingSim}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg shadow-sm transition disabled:opacity-50">
            <Clock size={14} /> Soft Fail
          </button>
          <button
            onClick={() => runSimulation('HARD')}
            disabled={loadingSim}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg shadow-sm transition disabled:opacity-50">
            <Zap size={14} /> Hard Fail
          </button>
          <button
            onClick={runBatchBenchmark}
            disabled={loadingSim}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-lg shadow-md shadow-blue-500/20 transition disabled:opacity-50">
            <Play size={14} /> Run 50-Event Batch
          </button>
        </div>
      </header>

      {/* Benchmark Report Summary Banner */}
      {benchmarkReport && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Batch Benchmark Execution Summary</span>
            <div className="flex flex-wrap gap-4 text-xs mt-1 text-slate-700 font-mono">
              <span>Batch Size: <strong className="text-slate-900">{benchmarkReport.batchSize} txns</strong></span>
              <span>• Escalated to Links: <strong className="text-emerald-700 font-bold">{benchmarkReport.hardFailuresEscalated}</strong></span>
              <span>• Backoff Queued: <strong className="text-amber-700 font-bold">{benchmarkReport.softFailuresQueued}</strong></span>
              <span>• Total Volume: <strong className="text-slate-900 font-bold">₹{benchmarkReport.totalValueProcessed.toLocaleString()}</strong></span>
              <span>• Latency: <strong className="text-blue-700">{benchmarkReport.processingDurationMs}ms</strong></span>
            </div>
          </div>
          <button 
            onClick={() => setBenchmarkReport(null)}
            className="text-slate-500 hover:text-slate-900 text-xs px-2.5 py-1 bg-white rounded border border-slate-200 shadow-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-bold">Failed Payments Intercepted</span>
            <ShieldAlert size={18} className="text-rose-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">{totalFailed}</h2>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-bold">Autonomous Interventions</span>
            <RefreshCw size={18} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-emerald-600">{totalRecoveredCount}</h2>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-bold">Salvaged Revenue Pool</span>
            <DollarSign size={18} className="text-blue-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-blue-600">₹{totalRevenueSalvaged.toLocaleString()}</h2>
        </div>
      </div>

      {/* Real-time Agent Event Feed */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Live Agent Decision Stream</h2>
            <p className="text-xs text-slate-500">Deterministic classifications & autonomous recovery traces</p>
          </div>
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200">
            SSE: /api/v1/stream/events
          </span>
        </div>

        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
          {events.length === 0 ? (
            <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-lg">
              <p className="font-medium text-slate-600">No webhook failure events detected yet.</p>
              <p className="text-xs mt-1 text-slate-400">Click the simulation buttons above or trigger a Razorpay webhook.</p>
            </div>
          ) : (
            events.map((ev, index) => (
              <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2.5 transition hover:border-slate-300">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-700 font-bold">{ev.paymentId}</span>
                    <span className="text-slate-500 text-[11px] font-mono">({ev.customerEmail})</span>
                  </div>
                  <span className="text-slate-400">{new Date(ev.createdAt || Date.now()).toLocaleTimeString()}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    ev.category === 'TRANSIENT_SOFT_FAIL'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {ev.errorCode}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">₹{ev.amount}</span>
                  <span className="text-xs text-slate-600 ml-auto font-mono bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                    {ev.strategyApplied}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded font-mono text-xs text-slate-700 shadow-sm">
                  <span className="text-blue-700 font-bold">⚡ Agent Trace: </span>
                  {ev.reasoningTrace}
                </div>

                {ev.recoveryUrl && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-900 gap-2">
                    <div className="flex items-center gap-2 font-mono truncate">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold">Razorpay Link:</span>
                      <a href={ev.recoveryUrl} target="_blank" rel="noreferrer" className="underline text-emerald-700 hover:text-emerald-800 font-semibold truncate max-w-xs">
                        {ev.recoveryUrl}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-300">
                        <Mail size={10} /> Email Sent
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-300">
                        <MessageSquare size={10} /> WA Dispatched
                      </span>
                      <button
                        onClick={() => {
                          setActiveModalEvent(ev);
                          setPreviewTab('whatsapp');
                        }}
                        className="text-[10px] uppercase font-bold tracking-wider bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded text-white flex items-center gap-1 transition shadow-sm ml-1">
                        Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Multi-Channel Preview Modal */}
      {activeModalEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTab('whatsapp')}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg transition ${
                    previewTab === 'whatsapp' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  <Smartphone size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => setPreviewTab('email')}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg transition ${
                    previewTab === 'email' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  <Mail size={14} /> Email Card
                </button>
              </div>
              <button 
                onClick={() => setActiveModalEvent(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
                <X size={18} />
              </button>
            </div>

            {previewTab === 'whatsapp' ? (
              <div className="bg-[#efeae2] p-4 rounded-xl border border-slate-200 font-sans space-y-2.5 text-xs text-slate-800">
                <div className="bg-[#d9fdd3] p-3.5 rounded-lg rounded-tl-none shadow-sm text-slate-900 space-y-2 border border-[#c3f4bb]">
                  <p className="font-bold text-[#008069]">Payment Reminder • Razorpay</p>
                  <p>
                    Hi there, your payment of <strong className="text-slate-950">₹{activeModalEvent.amount}</strong> for Invoice <span className="font-mono">#{activeModalEvent.paymentId.substring(4, 10)}</span> could not be processed automatically.
                  </p>
                  <p className="text-slate-700">
                    Tap below to complete your payment with UPI, Card, or Netbanking in 1 click:
                  </p>
                  <a
                    href={activeModalEvent.recoveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-[#008069] text-white font-bold text-center py-2 rounded-md hover:bg-[#00705c] transition mt-2 shadow-sm">
                    Complete Payment Now →
                  </a>
                </div>
                <span className="text-[10px] text-slate-500 block text-right">
                  {new Date(activeModalEvent.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Delivered
                </span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 text-xs">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-slate-400">To: </span>
                  <span className="font-semibold text-slate-800">{activeModalEvent.customerEmail}</span>
                  <br />
                  <span className="text-slate-400">Subject: </span>
                  <span className="font-medium text-slate-900">Action Required: Complete your subscription renewal</span>
                </div>
                <div className="py-2 text-slate-700 space-y-2">
                  <p>Hi Valued Customer,</p>
                  <p>We were unable to process your scheduled subscription payment of <strong>₹{activeModalEvent.amount}</strong> due to: <span className="text-rose-600">{activeModalEvent.errorReason}</span>.</p>
                  <div className="py-2 text-center">
                    <a
                      href={activeModalEvent.recoveryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-blue-600 text-white font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition">
                      Complete Payment Securely
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}