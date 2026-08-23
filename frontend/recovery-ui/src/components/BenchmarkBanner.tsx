import React from 'react';
import type { BenchmarkReport } from '../types/recovery';

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
          </span>
          <span>
            • Backoff Queued: <strong className="text-amber-700 font-bold">{report.softFailuresQueued}</strong>
          </span>
          <span>
            • Total Volume: <strong className="text-slate-900 font-bold">₹{report.totalValueProcessed.toLocaleString()}</strong>
          </span>
          <span>
            • Latency: <strong className="text-blue-700">{report.processingDurationMs}ms</strong>
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