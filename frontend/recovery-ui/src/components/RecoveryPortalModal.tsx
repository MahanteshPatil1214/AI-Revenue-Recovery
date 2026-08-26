import React, { useEffect, useState } from 'react';
import { X, Sparkles, ShieldAlert, ArrowRight, Percent, Calendar } from 'lucide-react';
import { API_CUSTOMER_URL } from '../config/api';

interface RecoveryOptions {
  paymentId: string;
  customerEmail: string;
  originalAmount: number;
  currency: string;
  failureReason: string;
  originalPaymentUrl?: string;
  discountedAmount: number;
  discountSavings: number;
  discountedPaymentUrl: string;
  eligibleForMonthlyDowngrade: boolean;
  monthlyAmount: number;
  monthlyPaymentUrl: string;
}

export interface RecoveryPortalModalProps {
  paymentId: string | null;
  onClose: () => void;
}

export const RecoveryPortalModal: React.FC<RecoveryPortalModalProps> = ({ paymentId, onClose }) => {
  const [data, setData] = useState<RecoveryOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!paymentId) return;
    const controller = new AbortController();
    setLoading(true);
    setHasError(false);

    fetch(`${API_CUSTOMER_URL}/options/${paymentId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch options');
        return res.json();
      })
      .then((resData: RecoveryOptions) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [paymentId]);

  if (!paymentId) return null;

  const originalAmt = data?.originalAmount ?? 0;
  const discountSavings = data?.discountSavings ?? 0;
  const discountedAmt = data?.discountedAmount ?? 0;
  const monthlyAmt = data?.monthlyAmount ?? 0;
  const originalUrl = data?.originalPaymentUrl || `http://localhost:5173/?payId=${paymentId}&amt=${originalAmt}`;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="portal-title">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-white animate-fade-in animate-zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/40 via-slate-800 to-indigo-900/40 p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 id="portal-title" className="text-base font-bold">1-Click Smart Retention & Recovery Portal</h3>
              <p className="text-xs text-slate-400">Dynamic offers to prevent churn and retain subscription</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white transition p-1">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            Calculating dynamic retention offers...
          </div>
        ) : hasError || !data ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-rose-400 text-sm font-semibold">Unable to load retention offers for this record.</p>
            <p className="text-xs text-slate-500">Ensure the payment ID exists in the database and the backend is running.</p>
            <button
              onClick={onClose}
              className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-300"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            
            {/* Context Alert */}
            <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3.5 flex items-start gap-3">
              <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <div className="text-xs">
                <p className="font-semibold text-rose-200">Subscription Renewal Declined</p>
                <p className="text-slate-400 mt-0.5">
                  Original Amount: <span className="text-white font-mono font-bold">₹{originalAmt.toFixed(2)}</span> ({data.failureReason})
                </p>
              </div>
            </div>

            {/* Option 1: Standard Renewal */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-slate-200">Standard Renewal (Original)</p>
                <p className="text-slate-400 text-[11px]">Pay standard full invoice value</p>
              </div>
              <a
                href={originalUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
              >
                Pay ₹{originalAmt.toFixed(2)} <ArrowRight size={12} />
              </a>
            </div>

            {/* Option 2: Instant 10% Grace Retention Discount */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/50 rounded-xl p-4 transition relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg tracking-wider uppercase flex items-center gap-1">
                <Percent size={10} /> 10% Grace Discount
              </div>
              <div className="flex justify-between items-center pr-16">
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">Renew with Instant Grace Discount</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Save ₹{discountSavings.toFixed(2)} immediately on this cycle</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 line-through">₹{originalAmt.toFixed(2)}</div>
                  <div className="text-base font-mono font-bold text-emerald-400">₹{discountedAmt.toFixed(2)}</div>
                </div>
              </div>
              <a
                href={data.discountedPaymentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3.5 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-900/30"
              >
                Accept Offer & Pay ₹{discountedAmt.toFixed(2)} <ArrowRight size={14} />
              </a>
            </div>

            {/* Option 3: Flexible Monthly Downgrade */}
            {data.eligibleForMonthlyDowngrade && (
              <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-indigo-500/30 rounded-xl p-4 transition">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                      <Calendar size={14} /> Switch to Flexible Monthly Billing
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">Lower immediate upfront cost to keep continuous service</p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-mono font-bold text-indigo-400">
                      ₹{monthlyAmt.toFixed(2)} <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                  </div>
                </div>
                <a
                  href={data.monthlyPaymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3.5 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  Switch to Monthly for ₹{monthlyAmt.toFixed(2)} <ArrowRight size={14} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecoveryPortalModal;