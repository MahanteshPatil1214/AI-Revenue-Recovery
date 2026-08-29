import React from 'react';
import { Clock, Zap, Play, Home } from 'lucide-react';

interface HeaderProps {
  targetEmail: string;
  setTargetEmail: (email: string) => void;
  loadingSim: boolean;
  onSimulate: (type: 'SOFT' | 'HARD') => void;
  onBenchmark: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  targetEmail,
  setTargetEmail,
  loadingSim,
  onSimulate,
  onBenchmark,
  onGoHome,
}) => {
  return (
    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-6 border-b border-slate-200 gap-4">
      <div className="flex items-center gap-3">
        {onGoHome && (
          <button
            onClick={onGoHome}
            title="Back to Overview"
            className="h-9 w-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-700 flex items-center justify-center shadow-sm transition"
          >
            <Home size={16} />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Razorpay AI Revenue Recovery Engine
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous Failure Classifier, Smart-Dunning & Email Escalation
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="email"
          placeholder="Target Test Email"
          value={targetEmail}
          onChange={(e) => setTargetEmail(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 font-mono"
        />
        <button
          onClick={() => onSimulate('SOFT')}
          disabled={loadingSim}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          <Clock size={14} /> Soft Fail
        </button>
        <button
          onClick={() => onSimulate('HARD')}
          disabled={loadingSim}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          <Zap size={14} /> Hard Fail
        </button>
        <button
          onClick={onBenchmark}
          disabled={loadingSim}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-lg shadow-md shadow-blue-500/20 transition disabled:opacity-50"
        >
          <Play size={14} /> Run 50-Event Batch
        </button>
      </div>
    </header>
  );
};