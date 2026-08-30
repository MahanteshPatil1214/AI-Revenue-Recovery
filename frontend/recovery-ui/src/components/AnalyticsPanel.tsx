import React, { useMemo } from 'react';
import { Download, PieChart, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import type { DunningEvent } from '../types/recovery';
import { InfoTip } from './InfoTip';

interface AnalyticsPanelProps {
  events: DunningEvent[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ events }) => {
  const stats = useMemo(() => {
    const total = events.length;
    if (total === 0) {
      return {
        total: 0,
        softCount: 0,
        hardCount: 0,
        recoveredSoft: 0,
        escalatedHard: 0,
        recoveryRate: 0,
        totalAmount: 0,
        recoveredAmount: 0,
        errorCodeMap: {} as Record<string, number>,
      };
    }

    let soft = 0;
    let hard = 0;
    let recoveredSoft = 0;
    let escalatedHard = 0;
    let totalAmt = 0;
    let recoveredAmt = 0;
    const errorCodeMap: Record<string, number> = {};

    events.forEach((e) => {
      totalAmt += e.amount || 0;
      const code = e.errorCode || 'UNKNOWN';
      errorCodeMap[code] = (errorCodeMap[code] || 0) + 1;

      if (e.category === 'TRANSIENT_SOFT_FAIL') {
        soft++;
        if (e.status === 'RECOVERED_RETRY_SUCCESS') {
          recoveredSoft++;
          recoveredAmt += e.amount || 0;
        }
      } else {
        hard++;
        if (e.status === 'RECOVERED_ACTION_TAKEN') {
          escalatedHard++;
          recoveredAmt += e.amount || 0;
        }
      }
    });

    const totalRecovered = recoveredSoft + escalatedHard;
    const recoveryRate = total > 0 ? Math.round((totalRecovered / total) * 100) : 0;

    return {
      total,
      softCount: soft,
      hardCount: hard,
      recoveredSoft,
      escalatedHard,
      recoveryRate,
      totalAmount: totalAmt,
      recoveredAmount: recoveredAmt,
      errorCodeMap,
    };
  }, [events]);

  const exportCsv = () => {
    if (events.length === 0) return;

    const headers = [
      'ID',
      'Payment ID',
      'Customer Email',
      'Customer Contact',
      'Amount (INR)',
      'Error Code',
      'Error Reason',
      'Category',
      'Strategy Applied',
      'Status',
      'Retry Count',
      'Recovery URL',
      'Timestamp',
    ];

    const rows = events.map((e) => [
      e.id ?? '',
      `"${e.paymentId}"`,
      `"${e.customerEmail}"`,
      `"${e.customerContact}"`,
      e.amount,
      `"${e.errorCode}"`,
      `"${(e.errorReason || '').replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.strategyApplied}"`,
      `"${e.status}"`,
      e.retryCount ?? 0,
      `"${e.recoveryUrl || ''}"`,
      `"${e.createdAt}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dunning_recovery_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const softPercent = stats.total > 0 ? Math.round((stats.softCount / stats.total) * 100) : 0;
  const hardPercent = stats.total > 0 ? 100 - softPercent : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PieChart size={20} className="text-blue-600" />
            Live Recovery Analytics & Cohort Distribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time breakdown of churn prevention and recovery yield</p>
        </div>

        <button
          onClick={exportCsv}
          disabled={events.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-40"
        >
          <Download size={14} />
          Export Financial Audit CSV
          <InfoTip
            position="bottom"
            text="Downloads a complete CSV of every intercepted payment, its failure reason, the strategy applied, and the final status — for a financial audit or reconciliation with your ledger."
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        {/* Metric 1: Recovery Success Rate */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              Overall Recovery Efficiency
              <InfoTip
                title="Overall Recovery Efficiency"
                text="Share of intercepted failed payments that were eventually collected. Computed as Recovered / Total failed. The headline measure of how much revenue the engine wins back."
              />
            </span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-950">{stats.recoveryRate}%</div>
            <div className="text-xs text-slate-500 mt-1">
              ₹{stats.recoveredAmount.toLocaleString()} saved out of ₹{stats.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.recoveryRate}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Failure Category Distribution */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              Failure Pipeline Ratio
              <InfoTip
                position="bottom"
                title="Failure Pipeline Ratio"
                text="Split of the two recovery tracks. Soft = transient failures (gateway/bank timeouts) worth a smart timed retry. Hard = permanent declines that get an immediate direct payment link."
              />
            </span>
            <AlertCircle size={16} className="text-amber-600" />
          </div>
          <div className="my-3 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-amber-800 font-semibold">Soft Retries ({softPercent}%)</span>
              <span className="text-rose-800 font-semibold">Hard Escalations ({hardPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 flex overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${softPercent}%` }}
              ></div>
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${hardPercent}%` }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>{stats.softCount} Queued Backoffs</span>
            <span>{stats.hardCount} Direct Links</span>
          </div>
        </div>

        {/* Metric 3: Top Error Causes Breakdown */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              Top Failure Triggers
              <InfoTip
                position="bottom"
                text="Most frequent Razorpay error codes across intercepted failures. Grouping by error_code reveals which causes drive most churn and where smart retry is most effective."
              />
            </span>
            <CheckCircle size={16} className="text-blue-600" />
          </div>
          <div className="my-2 space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {Object.keys(stats.errorCodeMap).length === 0 ? (
              <span className="text-xs text-slate-400 italic">No events recorded</span>
            ) : (
              Object.entries(stats.errorCodeMap).map(([code, count]) => (
                <div key={code} className="flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-700 truncate max-w-[170px] text-[11px]">{code}</span>
                  <span className="font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
          <span className="text-[10px] text-slate-400 text-right">Aggregated by error_code</span>
        </div>
      </div>
    </div>
  );
};