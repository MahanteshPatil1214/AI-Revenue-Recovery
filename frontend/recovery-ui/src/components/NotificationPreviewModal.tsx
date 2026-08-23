import React from 'react';
import { Mail, X } from 'lucide-react';
import type { DunningEvent } from '../types/recovery';

interface NotificationPreviewModalProps {
  event: DunningEvent | null;
  onClose: () => void;
}

export const NotificationPreviewModal: React.FC<NotificationPreviewModalProps> = ({
  event,
  onClose,
}) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
            <Mail size={16} />
            <span>Customer Email Notification</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 text-xs">
          <div className="border-b border-slate-200 pb-2">
            <div>
              <span className="text-slate-400">To: </span>
              <span className="font-semibold text-slate-800">{event.customerEmail}</span>
            </div>
            <div>
              <span className="text-slate-400">Subject: </span>
              <span className="font-medium text-slate-900">
                Action Required: Complete your subscription renewal
              </span>
            </div>
          </div>
          <div className="py-2 text-slate-700 space-y-2.5 bg-white p-3.5 rounded-lg border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">Payment Unsuccessful</h4>
            <p>Hi Valued Customer,</p>
            <p>
              We were unable to process your scheduled subscription payment of{' '}
              <strong>₹{event.amount}</strong> due to:{' '}
              <span className="text-rose-600 font-medium">{event.errorReason}</span>.
            </p>
            <div className="pt-2 text-center">
              <a
                href={event.recoveryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-blue-600 text-white font-bold px-4 py-2 rounded-md hover:bg-blue-700 transition shadow-sm"
              >
                Complete Payment Securely →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};