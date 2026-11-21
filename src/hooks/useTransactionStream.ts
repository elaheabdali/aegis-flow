'use client';

import { useEffect, useRef } from 'react';
import { generateSimulatedBatch } from '@/features/fraud-engine/stream-simulator';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type {
  StreamFilterState,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@/types/domain';

const STREAM_INTERVAL_MS = 450;
const BATCH_SIZE = 6;

export function useTransactionStream(filters: StreamFilterState) {
  const workerRef = useRef<Worker | null>(null);
  const ingestProcessedBatch = useWorkbenchStore((s) => s.ingestProcessedBatch);
  const setConnectionMode = useWorkbenchStore((s) => s.setConnectionMode);

  // Initialize Dedicated Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/risk-engine.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      if (event.data.type === 'PROCESSED_BATCH') {
        ingestProcessedBatch({
          ...event.data.payload,
          batchIntervalSec: STREAM_INTERVAL_MS / 1000,
        });
      }
    };

    // Seed initial batch immediately on mount so UI is populated on first paint
    const seedMsg: WorkerInboundMessage = {
      type: 'INGEST_BATCH',
      payload: generateSimulatedBatch(18),
    };
    worker.postMessage(seedMsg);
    setConnectionMode('simulated');

    const intervalId = window.setInterval(() => {
      const msg: WorkerInboundMessage = {
        type: 'INGEST_BATCH',
        payload: generateSimulatedBatch(BATCH_SIZE),
      };
      worker.postMessage(msg);
    }, STREAM_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      worker.terminate();
      workerRef.current = null;
    };
  }, [ingestProcessedBatch, setConnectionMode]);

  // Sync active filters to Web Worker whenever URL params change
  useEffect(() => {
    if (!workerRef.current) return;
    const filterMsg: WorkerInboundMessage = {
      type: 'UPDATE_FILTERS',
      payload: filters,
    };
    workerRef.current.postMessage(filterMsg);
  }, [filters]);
}