export interface DunningEvent {
  id?: number;
  paymentId: string;
  amount: number;
  customerEmail: string;
  customerContact: string;
  errorCode: string;
  errorReason: string;
  category: 'TRANSIENT_SOFT_FAIL' | 'PERMANENT_HARD_FAIL';
  strategyApplied: string;
  reasoningTrace: string;
  recoveryUrl?: string;
  status: string;
  retryCount?: number;
  maxRetries?: number;
  nextRetryAt?: string;
  createdAt: string;
}

export interface BenchmarkReport {
  batchSize: number;
  hardFailuresEscalated: number;
  softFailuresQueued: number;
  totalValueProcessed: number;
  processingDurationMs: number;
  throughputEventsPerSec: number;
}