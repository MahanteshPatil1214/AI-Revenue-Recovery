import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, BadgeIndianRupee, TrendingUp, Users } from 'lucide-react';
import { API_ANALYTICS_URL } from '../config/api';
import type { ServerAnalytics } from '../types/recovery';

const STRATEGY_LABELS: Record<string, string> = {
  SMART_RETRY_AUTO_RECOVERED: 'Smart Retry (Autonomous)',
  CUSTOMER_1CLICK_CHECKOUT_SUCCESS: 'Customer Discount / 1-Click Checkout',
  WEBHOOK_PAYMENT_CAPTURED_SETTLED: 'Settlement Webhook Sync',
  AUTONOMOUS_PAYMENT_LINK_ESCALATION: 'Payment Link Escalation',
};

const STRATEGY_COLORS: Record<string, string> = {
  SMART_RETRY_AUTO_RECOVERED: 'bg-emerald-500',
  CUSTOMER_1CLICK_CHECKOUT_SUCCESS: 'bg-blue-500',
  WEBHOOK_PAYMENT_CAPTURED_SETTLED: 'bg-violet-500',
  AUTONOMOUS_PAYMENT_LINK_ESCALATION: 'bg-amber-500',
};

const FALLBACK_COLOR = 'bg-slate-400';

export const ServerAnalyticsPanel: React.FC = () => {
  const [analytics, setAnalytics] = useState<ServerAnalytics | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_ANALYTICS_URL}`);
      if (!res.ok) throw new Error('Analytics unavailable');
      const data: ServerAnalytics = await res.json();
      setAnalytics(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  if (error && !analytics) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8 text-sm text-slate-500">
        Server analytics unavailable — start the backend to see authoritative recovery MRR.
      </div>
    );
  }
  if (!analytics) {
    return null;
  }

  const totalStrategyValue = analytics.strategyBreakdown.reduce(
    (acc, s) => acc + s.recoveredValue,
    0
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
      <div className="flex items-center gap-2 pb-5 border-b border-slate-100 mb-5">
        <BarChart3 size={20} className="text-indigo-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recovered MRR & Churn Cohorts</h2>
          <p className="text-xs text-slate-500">
            Authoritative, server-computed from the full persisted registry — not just the live socket window
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <BadgeIndianRupee size={14} className="text-blue-600" /> Total Recovered Value
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{analytics.totalRecoveredValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            of ₹
            {(analytics.strategyBreakdown.reduce((a, s) => a + s.recoveredValue, 0) +
              analytics.totalValueAtRisk).toLocaleString()}{' '}
            at risk
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <TrendingUp size={14} className="text-emerald-600" /> Recovery Rate
          </div>
          <div className="text-2xl font-black text-emerald-600">{analytics.recoveryRatePercent}%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {analytics.totalRecovered} / {analytics.totalEvents} events
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <BadgeIndianRupee size={14} className="text-indigo-600" /> Value Recovery
          </div>
          <div className="text-2xl font-black text-indigo-600">{analytics.valueRecoveryRatePercent}%</div>
          <div className="text-[11px] text-slate-500 mt-1">of gross recurring value</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
            <Users size={14} className="text-amber-600" /> Still At Risk
          </div>
          <div className="text-2xl font-black text-amber-600">
            ₹{analytics.totalValueAtRisk.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">active churn exposure</div>
        </div>
      </div>

      {analytics.strategyBreakdown.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Monetary Split by Recovery Channel
          </div>
          <div className="space-y-3">
            {analytics.strategyBreakdown.map((s) => {
              const pct = totalStrategyValue > 0 ? (s.recoveredValue / totalStrategyValue) * 100 : 0;
              const color = STRATEGY_COLORS[s.strategy] ?? FALLBACK_COLOR;
              return (
                <div key={s.strategy}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">
                      {STRATEGY_LABELS[s.strategy] ?? s.strategy}
                    </span>
                    <span className="font-mono text-slate-900">
                      ₹{s.recoveredValue.toLocaleString()} · {analytics.totalEvents ? s.count : 0} sale
                      {s.count === 1 ? '' : 's'} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analytics.churnCohorts.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Churn Cohort Funnel (by day)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-semibold">Cohort Day</th>
                  <th className="py-2 font-semibold">At Risk</th>
                  <th className="py-2 font-semibold">Recovered</th>
                  <th className="py-2 font-semibold">Recovery %</th>
                </tr>
              </thead>
              <tbody>
                {analytics.churnCohorts.map((c) => {
                  const pct = c.total > 0 ? (c.recovered / c.total) * 100 : 0;
                  return (
                    <tr key={c.cohortDay} className="border-b border-slate-100">
                      <td className="py-2 font-mono text-slate-700">{c.cohortDay}</td>
                      <td className="py-2 text-slate-700">
                        {c.total} · ₹{c.totalValue.toLocaleString()}
                      </td>
                      <td className="py-2 text-emerald-700">
                        {c.recovered} · ₹{c.recoveredValue.toLocaleString()}
                      </td>
                      <td className="py-2 font-bold text-slate-900">{pct.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
