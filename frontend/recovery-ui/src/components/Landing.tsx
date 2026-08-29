import React from 'react';
import {
  TrendingUp,
  IndianRupee,
  Banknote,
  Activity,
  ShieldCheck,
  Gauge,
  Cpu,
  Webhook,
  Mail,
  MessageSquare,
  RefreshCw,
  CircuitBoard,
  Target,
  ArrowRight,
  Play,
  Unplug,
  Landmark,
  Sparkles,
  Check,
  X,
  Zap,
  Clock,
  Wallet,
} from 'lucide-react';

interface LandingProps {
  onEnter: () => void;
}

const FEATURES = [
  { icon: Webhook, title: 'Webhook Pipeline', desc: 'Razorpay payment.failed events ingested, validated, idempotency-guarded, and routed — with a durable dead-letter queue for retries.' },
  { icon: Cpu, title: 'Autonomous Classifier', desc: 'Every failed payment is classified as a transient soft-fail (retryable) or permanent hard-fail (escalate) using error-code intelligence.' },
  { icon: Gauge, title: 'Smart Timing Engine', desc: 'Gaussian non-colliding jitter computes the optimal retry window per bank rail, avoiding retry-storms and re-failing the same outcome.' },
  { icon: Landmark, title: 'Bank Downtime Radar', desc: 'A live banking-rails health monitor re-tunes dunning windows in real time when a rail is degraded or in outage.' },
  { icon: Banknote, title: 'Real Razorpay Links', desc: 'Dynamic payment links (original, 10% grace discount, or monthly downgrade) generated on demand so customers can pay instantly.' },
  { icon: MessageSquare, title: 'Autonomous Notification', desc: 'Customers are contacted via email and WhatsApp (Evolution API gateway) with the exact payment link — no manual follow-up.' },
  { icon: Activity, title: 'Revenue Analytics', desc: 'Recovery rates, salvage value, churn cohorts, and bank failure correlation — all computed and streamed live to the control room.' },
  { icon: ShieldCheck, title: 'Ops & Resilience', desc: 'Admin auth, API signature verification, Flyway DB migrations, and a CI pipeline — production-grade guardrails throughout.' },
];

const PIPELINE = [
  { step: '01', title: 'Failure Webhook', icon: Webhook, desc: 'Razorpay notifies the engine the instant a recurring payment fails.' },
  { step: '02', title: 'AI Classify & Schedule', icon: Cpu, desc: 'Transient vs permanent is decided; retry windows are computed with jitter.' },
  { step: '03', title: 'Smart Retry / Escalate', icon: RefreshCw, desc: 'Soft fails re-attempt automatically; hard fails generate a payment link.' },
  { step: '04', title: 'Notify & Recover', icon: Mail, desc: 'Email + WhatsApp with the link — recovery is broadcast back into the stream.' },
];

