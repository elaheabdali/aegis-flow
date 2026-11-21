'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertOctagon } from 'lucide-react';
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
    message: string;
    variant: 'success' | 'error';
  } | null>(null);

  const handleNotify = (message: string, variant: 'success' | 'error') => {
    setToast({ message, variant });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 5000);
  };

  return (
    <div className="space-y-6">
      <KpiTelemetryBar locale={locale} dict={dict} />

      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-sm">
        <div className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
          <h1 className="text-base font-bold text-[var(--text-primary)]">
            {dict.workbench.title}
          </h1>
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
        onOpenWizard={(tx) => setWizardTx(tx)}
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
            role="status"
            aria-live="assertive"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={TELEMETRY_SPRING}
            className={`fixed bottom-5 end-5 z-50 flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl ${
              toast.variant === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/90 text-rose-200'
            }`}
          >
            {toast.variant === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}