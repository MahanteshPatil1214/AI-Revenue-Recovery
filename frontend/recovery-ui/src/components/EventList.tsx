import React from 'react';
import { EventCard } from './EventCard';
import type { DunningEvent } from '../types/recovery';

interface EventListProps {
  events: DunningEvent[];
  onPreview: (event: DunningEvent) => void;
}

export const EventList: React.FC<EventListProps> = ({ events, onPreview }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Live Agent Decision Stream</h2>
          <p className="text-xs text-slate-500">Deterministic classifications & autonomous recovery traces</p>
        </div>
        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200">
          SSE: /api/v1/stream/events
        </span>
      </div>

      <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
        {events.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-lg">
            <p className="font-medium text-slate-600">No webhook failure events detected yet.</p>
            <p className="text-xs mt-1 text-slate-400">Click the simulation buttons above or trigger a Razorpay webhook.</p>
          </div>
        ) : (
          events.map((ev, index) => (
            <EventCard key={ev.id || index} event={ev} onPreview={onPreview} />
          ))
        )}
      </div>
    </div>
  );
};