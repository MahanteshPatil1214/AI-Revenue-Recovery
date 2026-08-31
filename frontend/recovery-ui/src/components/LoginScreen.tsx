import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { API_AUTH_URL, setAdminKey } from '../config/api';

interface LoginScreenProps {
  onAuthenticated: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError('Enter the operator access key to continue.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`${API_AUTH_URL}/check`, {
        headers: { 'X-Admin-Key': key.trim() },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated) {
        setAdminKey(key.trim());
        onAuthenticated();
      } else {
        setError('Invalid operator key. Please check and try again.');
      }
    } catch {
      setError('Unable to reach the backend. Is the server running on port 8080?');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-emerald-900/20 backdrop-blur overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Razorpay AI Revenue Recovery Engine
                </h1>
                <p className="text-xs text-slate-400">Operator authentication</p>
              </div>
            </div>
            <div className="mt-5 flex items-start gap-2 text-xs text-slate-400 bg-slate-800/60 rounded-lg px-3 py-2.5">
              <Lock size={13} className="mt-0.5 shrink-0 text-slate-500" />
              <span>
                Management endpoints (analytics, radar, simulate) are gated behind an
                operator key. Sign in to open the control room.
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Operator Access Key
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  autoComplete="off"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 disabled:opacity-60 text-sm font-semibold text-white rounded-lg shadow-lg shadow-emerald-900/30 transition"
            >
              <Sparkles size={16} />
              {checking ? 'Verifying…' : 'Enter Console'}
              {!checking && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="px-8 py-4 bg-slate-900 border-t border-slate-800">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Demo default key: <span className="font-mono text-emerald-400/80">dev_admin_key_2026</span>.
              Configure via <span className="font-mono">ADMIN_API_KEY</span> on the backend and
              <span className="font-mono"> VITE_ADMIN_API_KEY</span> on the frontend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
