import { matchesFilter, scoreTransaction } from '@/features/fraud-engine/risk-scorer';
import type {
  StreamFilterState,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@/types/domain';

let activeFilter: StreamFilterState = {
  query: '',
  severity: 'all',
};

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;

  if (message.type === 'UPDATE_FILTERS') {
    activeFilter = message.payload;
    return;
  }

  if (message.type === 'RESET') {
    activeFilter = { query: '', severity: 'all' };
    return;
  }

  if (message.type === 'INGEST_BATCH') {
    const startTime = performance.now();
    const accepted = [];
    let flaggedVolumeDelta = 0;
    let criticalDelta = 0;

    for (const rawTx of message.payload) {
      const scored = scoreTransaction(rawTx);

      if (scored.severity === 'critical' || scored.severity === 'high') {
        flaggedVolumeDelta += scored.amount;
      }
      if (scored.severity === 'critical') {
        criticalDelta += 1;
      }

      if (matchesFilter(scored, activeFilter)) {
        accepted.push(scored);
      }
    }

    const processingTimeMs = Math.max(0.1, performance.now() - startTime);

    const outbound: WorkerOutboundMessage = {
      type: 'PROCESSED_BATCH',
      payload: {
        accepted,
        totalIngested: message.payload.length,
        flaggedVolumeDelta,
        criticalDelta,
        processingTimeMs,
      },
    };

    self.postMessage(outbound);
  }
};