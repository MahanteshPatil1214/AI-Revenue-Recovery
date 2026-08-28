export type DunningStatus =
  | 'SCHEDULED'
  | 'RETRYING'
  | 'RECOVERED_ACTION_TAKEN'
  | 'RECOVERED_RETRY_SUCCESS'
  | 'RECOVERED_CUSTOMER_PAID'
  | 'EXHAUSTED_ESCALATED';

export type FailureCategory = 'TRANSIENT_SOFT_FAIL' | 'PERMANENT_HARD_FAIL';

export const RECOVERED_STATUSES: ReadonlySet<string> = new Set([
  'RECOVERED_ACTION_TAKEN',
  'RECOVERED_RETRY_SUCCESS',
  'RECOVERED_CUSTOMER_PAID',
]);

export interface DunningEvent {
  id?: number;
  paymentId: string;
  amount: number;
  customerEmail: string;
  customerContact: string;
  errorCode: string;
  errorReason: string;
  category: FailureCategory;
  strategyApplied: string;
  reasoningTrace: string;
  recoveryUrl?: string;
  status: DunningStatus;
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

export interface StrategyBreakdown {
  strategy: string;
  count: number;
  recoveredValue: number;
}

export interface CohortPoint {
  cohortDay: string;
  total: number;
  totalValue: number;
  recovered: number;
  recoveredValue: number;
}

export interface ServerAnalytics {
  totalEvents: number;
  totalValueAtRisk: number;
  totalRecovered: number;
  totalRecoveredValue: number;
  recoveryRatePercent: number;
  valueRecoveryRatePercent: number;
  strategyBreakdown: StrategyBreakdown[];
  churnCohorts: CohortPoint[];
}