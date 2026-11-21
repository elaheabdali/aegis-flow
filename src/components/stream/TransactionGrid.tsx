'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Globe,
  Info,
  Keyboard,
} from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { formatCurrency, formatNumber, formatTime } from '@/i18n/formatters';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { useGridKeyboardNav } from '@/hooks/useGridKeyboardNav';
import type { RiskSeverity, Transaction } from '@/types/domain';

interface TransactionGridProps {
  readonly locale: Locale;
  readonly dict: Dictionary;
}

function SeverityBadge({
  severity,
  score,
  locale,
  label,
}: {
  readonly severity: RiskSeverity;
  readonly score: number;
  readonly locale: Locale;
  readonly label: string;
}) {
  const styles: Record<
    RiskSeverity,
    { classes: string; Icon: typeof AlertOctagon }
  > = {
    critical: {
      classes: 'border-rose-500/30 bg-rose-500/15 text-rose-500',
      Icon: AlertOctagon,
    },
    high: {
      classes: 'border-orange-500/30 bg-orange-500/15 text-orange-500',
      Icon: AlertTriangle,
    },
    medium: {
      classes: 'border-amber-500/30 bg-amber-500/15 text-amber-500',
      Icon: Info,
    },
    low: {
      classes: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500',
      Icon: CheckCircle2,
    },
  };

  const { classes, Icon } = styles[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${classes}`}
    >
      <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
      <span className='font-mono tabular-nums'>
        {formatNumber(score, locale)}
      </span>
      <span className='hidden sm:inline'>• {label}</span>
    </span>
  );
}

export function TransactionGrid({ locale, dict }: TransactionGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const transactions = useWorkbenchStore((s) => s.transactions);
  const selectedTxId = useWorkbenchStore((s) => s.selectedTxId);
  const selectTransaction = useWorkbenchStore((s) => s.selectTransaction);
  const togglePause = useWorkbenchStore((s) => s.togglePause);

  const rowVirtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  const handleInspect = (tx: Transaction) => {
    // Automatically freeze live stream when analyst opens a case so rows stay anchored
    togglePause(true);
    selectTransaction(tx.id);
  };

  const { focusedIndex, setFocusedIndex, handleKeyDown } = useGridKeyboardNav({
    transactions,
    onInspect: handleInspect,
    onTogglePause: () => togglePause(),
    scrollToIndex: (index) =>
      rowVirtualizer.scrollToIndex(index, { align: 'auto' }),
  });

  return (
    <div className='flex flex-col'>
      {/* Keyboard Accessibility Hint Bar */}
      <div className='flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 px-4 py-1.5 text-[11px] text-[var(--text-muted)]'>
        <div className='flex items-center gap-1.5'>
          <Keyboard className='h-3.5 w-3.5 text-blue-500' />
          <span>{dict.workbench.keyboardHint}</span>
        </div>
        <span className='font-mono tabular-nums'>
          {formatNumber(transactions.length, locale)} TX
        </span>
      </div>

      {/* ARIA Grid Container */}
      <div
        role='grid'
        aria-label={dict.workbench.title}
        aria-rowcount={transactions.length}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className='focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60'
      >
        {/* Sticky Table Header */}
        <div
          role='row'
          className='grid grid-cols-12 items-center border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/75 px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]'
        >
          <div role='columnheader' className='col-span-2 sm:col-span-1'>
            {dict.workbench.columns.time}
          </div>
          <div role='columnheader' className='col-span-3 sm:col-span-2'>
            {dict.workbench.columns.txId}
          </div>
          <div role='columnheader' className='col-span-4 sm:col-span-3'>
            {dict.workbench.columns.merchant}
          </div>
          <div role='columnheader' className='hidden sm:col-span-2 sm:block'>
            {dict.workbench.columns.origin}
          </div>
          <div
            role='columnheader'
            className='col-span-3 sm:col-span-1 text-end'
          >
            {dict.workbench.columns.amount}
          </div>
          <div
            role='columnheader'
            className='hidden md:col-span-2 md:block ps-4'
          >
            {dict.workbench.columns.riskScore}
          </div>
          <div
            role='columnheader'
            className='hidden md:col-span-1 md:block text-end'
          >
            {dict.workbench.columns.action}
          </div>
        </div>

        {/* Virtualized Scroll Viewport */}
        <div ref={parentRef} className='h-[520px] overflow-y-auto'>
          {transactions.length === 0 ? (
            <div className='flex h-full items-center justify-center p-8 text-sm text-[var(--text-muted)]'>
              {dict.workbench.emptyState}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const tx = transactions[virtualRow.index];
                if (!tx) return null;

                const isSelected = tx.id === selectedTxId;
                const isFocused = virtualRow.index === focusedIndex;

                return (
                  <div
                    key={tx.id}
                    role='row'
                    aria-rowindex={virtualRow.index + 1}
                    aria-selected={isSelected}
                    onClick={() => {
                      setFocusedIndex(virtualRow.index);
                      handleInspect(tx);
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={`grid cursor-pointer grid-cols-12 items-center border-b border-[var(--border-subtle)]/70 px-4 text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-500/15'
                        : isFocused
                          ? 'bg-[var(--surface-hover)]'
                          : 'hover:bg-[var(--surface-elevated)]/60'
                    }`}
                  >
                    {/* Time */}
                    <div
                      role='gridcell'
                      dir='ltr'
                      className='col-span-2 sm:col-span-1 text-start font-mono text-[11px] text-[var(--text-muted)] tabular-nums'
                    >
                      {formatTime(tx.timestamp, locale)}
                    </div>

                    {/* TX ID + Masked Card */}
                    <div
                      role='gridcell'
                      className='col-span-3 sm:col-span-2 pe-2'
                    >
                      <div
                        dir='ltr'
                        className='text-start font-mono font-semibold text-[var(--text-primary)]'
                      >
                        {tx.id}
                      </div>
                      <div
                        dir='ltr'
                        className='text-start font-mono text-[10px] text-[var(--text-muted)]'
                      >
                        {tx.maskedCardNumber}
                      </div>
                    </div>

                    {/* Merchant & Account Holder */}
                    <div
                      role='gridcell'
                      className='col-span-4 sm:col-span-3 truncate pe-2'
                    >
                      <div className='truncate font-medium text-[var(--text-primary)]'>
                        {tx.merchantName}
                      </div>
                      <div className='truncate text-[11px] text-[var(--text-secondary)]'>
                        {tx.accountHolder}
                      </div>
                    </div>

                    {/* Origin Country & IP */}
                    <div
                      role='gridcell'
                      className='hidden sm:col-span-2 sm:block'
                    >
                      <div className='flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-primary)]'>
                        <Globe className='h-3 w-3 text-blue-500' />
                        <span>{tx.originCountry}</span>
                        {tx.originCountry !== tx.previousCountry && (
                          <span className='rounded bg-rose-500/15 px-1 text-[10px] text-rose-500'>
                            ← {tx.previousCountry}
                          </span>
                        )}
                      </div>
                      <div
                        dir='ltr'
                        className='text-start font-mono text-[10px] text-[var(--text-muted)]'
                      >
                        {tx.ipAddress}
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      role='gridcell'
                      dir='ltr'
                      className='col-span-3 sm:col-span-1 text-end font-mono font-bold text-[var(--text-primary)] tabular-nums'
                    >
                      {formatCurrency(tx.amount, locale)}
                    </div>

                    {/* Risk Score Badge + Enforcement Status */}
                    <div
                      role='gridcell'
                      className='hidden md:col-span-2 md:flex md:items-center md:gap-1.5 ps-4'
                    >
                      {tx.status === 'frozen' ||
                      tx.status === 'reported_sar' ? (
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                            tx.status === 'frozen'
                              ? 'border-rose-500/40 bg-rose-500/20 text-rose-500'
                              : 'border-blue-500/40 bg-blue-500/20 text-blue-500'
                          }`}
                        >
                          {dict.workbench.statuses[tx.status]}
                        </span>
                      ) : (
                        <SeverityBadge
                          severity={tx.severity}
                          score={tx.riskScore}
                          locale={locale}
                          label={dict.workbench.severities[tx.severity]}
                        />
                      )}
                    </div>

                    {/* Inspect Button */}
                    <div
                      role='gridcell'
                      className='hidden md:col-span-1 md:flex justify-end'
                    >
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(tx);
                        }}
                        aria-label={`Inspect ${tx.id}`}
                        className='inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-colors hover:border-blue-500 hover:text-blue-500'
                      >
                        <Eye className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