const STACK = ['Java 21', 'Spring Boot', 'React + TypeScript', 'PostgreSQL', 'Flyway', 'Razorpay API', 'Evolution API', 'Docker', 'GitHub Actions'];

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <IndianRupee size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight text-emerald-400 text-sm sm:text-base">Revenue Recovery Engine</div>
              <div className="text-[10px] text-slate-400 tracking-wide uppercase">Autonomous Subscription Intelligence</div>
            </div>
          </div>
          <button
            onClick={onEnter}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-900/40 transition"
          >
            <Zap size={14} /> Launch Control Room
          </button>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-3.5 py-1.5 mb-6">
            <Sparkles size={13} />
            AI-powered for Razorpay's Payment Rails
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Stop letting failed payments
            <span className="block bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">drain recurring revenue.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-slate-400 text-sm md:text-base leading-relaxed">
            Every subscription costed money to acquire. When a renewal fails, most businesses just lose it.
            This engine watches every <span className="text-slate-200 font-semibold">payment.failed</span> event,
            classifies the failure, and autonomously retries or recovers the charge — turning churn into recovery.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-emerald-900/40 transition"
            >
              <Play size={16} /> See It Live
            </button>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: RefreshCw, label: 'Auto-Retry', value: 'Smart retries' },
              { icon: Banknote, label: 'Salvage', value: 'Recovered revenue' },
              { icon: Landmark, label: 'Real-time', value: 'Bank rail radar' },
              { icon: MessageSquare, label: 'Multi-channel', value: 'Mail + WhatsApp' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-left">
                <s.icon size={18} className="text-emerald-400 mb-2" />
                <div className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</div>
                <div className="text-sm font-bold text-slate-100">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* PROBLEM */}
      <section className="border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-3">The Problem</div>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight text-slate-50">
                Every subscription renewal that fails is revenue already spent — silently lost.
              </h2>
              <p className="mt-5 text-slate-400 text-sm leading-relaxed">
                A recurring debit fails for reasons a customer may not even know — a temporary bank rail timeout, an
                insufficient balance, a declined card. Without intervention, that MRR is gone and the customer churns.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  'No automatic retry — one failure = lost subscription',
                  'No insight into whether the failure was transient or permanent',
                  'No ready payment link for the customer to recover instantly',
                  'Manual follow-up emails that never get sent',
                ].map((p) => (
                  <div key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                      <X size={12} />
                    </span>
                    {p}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-4">Our Solution</div>
              <div className="space-y-3">
                {[
                  { icon: Gauge, t: 'Classify every failure', d: 'Transient soft-fail vs permanent hard-fail, decided instantly.' },
                  { icon: RefreshCw, t: 'Smart retry with jitter', d: 'Optimal window per bank rail; no retry-storms.' },
                  { icon: Banknote, t: 'Real Razorpay recovery link', d: 'Instant payable link generated on demand.' },
                  { icon: MessageSquare, t: 'Autonomous outreach', d: 'Email + WhatsApp delivered with the link.' },
                  { icon: ShieldCheck, t: 'Revenue recovered', d: 'Daily dunning windows tuned to live bank health.' },
                ].map((f) => (
                  <div key={f.t} className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
                    <f.icon size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{f.t}</div>
                      <div className="text-xs text-slate-400">{f.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section className="border-t border-slate-800/70 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-3">How It Works</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-50">From failure to recovered revenue, autonomously</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <div key={p.step} className="relative bg-slate-900 border border-slate-800 rounded-xl p-6">
                {i < PIPELINE.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3.5 text-slate-600 z-10"><ArrowRight size={16} /></div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-11 w-11 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <p.icon size={20} />
                  </div>
                  <span className="text-3xl font-black text-slate-800">{p.step}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1.5">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-3">Capabilities</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-50">Production-grade recovery infrastructure</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-900/60 border border-slate-800 hover:border-emerald-600/40 rounded-xl p-5 transition group">
                <div className="h-10 w-10 rounded-lg bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 transition">
                  <f.icon size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="border-t border-slate-800/70 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <div className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-6">Built With a Real Production Stack</div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {STACK.map((s) => (
              <span key={s} className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800/70 border border-slate-700 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-emerald-400 mb-3">
            <Activity size={16} />
            <span className="text-[11px] font-bold tracking-widest uppercase">Live Simulation Ready</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-50">
            Watch the engine recover revenue in real time.
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-slate-400 text-sm">
            Enter the control room, trigger a soft or hard failure, and watch the autonomous recovery pipeline respond
            instantly — retries, payment links, WhatsApp dispatch, and live bank-radar analytics.
          </p>
          <button
            onClick={onEnter}
            className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-emerald-900/40 transition"
          >
            <Cpu size={16} /> Enter Control Room
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
              <IndianRupee size={12} className="text-white" />
            </div>
            <span className="font-semibold text-slate-300">Revenue Recovery Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Wallet size={12} /> Autonomous</span>
            <span className="flex items-center gap-1.5"><Unplug size={12} /> Real Razorpay integration</span>
            <span className="flex items-center gap-1.5"><Check size={12} /> Production-ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
