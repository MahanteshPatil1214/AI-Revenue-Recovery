import React from 'react';
import {
  IndianRupee,
  TrendingUp,
  Banknote,
  Activity,
  ShieldCheck,
  Gauge,
  Cpu,
  Webhook,
  MessageSquare,
  RefreshCw,
  Landmark,
  ArrowRight,
  Play,
  Check,
} from 'lucide-react';

interface LandingProps {
  onEnter: () => void;
}

const FEATURES = [
  { icon: Activity, title: 'Live recovery stream', desc: 'Every failed payment and its recovery outcome is streamed to the console in real time — no refresh needed.' },
  { icon: Banknote, title: 'Real Razorpay payment links', desc: 'Generated on demand from the API — original, 10% grace-discount, or monthly-downgrade options the customer can pay with immediately.' },
  { icon: RefreshCw, title: 'Smart retry scheduler', desc: 'Transient failures are re-attempted at an optimized time per bank rail, with jitter to avoid hitting the gateway all at once.' },
  { icon: Landmark, title: 'Bank-downtime radar', desc: 'Tracks the health of payment rails and re-tunes retry windows live when a bank is degraded or in outage.' },
  { icon: MessageSquare, title: 'Autonomous outreach', desc: 'Customers are contacted via email and WhatsApp (Evolution API) with the exact link to settle — no manual follow-up.' },
  { icon: ShieldCheck, title: 'Built to run in production', desc: 'Webhook signature checks, idempotency, a dead-letter queue, Flyway migrations, and a CI pipeline.' },
];

const PIPELINE = [
  { step: '01', title: 'Parse the failure', icon: Webhook, desc: 'A payment.failed webhook arrives and is validated, de-duplicated, and routed.' },
  { step: '02', title: 'Classify & schedule', icon: Cpu, desc: 'Transient (retryable) vs permanent (escalate) is decided with the ideal retry window.' },
  { step: '03', title: 'Retry or build a link', icon: RefreshCw, desc: 'Soft fails re-attempt; hard fails get a ready-to-pay Razorpay link.' },
  { step: '04', title: 'Notify & recover', icon: MessageSquare, desc: 'Email + WhatsApp with the link; success is written back to the stream.' },
];

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center">
              <IndianRupee size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight text-slate-900 text-sm">Razorpay AI Revenue Recovery Engine</div>
            </div>
          </div>
          <button
            onClick={onEnter}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
          >
            Open console <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <header className="border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              For Razorpay's recurring-payment rails
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-slate-950 max-w-2xl mx-auto">
              Failed renewals, recovered automatically.
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              When a recurring charge fails, most platforms lose the revenue silently. This system watches every
              failure, decides whether it's worth retrying, and recovers the money — with a payment link the customer
              can use right away.
            </p>
            <div className="mt-8">
              <button
                onClick={onEnter}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
              >
                <Play size={15} /> See it working
              </button>
            </div>
          </div>

          {/* Key stats */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {[
              { label: 'Failure types triaged', value: 'Transient / Permanent' },
              { label: 'Retry attempts', value: 'Up to 3' },
              { label: 'Payment options', value: '3 dynamic links' },
              { label: 'Contact channels', value: 'Email + WhatsApp' },
            ].map((s) => (
              <div key={s.label} className="bg-white px-6 py-5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{s.label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section className="border-b border-slate-200 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950">How recovery works</h2>
            <p className="mt-2 text-slate-600">A failed recurring payment flows through four steps, end to end.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PIPELINE.map((p) => (
              <div key={p.step}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-emerald-700">{p.step}</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p.icon size={18} className="text-slate-700" />
                  <h3 className="font-semibold text-slate-900 text-sm">{p.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="border-b border-slate-200 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950 mb-4">
                The problem
              </h2>
              <p className="text-slate-600 leading-relaxed mb-5">
                A recurring debit can fail long before a customer notices — a temporary bank outage, a declined card, an
                insufficient balance. Without action, that subscription (and its revenue) is gone for good.
              </p>
              <ul className="space-y-2.5">
                {[
                  'No automatic retry — one failure ends the subscription',
                  'No way to tell a temporary blip from a real decline',
                  'No ready payment link for the customer to settle instantly',
                  'Follow-up emails that never actually get sent',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950 mb-4">
                What the engine does
              </h2>
              <p className="text-slate-600 leading-relaxed mb-5">
                Each failure is classified and acted on without a human in the loop — from the moment the webhook lands
                to the point the money is recovered.
              </p>
              <ul className="space-y-2.5">
                {[
                  'Classifies every failure as transient or permanent, instantly',
                  'Retries soft failures at an optimized time, avoiding retry-storms',
                  "Generates a real Razorpay payment link the moment it's needed",
                  'Sends the link by email and WhatsApp, then broadcasts the recovery',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                      <Check size={12} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-slate-200 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950">What's inside</h2>
            <p className="mt-2 text-slate-600">The pieces that make silent revenue loss into recoverable revenue.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-6">
                <f.icon size={20} className="text-emerald-600 mb-3" />
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STACK */}
      <section className="border-b border-slate-200 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-4">Built on</div>
          <div className="flex flex-wrap gap-2">
            {['Java 21', 'Spring Boot', 'React + TypeScript', 'PostgreSQL', 'Flyway', 'Razorpay API', 'Evolution API', 'Docker', 'GitHub Actions'].map((s) => (
              <span key={s} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950">
            Open the console and watch it recover revenue live.
          </h2>
          <p className="mt-3 text-slate-600">
            Trigger a simulated failure and follow it through to a recovered payment link.
          </p>
          <button
            onClick={onEnter}
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <TrendingUp size={15} /> Open console
          </button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
