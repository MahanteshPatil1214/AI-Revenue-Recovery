import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, CreditCard, Lock, ArrowLeft, Percent, Calendar } from 'lucide-react';
import { API_CUSTOMER_URL } from '../config/api';
import type { DunningEvent } from '../types/recovery';

interface CustomerPaymentPortalProps {
  paymentId: string;
  onBackToDashboard: () => void;
}

const VALID_PLAN_TYPES = new Set(['DISCOUNTED_10PCT', 'MONTHLY_DOWNGRADE']);

export const CustomerPaymentPortal: React.FC<CustomerPaymentPortalProps> = ({
  paymentId,
  onBackToDashboard,
}) => {
  const [event, setEvent] = useState<DunningEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');

  const params = new URLSearchParams(window.location.search);
  const rawAmt = params.get('amt');
  const overrideAmount = rawAmt && !isNaN(Number(rawAmt)) && Number(rawAmt) > 0 ? Number(rawAmt) : null;
  const rawPlan = params.get('plan');
  const planType = rawPlan && VALID_PLAN_TYPES.has(rawPlan) ? rawPlan as 'DISCOUNTED_10PCT' | 'MONTHLY_DOWNGRADE' : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_CUSTOMER_URL}/invoice/${paymentId}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setEvent(data);
        if (data && (data.status === 'RECOVERED_CUSTOMER_PAID' || data.status === 'RECOVERED_RETRY_SUCCESS')) {
          setPaymentSuccess(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoading(false);
      });
    return () => controller.abort();
  }, [paymentId]);

  const displayAmount = overrideAmount ?? event?.amount ?? 0;
  const originalAmount = event?.amount ?? 0;
  const isDiscounted = planType === 'DISCOUNTED_10PCT' && overrideAmount !== null;
  const isMonthly = planType === 'MONTHLY_DOWNGRADE' && overrideAmount !== null;

  const handleCompletePayment = async () => {
    setPaying(true);
    try {
      const res = await fetch(`${API_CUSTOMER_URL}/resolve/${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: isDiscounted ? '10% Grace Discount' : isMonthly ? 'Monthly Downgrade' : selectedMethod }),
      });
      if (res.ok) {
        setPaymentSuccess(true);
      } else {
        console.error('Payment resolution failed:', res.status);
      }
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full text-center shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">
            The recovery invoice for identifier <code className="font-mono text-xs">{paymentId}</code> could not be located.
          </p>
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <span className="font-bold tracking-tight text-base">Razorpay Secure Checkout</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Autonomous Subscription Recovery Portal</p>
          </div>
          <button
            onClick={onBackToDashboard}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <ArrowLeft size={12} /> Dashboard
          </button>
        </div>

        {paymentSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 animate-zoom-in">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Payment Completed Successfully!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your scheduled renewal of <strong>₹{displayAmount.toFixed(2)}</strong> has been authorized. Your subscription is active with zero interruption.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 text-left space-y-1">
              <div>Ref ID: <span className="font-semibold text-slate-900">{event.paymentId}</span></div>
              <div>Account: <span className="font-semibold text-slate-900">{event.customerEmail}</span></div>
              <div>Status: <span className="text-emerald-600 font-bold">SETTLED (LIVE BROADCASTED)</span></div>
            </div>
            <button
              onClick={onBackToDashboard}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
            >
              Return to Monitoring Console
            </button>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6">
            {/* Plan Badge */}
            {isDiscounted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-800">
                <Percent size={16} className="text-emerald-600 shrink-0" />
                <span className="font-bold">10% Instant Grace Discount Applied</span>
                <span className="ml-auto font-mono text-emerald-600">Save ₹{(originalAmount - displayAmount).toFixed(2)}</span>
              </div>
            )}
            {isMonthly && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-indigo-800">
                <Calendar size={16} className="text-indigo-600 shrink-0" />
                <span className="font-bold">Flexible Monthly Billing Plan</span>
                <span className="ml-auto font-mono text-indigo-600">was ₹{originalAmount.toFixed(2)}/yr</span>
              </div>
            )}

            {/* Invoice Summary */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-mono">Invoice #{event.paymentId.substring(4)}</span>
                <h3 className="text-lg font-bold text-slate-900">
                  {isMonthly ? 'Monthly Subscription Renewal' : 'Subscription Renewal'}
                </h3>
                <p className="text-xs text-slate-500">{event.customerEmail}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Due</span>
                {isDiscounted && (
                  <div className="text-sm text-slate-400 line-through font-mono">₹{originalAmount.toFixed(2)}</div>
                )}
                <div className="text-2xl font-black text-slate-950">₹{displayAmount.toFixed(2)}</div>
                {isMonthly && <div className="text-xs text-slate-400">/month</div>}
              </div>
            </div>

            {/* Failure Reason Callout */}
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
              <Lock size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Previous Attempt Declined: </span>
                <span>{event.errorReason || 'Bank authorization timeout'}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Select Resolution Method
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['UPI', 'CARD', 'NETBANKING'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMethod(m)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      selectedMethod === m
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard size={16} />
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handleCompletePayment}
              disabled={paying}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {paying ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Lock size={15} />
                  Authorize & Pay ₹{displayAmount.toFixed(2)} Securely
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck size={13} className="text-emerald-500" />
              256-Bit SSL Encrypted • Powered by Razorpay
            </p>
          </div>
        )}
      </div>
    </div>
  );
};