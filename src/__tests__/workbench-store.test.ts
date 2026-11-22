import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { scoreTransaction } from '@/features/fraud-engine/risk-scorer';
import type { RawTransaction } from '@/types/domain';

function makeScoredTx(id: string) {
  const raw: RawTransaction = {
    id,
    shaparakRrn: '940000556677',
    timestamp: new Date().toISOString(),
    amountIrt: 65_000_000,
    channel: 'paya_satna',
    bankId: 'pasargad',
    merchantNameFa: 'حواله پایا / ساتنا بین‌بانکی',
    merchantNameEn: 'Paya / Satna Interbank',
    merchantCategory: 'Interbank Wire',
    accountHolderFa: 'سارا محمدی‌پور',
    accountHolderEn: 'Sara Mohammadipour',
    maskedCardNumber: '5022-29••-••••-3321',
    rawCardNumber: '5022-2911-2200-3321',
    maskedIban: 'IR82 0570 •••• •••• •••• 7892',
    rawIban: 'IR82 0570 0000 0011 2233 7892',
    maskedNationalId: '008••••635',
    rawNationalId: '0084129635',
    originCity: 'VPN_EU',
    isForeignIp: true,
    shahkarVerified: false,
    minutesSinceLastTx: 10,
    txCountLastHour: 7,
    isNewDevice: true,
    ipAddress: '185.140.22.10',
    deviceFingerprint: 'ir_fp_test99',
  };
  return scoreTransaction(raw);
}

describe('Workbench Zustand Store, Toman/Rial Unit & Queue Buffering', () => {
  beforeEach(() => {
    useWorkbenchStore.setState({
      transactions: [],
      pendingQueue: [],
      isPaused: false,
      connectionMode: 'simulated',
      activeRole: 'senior_investigator',
      currency: 'IRT',
      selectedTxId: null,
      auditLogs: [],
    });
  });

  it('queues incoming transactions when stream is paused and flushes on resume', () => {
    const store = useWorkbenchStore.getState();
    const tx1 = makeScoredTx('SHP-001');
    const tx2 = makeScoredTx('SHP-002');

    store.ingestProcessedBatch({
      accepted: [tx1],
      totalIngested: 1,
      flaggedVolumeDeltaIrt: tx1.amountIrt,
      criticalDelta: 1,
      processingTimeMs: 0.5,
      batchIntervalSec: 0.5,
    });

    expect(useWorkbenchStore.getState().transactions).toHaveLength(1);

    useWorkbenchStore.getState().togglePause(true);

    useWorkbenchStore.getState().ingestProcessedBatch({
      accepted: [tx2],
      totalIngested: 1,
      flaggedVolumeDeltaIrt: tx2.amountIrt,
      criticalDelta: 1,
      processingTimeMs: 0.4,
      batchIntervalSec: 0.5,
    });

    expect(useWorkbenchStore.getState().transactions).toHaveLength(1);
    expect(useWorkbenchStore.getState().pendingQueue).toHaveLength(1);

    useWorkbenchStore.getState().togglePause(false);
    expect(useWorkbenchStore.getState().pendingQueue).toHaveLength(0);
    expect(useWorkbenchStore.getState().transactions).toHaveLength(2);
    expect(useWorkbenchStore.getState().transactions[0]?.id).toBe('SHP-002');
  });

  it('switches currency between Toman (IRT) and Rial (IRR) and rolls back failed status updates', () => {
    expect(useWorkbenchStore.getState().currency).toBe('IRT');
    useWorkbenchStore.getState().setCurrency('IRR');
    expect(useWorkbenchStore.getState().currency).toBe('IRR');

    const tx = makeScoredTx('SHP-OPT1');
    useWorkbenchStore.getState().ingestProcessedBatch({
      accepted: [tx],
      totalIngested: 1,
      flaggedVolumeDeltaIrt: tx.amountIrt,
      criticalDelta: 1,
      processingTimeMs: 0.3,
      batchIntervalSec: 0.5,
    });

    const originalStatus = useWorkbenchStore.getState().transactions[0]?.status;
    expect(originalStatus).toBe('flagged');

    useWorkbenchStore.getState().updateTransactionStatus('SHP-OPT1', 'frozen');
    expect(useWorkbenchStore.getState().transactions[0]?.status).toBe('frozen');

    useWorkbenchStore
      .getState()
      .updateTransactionStatus('SHP-OPT1', originalStatus ?? 'flagged');
    expect(useWorkbenchStore.getState().transactions[0]?.status).toBe('flagged');
  });
});