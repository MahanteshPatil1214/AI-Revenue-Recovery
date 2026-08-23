import React from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import type { DunningEvent } from '../types/recovery';

interface EventCardProps {
  event: DunningEvent;
  onPreview: (event: DunningEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPreview }) => {
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
          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
            event.category === 'TRANSIENT_SOFT_FAIL'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {event.errorCode}
        </span>
        <span className="text-sm font-semibold text-slate-800">₹{event.amount}</span>
        <span className="text-xs text-slate-600 ml-auto font-mono bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
          {event.strategyApplied}
        </span>
      </div>

      <div className="p-3 bg-white border border-slate-200 rounded font-mono text-xs text-slate-700 shadow-sm">
        <span className="text-blue-700 font-bold">⚡ Agent Trace: </span>
        {event.reasoningTrace}
      </div>

      {event.recoveryUrl && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs text-emerald-900 gap-2">
          <div className="flex items-center gap-2 font-mono truncate">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">Razorpay Link:</span>
            <a
              href={event.recoveryUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-emerald-700 hover:text-emerald-800 font-semibold truncate max-w-xs"
            >
              {event.recoveryUrl}
            </a>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-300">
              <Mail size={10} /> Email Dispatched
            </span>
            <button
              onClick={() => onPreview(event)}
              className="text-[10px] uppercase font-bold tracking-wider bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded text-white flex items-center gap-1 transition shadow-sm ml-1"
            >
              <Mail size={11} /> Email Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};