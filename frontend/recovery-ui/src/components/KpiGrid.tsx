import React from 'react';
import { ShieldAlert, RefreshCw, DollarSign } from 'lucide-react';

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
  );
};