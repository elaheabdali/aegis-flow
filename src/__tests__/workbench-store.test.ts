import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { scoreTransaction } from '@/features/fraud-engine/risk-scorer';
import type { RawTransaction } from '@/types/domain';

function makeScoredTx(id: string) {
  const raw: RawTransaction = {
    id,
    timestamp: new Date().toISOString(),
    amount: 14000,
    currency: 'USD',
    merchantName: 'SwiftGlobal Remittance',
    merchantCategory: 'Wire Transfer',
    accountHolder: 'Marcus Vance',
    maskedCardNumber: '5412 •••• •••• 3321',
    rawCardNumber: '5412 1100 2200 3321',
    originCountry: 'AE',
    previousCountry: 'GB',
    minutesSinceLastTx: 15,
    txCountLastHour: 7,
    isNewDevice: true,
    ipAddress: '91.74.22.10',
    deviceFingerprint: 'fp_test99',
  };
  return scoreTransaction(raw);
}

describe('Workbench Zustand Store & Queue Buffering', () => {
  beforeEach(() => {
    useWorkbenchStore.setState({
      transactions: [],
      pendingQueue: [],
      isPaused: false,
      connectionMode: 'simulated',
      activeRole: 'senior_investigator',
      selectedTxId: null,
      auditLogs: [],
    });
  });

  it('queues incoming transactions when stream is paused and flushes on resume', () => {
    const store = useWorkbenchStore.getState();
    const tx1 = makeScoredTx('TX-001');
    const tx2 = makeScoredTx('TX-002');

    store.ingestProcessedBatch({
      accepted: [tx1],
      totalIngested: 1,
      flaggedVolumeDelta: tx1.amount,
      criticalDelta: 1,
      processingTimeMs: 0.5,
      batchIntervalSec: 0.5,
    });

    expect(useWorkbenchStore.getState().transactions).toHaveLength(1);

    // Freeze stream
    useWorkbenchStore.getState().togglePause(true);

    useWorkbenchStore.getState().ingestProcessedBatch({
      accepted: [tx2],
      totalIngested: 1,
      flaggedVolumeDelta: tx2.amount,
      criticalDelta: 1,
      processingTimeMs: 0.4,
      batchIntervalSec: 0.5,
    });

    // Main grid remains frozen at 1 item while pendingQueue holds tx2
    expect(useWorkbenchStore.getState().transactions).toHaveLength(1);
    expect(useWorkbenchStore.getState().pendingQueue).toHaveLength(1);

    // Resume stream -> flushes pendingQueue to top of transactions
    useWorkbenchStore.getState().togglePause(false);
    expect(useWorkbenchStore.getState().pendingQueue).toHaveLength(0);
    expect(useWorkbenchStore.getState().transactions).toHaveLength(2);
    expect(useWorkbenchStore.getState().transactions[0]?.id).toBe('TX-002');
  });

  it('supports optimistic status updates and deterministic rollback', () => {
    const tx = makeScoredTx('TX-OPT1');
    useWorkbenchStore.getState().ingestProcessedBatch({
      accepted: [tx],
      totalIngested: 1,
      flaggedVolumeDelta: tx.amount,
      criticalDelta: 1,
      processingTimeMs: 0.3,
      batchIntervalSec: 0.5,
    });

    const originalStatus = useWorkbenchStore.getState().transactions[0]?.status;
    expect(originalStatus).toBe('flagged');

    // Optimistic update
    useWorkbenchStore.getState().updateTransactionStatus('TX-OPT1', 'frozen');
    expect(useWorkbenchStore.getState().transactions[0]?.status).toBe('frozen');

    // Rollback on simulated API failure
    useWorkbenchStore.getState().updateTransactionStatus('TX-OPT1', originalStatus ?? 'flagged');
    expect(useWorkbenchStore.getState().transactions[0]?.status).toBe('flagged');
  });
});