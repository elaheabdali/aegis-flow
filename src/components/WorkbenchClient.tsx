'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertOctagon, X } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { useSyncedFilters } from '@/hooks/useSyncedFilters';
import { useTransactionStream } from '@/hooks/useTransactionStream';
import { KpiTelemetryBar } from '@/components/layout/KpiTelemetryBar';
import { StreamControls } from '@/components/stream/StreamControls';
import { TransactionGrid } from '@/components/stream/TransactionGrid';
import { CaseDrawer } from '@/components/investigation/CaseDrawer';
import { SarWizardModal } from '@/components/investigation/SarWizardModal';
import { TELEMETRY_SPRING } from '@/lib/motion';
import type { Transaction } from '@/types/domain';

interface WorkbenchClientProps {
  readonly locale: Locale;
  readonly dict: Dictionary;
}

export function WorkbenchClient({ locale, dict }: WorkbenchClientProps) {
  const { filters, updateFilters } = useSyncedFilters();
  useTransactionStream(filters);

  const [wizardTx, setWizardTx] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<{
    readonly id: number;
    readonly message: string;
    readonly variant: 'success' | 'error';
  } | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleNotify = (message: string, variant: 'success' | 'error') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    const toastId = Date.now();
    setToast({ id: toastId, message, variant });

    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === toastId ? null : current));
      toastTimerRef.current = null;
    }, 5000);
  };

  const handleOpenWizard = (tx: Transaction) => {
    if (tx.status === 'frozen' || tx.status === 'reported_sar') {
      return;
    }
    setWizardTx(tx);
  };

  return (
    <div className="space-y-6">
      <KpiTelemetryBar locale={locale} dict={dict} />

      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-sm">
        <div className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {dict.workbench.title}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {dict.workbench.subtitle}
          </p>
        </div>

        <StreamControls
          dict={dict}
          filters={filters}
          onUpdateFilters={updateFilters}
        />

        <TransactionGrid locale={locale} dict={dict} />
      </section>

      {/* Investigation Slide-Over Drawer */}
      <CaseDrawer
        locale={locale}
        dict={dict}
        onOpenWizard={handleOpenWizard}
      />

      {/* 4-Step SAR & Account Freeze Wizard */}
      <AnimatePresence>
        {wizardTx && (
          <SarWizardModal
            transaction={wizardTx}
            locale={locale}
            dict={dict}
            onClose={() => setWizardTx(null)}
            onNotify={handleNotify}
          />
        )}
      </AnimatePresence>

      {/* Accessible Live Region Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="assertive"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={TELEMETRY_SPRING}
            className={`fixed bottom-5 end-5 z-50 flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl ${
              toast.variant === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/95 text-rose-200'
            }`}
          >
            {toast.variant === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 opacity-75 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}