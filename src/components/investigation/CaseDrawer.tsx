'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  FileWarning,
  Fingerprint,
  History,
  Lock,
  ShieldAlert,
  ShieldX,
  X,
} from 'lucide-react';
import { getDirection, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import {
  formatIranianCurrency,
  formatJalaliDateTime,
  formatNumber,
  formatTime,
} from '@/i18n/formatters';
import { getDrawerSlideOffset, TELEMETRY_SPRING } from '@/lib/motion';
import {
  formatCardDisplay,
  formatIbanDisplay,
  formatNationalIdDisplay,
  isValidIranianNationalId,
  maskIpAddress,
} from '@/features/security/pii-masker';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type { Transaction } from '@/types/domain';

interface CaseDrawerProps {
  readonly locale: Locale;
  readonly dict: Dictionary;
  readonly onOpenWizard: (tx: Transaction) => void;
}

export function CaseDrawer({ locale, dict, onOpenWizard }: CaseDrawerProps) {
  const dir = getDirection(locale);
  const selectedTxId = useWorkbenchStore((s) => s.selectedTxId);
  const selectTransaction = useWorkbenchStore((s) => s.selectTransaction);
  const transactions = useWorkbenchStore((s) => s.transactions);
  const pendingQueue = useWorkbenchStore((s) => s.pendingQueue);
  const activeRole = useWorkbenchStore((s) => s.activeRole);
  const currency = useWorkbenchStore((s) => s.currency);
  const auditLogs = useWorkbenchStore((s) => s.auditLogs);
  const addAuditLog = useWorkbenchStore((s) => s.addAuditLog);

  const [unmaskedForTxId, setUnmaskedForTxId] = useState<string | null>(null);

  const selectedTx =
    transactions.find((t) => t.id === selectedTxId) ??
    pendingQueue.find((t) => t.id === selectedTxId) ??
    null;

  const isPiiRevealed = Boolean(
    selectedTx && unmaskedForTxId === selectedTx.id
  );

  const handleCloseDrawer = () => {
    setUnmaskedForTxId(null);
    selectTransaction(null);
  };

  useEffect(() => {
    if (!selectedTx) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUnmaskedForTxId(null);
        selectTransaction(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTx, selectTransaction]);

  const handleTogglePii = () => {
    if (!selectedTx) return;
    const nextState = !isPiiRevealed;
    setUnmaskedForTxId(nextState ? selectedTx.id : null);

    if (nextState) {
      addAuditLog({
        actorRole: activeRole,
        action: 'PII_UNMASKED',
        targetId: selectedTx.id,
        reason: 'Revealed Shetab PAN, IBAN, and Iranian National ID during review',
      });
    }
  };

  const slideOffset = getDrawerSlideOffset(dir);
  const isAlreadyActioned =
    selectedTx?.status === 'frozen' || selectedTx?.status === 'reported_sar';

  return (
    <AnimatePresence>
      {selectedTx && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleCloseDrawer}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Direction-Aware Slide Drawer */}
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={dict.drawer.title}
            initial={{ opacity: 0, x: slideOffset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideOffset }}
            transition={TELEMETRY_SPRING}
            className="fixed inset-y-0 end-0 z-50 flex w-full max-w-xl flex-col border-s border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    dir="ltr"
                    className="font-mono text-base font-bold text-[var(--text-primary)]"
                  >
                    {selectedTx.id}
                  </span>
                  <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-500">
                    {dict.workbench.statuses[selectedTx.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {dict.drawer.title} • {formatJalaliDateTime(selectedTx.timestamp, locale)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDrawer}
                aria-label={dict.drawer.close}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Telemetry & Shaparak Summary */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 p-4">
                <div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {dict.workbench.columns.merchant}
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                    {locale === 'fa'
                      ? selectedTx.merchantNameFa
                      : selectedTx.merchantNameEn}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {locale === 'fa'
                      ? selectedTx.accountHolderFa
                      : selectedTx.accountHolderEn}{' '}
                    ({dict.banks[selectedTx.bankId]})
                  </p>
                </div>
                <div className="text-end">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {dict.workbench.columns.amount}
                  </span>
                  <p className="mt-0.5 text-base font-bold text-[var(--text-primary)] tabular-nums">
                    {formatIranianCurrency(selectedTx.amountIrt, currency, locale)}
                  </p>
                  <p className="text-xs font-semibold text-rose-500">
                    {dict.workbench.columns.riskScore}:{' '}
                    {formatNumber(selectedTx.riskScore, locale)} /{' '}
                    {formatNumber(100, locale)}
                  </p>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-2.5">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {dict.drawer.rrnLabel}
                  </span>
                  <p
                    dir="ltr"
                    className="mt-0.5 text-start font-mono text-xs font-semibold text-[var(--text-primary)]"
                  >
                    {selectedTx.shaparakRrn}
                  </p>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-2.5 text-end">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {dict.drawer.shahkarLabel}
                  </span>
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold">
                    {selectedTx.shahkarVerified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {dict.drawer.shahkarVerified}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500">
                        <ShieldX className="h-3.5 w-3.5" />
                        {dict.drawer.shahkarFailed}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Risk Factors Breakdown */}
              <div className="space-y-2.5">
                <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--text-secondary)]">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  <span>{dict.drawer.riskBreakdown}</span>
                </h3>

                {selectedTx.factors.length === 0 ? (
                  <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 p-3 text-xs text-[var(--text-muted)]">
                    {dict.drawer.noFactors}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedTx.factors.map((factor) => (
                      <li
                        key={factor.code}
                        className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 text-[var(--text-primary)]">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                          <span>{dict.factors[factor.labelKey]}</span>
                        </div>
                        <span
                          dir="ltr"
                          className="shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-500"
                        >
                          +{formatNumber(factor.weight, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Protected Iranian Banking & Identity PII Section */}
              <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                    <span>{dict.drawer.piiSection}</span>
                  </h3>

                  <button
                    type="button"
                    onClick={handleTogglePii}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--surface-card)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-blue-500"
                  >
                    {isPiiRevealed ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                        <span>{dict.drawer.maskBtn}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        <span>{dict.drawer.unmaskBtn}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {/* Shetab Card Number */}
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {dict.drawer.cardNumber}
                    </span>
                    <p
                      dir="ltr"
                      className="mt-1 text-start font-mono text-xs font-semibold text-[var(--text-primary)]"
                    >
                      {formatCardDisplay(
                        selectedTx.maskedCardNumber,
                        selectedTx.rawCardNumber,
                        isPiiRevealed
                      )}
                    </p>
                  </div>

                  {/* National ID (Code Melli) */}
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {dict.drawer.nationalId}
                      </span>
                      {isValidIranianNationalId(selectedTx.rawNationalId) && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                          {dict.drawer.nationalIdValid}
                        </span>
                      )}
                    </div>
                    <p
                      dir="ltr"
                      className="mt-1 text-start font-mono text-xs font-semibold text-[var(--text-primary)]"
                    >
                      {formatNationalIdDisplay(
                        selectedTx.maskedNationalId,
                        selectedTx.rawNationalId,
                        isPiiRevealed
                      )}
                    </p>
                  </div>

                  {/* Sheba / IBAN */}
                  <div className="sm:col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {dict.drawer.ibanNumber}
                    </span>
                    <p
                      dir="ltr"
                      className="mt-1 text-start font-mono text-xs font-semibold text-[var(--text-primary)]"
                    >
                      {formatIbanDisplay(
                        selectedTx.maskedIban,
                        selectedTx.rawIban,
                        isPiiRevealed
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Fingerprint className="h-3.5 w-3.5" />
                    {dict.drawer.deviceFp}:{' '}
                    <code dir="ltr" className="font-mono text-[var(--text-secondary)]">
                      {selectedTx.deviceFingerprint}
                    </code>
                  </span>
                  <span dir="ltr" className="font-mono">
                    IP: {maskIpAddress(selectedTx.ipAddress, isPiiRevealed)}
                  </span>
                </div>

                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {dict.drawer.piiWarning}
                </p>
              </div>

              {/* Immutable Session Audit Log */}
              <div className="space-y-2.5">
                <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-[var(--text-secondary)]">
                  <History className="h-4 w-4 text-blue-500" />
                  <span>{dict.drawer.auditSection}</span>
                </h3>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    {dict.drawer.auditEmpty}
                  </p>
                ) : (
                  <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 p-2.5">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-2 rounded bg-[var(--surface-card)] px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="truncate">
                          <span className="font-mono font-semibold text-blue-500">
                            {log.action}
                          </span>{' '}
                          <span className="font-mono text-[var(--text-secondary)]">
                            ({log.targetId})
                          </span>
                        </div>
                        <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                          {formatTime(log.timestamp, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 p-4">
              {activeRole === 'junior_analyst' && (
                <p className="mb-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  {dict.drawer.rbacNotice}
                </p>
              )}

              {isAlreadyActioned ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{dict.drawer.alreadyActioned}</span>
                </div>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenWizard(selectedTx)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-colors hover:bg-rose-500"
                >
                  <FileWarning className="h-4 w-4" />
                  <span>{dict.drawer.launchWizardBtn}</span>
                </motion.button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}