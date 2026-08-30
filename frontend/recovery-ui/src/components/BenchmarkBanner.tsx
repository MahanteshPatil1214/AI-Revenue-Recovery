import React from 'react';
import type { BenchmarkReport } from '../types/recovery';
import { InfoTip } from './InfoTip';

interface BenchmarkBannerProps {
  report: BenchmarkReport | null;
  onDismiss: () => void;
}

export const BenchmarkBanner: React.FC<BenchmarkBannerProps> = ({ report, onDismiss }) => {
  if (!report) return null;

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-300">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
          Batch Benchmark Execution Summary
        </span>
        <div className="flex flex-wrap gap-4 text-xs mt-1 text-slate-700 font-mono">
          <span>
            Batch Size: <strong className="text-slate-900">{report.batchSize} txns</strong>
          </span>
          <span>
            • Escalated to Links: <strong className="text-emerald-700 font-bold">{report.hardFailuresEscalated}</strong>
            <InfoTip position="top" text="Hard (permanent) failures that got an immediate Razorpay payment link. These typically convert fastest because the link removes all friction." />
          </span>
          <span>
            • Backoff Queued: <strong className="text-amber-700 font-bold">{report.softFailuresQueued}</strong>
            <InfoTip position="top" text="Soft (transient) failures parked in a smart retry queue with backoff, instead of being retried immediately against a failing gateway." />
          </span>
          <span>
            • Total Volume: <strong className="text-slate-900 font-bold">₹{report.totalValueProcessed.toLocaleString()}</strong>
          </span>
          <span>
            • Latency: <strong className="text-blue-700">{report.processingDurationMs}ms</strong>
            <InfoTip position="top" text="Wall-clock time the engine took to classify and route the entire batch — a rough throughput indicator." />
          </span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-500 hover:text-slate-900 text-xs px-2.5 py-1 bg-white rounded border border-slate-200 shadow-sm"
      >
        Dismiss
      </button>
    </div>
  );
};