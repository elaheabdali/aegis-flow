import { create } from 'zustand';
import type {
  AnalystRole,
  AuditLogEntry,
  CurrencyUnit,
  StreamConnectionMode,
  TelemetryMetrics,
  Transaction,
  TransactionStatus,
} from '@/types/domain';

const MAX_RING_BUFFER_SIZE = 1500;
const MAX_PENDING_QUEUE_SIZE = 500;
const MAX_RISK_HISTORY = 32;

interface WorkbenchState {
  readonly transactions: readonly Transaction[];
  readonly pendingQueue: readonly Transaction[];
  readonly isPaused: boolean;
  readonly connectionMode: StreamConnectionMode;
  readonly activeRole: AnalystRole;
  readonly currency: CurrencyUnit;
  readonly selectedTxId: string | null;
  readonly auditLogs: readonly AuditLogEntry[];
  readonly metrics: TelemetryMetrics;
  readonly riskVelocityHistory: readonly number[];

  ingestProcessedBatch: (payload: {
    readonly accepted: readonly Transaction[];
    readonly totalIngested: number;
    readonly flaggedVolumeDeltaIrt: number;
    readonly criticalDelta: number;
    readonly processingTimeMs: number;
    readonly batchIntervalSec: number;
  }) => void;
  togglePause: (forceState?: boolean) => void;
  setConnectionMode: (mode: StreamConnectionMode) => void;
  setActiveRole: (role: AnalystRole) => void;
  setCurrency: (currency: CurrencyUnit) => void;
  selectTransaction: (txId: string | null) => void;
  updateTransactionStatus: (txId: string, status: TransactionStatus) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  transactions: [],
  pendingQueue: [],
  isPaused: false,
  connectionMode: 'simulated',
  activeRole: 'senior_investigator',
  currency: 'IRT',
  selectedTxId: null,
  auditLogs: [],
  metrics: {
    throughputPerSec: 0,
    flaggedExposureIrt: 0,
    criticalCount: 0,
    workerLatencyMs: 0.4,
  },
  riskVelocityHistory: [18, 24, 21, 35, 29, 44, 38, 52, 41, 33, 47, 39],

  ingestProcessedBatch: ({
    accepted,
    totalIngested,
    flaggedVolumeDeltaIrt,
    criticalDelta,
    processingTimeMs,
    batchIntervalSec,
  }) =>
    set((state) => {
      const throughputPerSec = Math.round(totalIngested / batchIntervalSec);

      const batchAvgRisk =
        accepted.length > 0
          ? Math.round(
              accepted.reduce((sum, tx) => sum + tx.riskScore, 0) / accepted.length
            )
          : (state.riskVelocityHistory[state.riskVelocityHistory.length - 1] ?? 25);

      const nextVelocityHistory = [
        ...state.riskVelocityHistory.slice(-(MAX_RISK_HISTORY - 1)),
        batchAvgRisk,
      ];

      const nextMetrics: TelemetryMetrics = {
        throughputPerSec,
        flaggedExposureIrt: state.metrics.flaggedExposureIrt + flaggedVolumeDeltaIrt,
        criticalCount: state.metrics.criticalCount + criticalDelta,
        workerLatencyMs: Number(processingTimeMs.toFixed(2)),
      };

      if (state.isPaused) {
        const mergedQueue = [...accepted, ...state.pendingQueue].slice(
          0,
          MAX_PENDING_QUEUE_SIZE
        );
        return {
          pendingQueue: mergedQueue,
          metrics: nextMetrics,
          riskVelocityHistory: nextVelocityHistory,
        };
      }

      const nextTransactions = [...accepted, ...state.transactions].slice(
        0,
        MAX_RING_BUFFER_SIZE
      );

      return {
        transactions: nextTransactions,
        metrics: nextMetrics,
        riskVelocityHistory: nextVelocityHistory,
      };
    }),

  togglePause: (forceState) =>
    set((state) => {
      const nextPaused =
        typeof forceState === 'boolean' ? forceState : !state.isPaused;

      if (nextPaused === state.isPaused) {
        return state;
      }

      if (!nextPaused && state.pendingQueue.length > 0) {
        const flushed = [...state.pendingQueue, ...state.transactions].slice(
          0,
          MAX_RING_BUFFER_SIZE
        );
        return {
          isPaused: false,
          pendingQueue: [],
          transactions: flushed,
        };
      }

      if (nextPaused) {
        const pauseLog: AuditLogEntry = {
          id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36)
            .slice(2, 5)
            .toUpperCase()}`,
          timestamp: new Date().toISOString(),
          actorRole: state.activeRole,
          action: 'STREAM_PAUSED',
          targetId: 'TELEMETRY_STREAM',
          reason: 'Analyst froze live Shetab/Shaparak telemetry feed for inspection',
        };
        return {
          isPaused: true,
          auditLogs: [pauseLog, ...state.auditLogs].slice(0, 50),
        };
      }

      return { isPaused: nextPaused };
    }),

  setConnectionMode: (mode) => set({ connectionMode: mode }),
  setActiveRole: (role) => set({ activeRole: role }),
  setCurrency: (currency) => set({ currency }),
  selectTransaction: (txId) => set({ selectedTxId: txId }),

  updateTransactionStatus: (txId, status) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === txId ? { ...tx, status } : tx
      ),
      pendingQueue: state.pendingQueue.map((tx) =>
        tx.id === txId ? { ...tx, status } : tx
      ),
    })),

  addAuditLog: (entry) =>
    set((state) => ({
      auditLogs: [
        {
          ...entry,
          id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36)
            .slice(2, 5)
            .toUpperCase()}`,
          timestamp: new Date().toISOString(),
        },
        ...state.auditLogs,
      ].slice(0, 50),
    })),
}));