'use client';

import { useEffect, useRef } from 'react';
import { generateSimulatedBatch } from '@/features/fraud-engine/stream-simulator';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type {
  RawTransaction,
  StreamFilterState,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@/types/domain';

const STREAM_INTERVAL_MS = 450;
const BATCH_SIZE = 6;
const MAX_BUFFERED_QUEUE = 500;

function isRawTransactionArray(data: unknown): data is readonly RawTransaction[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RawTransaction).id === 'string' &&
        typeof (item as RawTransaction).amountIrt === 'number'
    )
  );
}

export function useTransactionStream(filters: StreamFilterState) {
  const workerRef = useRef<Worker | null>(null);
  const initialFiltersRef = useRef<StreamFilterState>(filters);
  const ingestProcessedBatch = useWorkbenchStore((s) => s.ingestProcessedBatch);
  const setConnectionMode = useWorkbenchStore((s) => s.setConnectionMode);

  // Initialize Dedicated Web Worker and Telemetry Feed
  useEffect(() => {
    let isDisposed = false;
    let intervalId: number | null = null;
    let socket: WebSocket | null = null;

    const worker = new Worker(
      new URL('../workers/risk-engine.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      if (isDisposed) return;
      if (event.data.type === 'PROCESSED_BATCH') {
        ingestProcessedBatch({
          ...event.data.payload,
          batchIntervalSec: STREAM_INTERVAL_MS / 1000,
        });
      }
    };

    worker.onerror = () => {
      if (!isDisposed) {
        setConnectionMode('paused');
      }
    };

    worker.onmessageerror = () => {
      if (!isDisposed) {
        setConnectionMode('paused');
      }
    };

    // Apply initial URL filters BEFORE seeding initial batch to prevent unfiltered flash
    const initialFilterMsg: WorkerInboundMessage = {
      type: 'UPDATE_FILTERS',
      payload: initialFiltersRef.current,
    };
    worker.postMessage(initialFilterMsg);

    const startSimulatedStream = () => {
      if (isDisposed) return;
      setConnectionMode('simulated');

      const seedMsg: WorkerInboundMessage = {
        type: 'INGEST_BATCH',
        payload: generateSimulatedBatch(18),
      };
      worker.postMessage(seedMsg);

      intervalId = window.setInterval(() => {
        if (isDisposed || !workerRef.current) return;

        const { isPaused, pendingQueue } = useWorkbenchStore.getState();
        if (isPaused && pendingQueue.length >= MAX_BUFFERED_QUEUE) {
          return;
        }

        const msg: WorkerInboundMessage = {
          type: 'INGEST_BATCH',
          payload: generateSimulatedBatch(BATCH_SIZE),
        };
        workerRef.current.postMessage(msg);
      }, STREAM_INTERVAL_MS);
    };

    const wsUrl = process.env.NEXT_PUBLIC_WS_TELEMETRY_URL?.trim();

    if (wsUrl) {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (!isDisposed) {
            setConnectionMode('live_ws');
          }
        };

        socket.onmessage = (wsEvent: MessageEvent<string>) => {
          if (isDisposed || !workerRef.current) return;
          try {
            const parsed: unknown = JSON.parse(wsEvent.data);
            const batch = Array.isArray(parsed) ? parsed : [parsed];
            if (isRawTransactionArray(batch) && batch.length > 0) {
              workerRef.current.postMessage({
                type: 'INGEST_BATCH',
                payload: batch,
              } satisfies WorkerInboundMessage);
            }
          } catch {
            // Ignore malformed telemetry frames safely
          }
        };

        socket.onerror = () => {
          socket?.close();
        };

        socket.onclose = () => {
          if (!isDisposed && intervalId === null) {
            startSimulatedStream();
          }
        };
      } catch {
        startSimulatedStream();
      }
    } else {
      startSimulatedStream();
    }

    return () => {
      isDisposed = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
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