import React from 'react';
import { ShieldAlert, RefreshCw, DollarSign } from 'lucide-react';
import { InfoTip } from './InfoTip';

interface KpiGridProps {
  totalFailed: number;
  totalRecoveredCount: number;
  totalRevenueSalvaged: number;
}

export const KpiGrid: React.FC<KpiGridProps> = ({
  totalFailed,
  totalRecoveredCount,
  totalRevenueSalvaged,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
            Failed Payments Intercepted
            <InfoTip
              position="top"
              title="Failed Payments Intercepted"
              text="Every declined or failed transaction Razorpay delivers to this engine via webhook. This is the inflow the recovery pipeline acts on."
            />
          </span>
          <ShieldAlert size={18} className="text-rose-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900">{totalFailed}</h2>
      </div>

      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
            Autonomous Interventions
            <InfoTip
              position="top"
              title="Autonomous Interventions"
              text="Payments the engine recovered without a human: automatic smart retries on soft (transient) failures, plus payment links sent directly to hard failures. No support ticket required."
            />
          </span>
          <RefreshCw size={18} className="text-emerald-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-emerald-600">{totalRecoveredCount}</h2>
      </div>

      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex justify-between items-center text-slate-500 mb-2">
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
            Salvaged Revenue Pool
            <InfoTip
              position="top"
              title="Salvaged Revenue Pool"
              text="Total invoice value of the refunded/declined charges that were re-collected through recovery. This is the direct revenue the engine salvaged."
            />
          </span>
          <DollarSign size={18} className="text-blue-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-blue-600">₹{totalRevenueSalvaged.toLocaleString()}</h2>
      </div>
    </div>
  );
};