import React from 'react';
import { CheckCircle2, Mail, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import type { DunningEvent } from '../types/recovery';
import { InfoTip } from './InfoTip';

interface EventCardProps {
  event: DunningEvent;
  onPreview: (event: DunningEvent) => void;
  onOpenPortal: (paymentId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onPreview, onOpenPortal }) => {
  const isSoftScheduled = event.status === 'SCHEDULED' && event.category === 'TRANSIENT_SOFT_FAIL';
  const isRetryRecovered = event.status === 'RECOVERED_RETRY_SUCCESS';
  const linkUrl = event.recoveryUrl || `http://localhost:5173/?payId=${event.paymentId}&amt=${event.amount}`;

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2.5 transition hover:border-slate-300">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-blue-700 font-bold">{event.paymentId}</span>
          <span className="text-slate-500 text-[11px] font-mono">({event.customerEmail})</span>
        </div>
        <span className="text-slate-400">
          {new Date(event.createdAt || Date.now()).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 ${
            event.category === 'TRANSIENT_SOFT_FAIL'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {event.errorCode}
          <InfoTip
            position="bottom"
            text="Razorpay error code that caused the payment to fail. Amber = transient/soft (retryable); red = hard decline (send a payment link)."
          />
        </span>
        <span className="text-sm font-semibold text-slate-800">₹{event.amount}</span>

        {/* Retry Badge Indicator */}
        {(event.retryCount ?? 0) > 0 && (
          <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
            <RefreshCw size={11} className={isSoftScheduled ? 'animate-spin' : ''} />
            Attempt {event.retryCount}/{event.maxRetries || 3}
            <InfoTip
              position="bottom"
              text="This soft failure has been automatically retried by the smart retry scheduler, with exponential backoff tuned to the failure reason. Success is marked as recovered."
            />
          </span>
        )}

        <span className="text-xs text-slate-600 ml-auto font-mono bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
          {event.strategyApplied}
        </span>
      </div>

      <div className="p-3 bg-white border border-slate-200 rounded font-mono text-xs text-slate-700 shadow-sm">
        <span className="text-blue-700 font-bold">⚡ Agent Trace: </span>
        {event.reasoningTrace}
      </div>

      {/* Auto Recovered Success Box */}
      {isRetryRecovered && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-900">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="font-semibold">Successfully Recovered via Smart Retry Pipeline</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-900 gap-2">
        <div className="flex items-center gap-2 font-mono truncate">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">Razorpay Link:</span>
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-emerald-700 hover:text-emerald-800 font-semibold truncate max-w-xs"
          >
            {event.recoveryUrl || 'Open Payment'}
          </a>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-300">
            <Mail size={10} /> Email Dispatched
            <InfoTip position="bottom" text="Automated dunning email sent with the secure payment link. Delivered via the SMTP integration on the backend." />
          </span>
          <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-300">
            <MessageCircle size={10} /> WhatsApp Dispatched
            <InfoTip position="bottom" text="Branded WhatsApp notice delivered through the Evolution API gateway — the higher-open-rate channel for dunning." />
          </span>
          <button
            type="button"
            onClick={() => onPreview(event)}
            className="text-[10px] uppercase font-bold tracking-wider bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded text-white flex items-center gap-1 transition shadow-sm cursor-pointer"
          >
            <Mail size={11} /> Preview
          </button>
          <button
            type="button"
            onClick={() => onOpenPortal(event.paymentId)}
            className="text-[10px] uppercase font-bold tracking-wider bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded text-white flex items-center gap-1 transition shadow-sm cursor-pointer"
          >
            <Sparkles size={11} /> Retention Portal
          </button>
        </div>
      </div>
    </div>
  );
});