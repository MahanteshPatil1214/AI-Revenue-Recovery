import React, { useEffect, useState } from 'react';
import { Radio, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BankHealth {
  bankCode: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  failureRatePercent: number;
  sampleCount: number;
}

export const BankRadarBanner: React.FC = () => {
  const [radarData, setRadarData] = useState<Record<string, BankHealth>>({});
  const [selectedBank, setSelectedBank] = useState<string>('HDFC');
  const [failureRate, setFailureRate] = useState<number>(75);
  const [loading, setLoading] = useState(false);

  const fetchRadar = () => {
    fetch('http://localhost:8080/api/v1/radar/status')
      .then((r) => r.json())
      .then((data: Record<string, BankHealth>) => {
        setRadarData(data);
        if (Object.keys(data).length > 0 && !data[selectedBank]) {
          setSelectedBank(Object.keys(data)[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchRadar();
    const timer = setInterval(fetchRadar, 8000);
    return () => clearInterval(timer);
  }, []);

  const triggerOutage = async () => {
    setLoading(true);
    await fetch(
      `http://localhost:8080/api/v1/radar/simulate-outage?bank=${selectedBank}&rate=${failureRate}`,
      { method: 'POST' }
    );
    fetchRadar();
    setLoading(false);
  };

  const restoreBank = async () => {
    setLoading(true);
    await fetch(`http://localhost:8080/api/v1/radar/restore?bank=${selectedBank}`, { method: 'POST' });
    fetchRadar();
    setLoading(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-lg mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
              <Radio size={16} className="text-emerald-400" />
              Real-Time Banking Rails Downtime Radar
            </h3>
            <p className="text-[11px] text-slate-400">
              AI predictive circuit breaker adjusts dunning windows dynamically
            </p>
          </div>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Bank Dropdown */}
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            disabled={loading}
            className="bg-slate-800 text-xs text-white border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none"
          >
            {Object.keys(radarData).length > 0 ? (
              Object.keys(radarData).map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))
            ) : (
              <option value="HDFC">HDFC</option>
            )}
          </select>

          {/* Dynamic Rate Slider */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
            <span className="text-[11px] text-slate-300 font-mono font-bold w-9">{failureRate}%</span>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={failureRate}
              onChange={(e) => setFailureRate(Number(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer"
            />
          </div>

          <button
            onClick={triggerOutage}
            disabled={loading}
            className="text-[11px] font-semibold bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 px-3 py-1.5 rounded transition flex items-center gap-1 disabled:opacity-50"
          >
            <AlertTriangle size={12} /> Apply Anomaly
          </button>

          <button
            onClick={restoreBank}
            disabled={loading}
            className="text-[11px] font-semibold bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-3 py-1.5 rounded transition flex items-center gap-1 disabled:opacity-50"
          >
            <ShieldCheck size={12} /> Restore Rail
          </button>
        </div>
      </div>

      {/* Grid of Bank Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
        {Object.values(radarData).map((bank) => {
          const isOutage = bank.status === 'OUTAGE' || bank.failureRatePercent >= 50.0;
          const isDegraded = !isOutage && (bank.status === 'DEGRADED' || bank.failureRatePercent >= 20.0);
          const statusLabel = isOutage ? 'OUTAGE' : isDegraded ? 'DEGRADED' : 'OPERATIONAL';

          return (
            <div
              key={bank.bankCode}
              className={`p-3 rounded-lg border flex flex-col justify-between transition ${
                isOutage
                  ? 'bg-rose-950/40 border-rose-700 text-rose-200'
                  : isDegraded
                  ? 'bg-amber-950/40 border-amber-700 text-amber-200'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center text-xs font-mono font-bold">
                <span>{bank.bankCode}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    isOutage
                      ? 'bg-rose-600 text-white'
                      : isDegraded
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                Fail rate: <span className="font-bold text-white">{bank.failureRatePercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};