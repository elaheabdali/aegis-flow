'use client';

import { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function WorkbenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Workbench Error Boundary caught:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-[var(--surface-card)] p-8 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
        <AlertOctagon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        Telemetry Module Interrupted
      </h2>
      <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
        An unexpected runtime exception occurred. Your audit trail and session
        state remain protected.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Recover Workbench</span>
      </button>
    </div>
  );
}