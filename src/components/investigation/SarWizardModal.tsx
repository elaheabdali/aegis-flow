'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Loader2,
  ShieldBan,
  X,
} from 'lucide-react';
import { getDirection, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { formatIranianCurrency } from '@/i18n/formatters';
import { getStepSlideOffset, SMOOTH_EASE, TELEMETRY_SPRING } from '@/lib/motion';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type { FraudTypology, Transaction, TransactionStatus } from '@/types/domain';

interface SarWizardModalProps {
  readonly transaction: Transaction | null;
  readonly locale: Locale;
  readonly dict: Dictionary;
  readonly onClose: () => void;
  readonly onNotify: (message: string, variant: 'success' | 'error') => void;
}

function createSarSchema(dict: Dictionary) {
  return z
    .object({
      actionType: z.enum(['freeze_and_sar', 'sar_only']),
      evidenceConfirmed: z.boolean().refine((v) => v === true, {
        message: dict.wizard.validation.evidenceRequired,
      }),
      typology: z.enum([
        'rented_mule_account',
        'shetab_structuring',
        'shahkar_identity_mismatch',
        'illegal_betting_gateway',
        'account_takeover_vpn',
      ]),
      splitCount: z.string().optional(),
      linkedMuleCount: z.string().optional(),
      analystNotes: z
        .string()
        .min(15, { message: dict.wizard.validation.notesMin }),
      amlVerified: z.boolean().refine((v) => v === true, {
        message: dict.wizard.validation.checklistRequired,
      }),
      kycCrossChecked: z.boolean().refine((v) => v === true, {
        message: dict.wizard.validation.checklistRequired,
      }),
      chainOfCustody: z.boolean().refine((v) => v === true, {
        message: dict.wizard.validation.checklistRequired,
      }),
      faultSimulation: z.enum(['none', 'server_error', 'timeout']),
      digitalSignature: z
        .string()
        .min(3, { message: dict.wizard.validation.signatureMin }),
    })
    .superRefine((val, ctx) => {
      if (val.typology === 'shetab_structuring') {
        const count = Number(val.splitCount);
        if (!val.splitCount || Number.isNaN(count) || count < 2) {
          ctx.addIssue({
            code: 'custom',
            path: ['splitCount'],
            message: dict.wizard.validation.splitCountRequired,
          });
        }
      }
      if (val.typology === 'rented_mule_account') {
        const accounts = Number(val.linkedMuleCount);
        if (!val.linkedMuleCount || Number.isNaN(accounts) || accounts < 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['linkedMuleCount'],
            message: dict.wizard.validation.muleAccountsRequired,
          });
        }
      }
    });
}

type SarFormValues = z.infer<ReturnType<typeof createSarSchema>>;

export function SarWizardModal({
  transaction,
  locale,
  dict,
  onClose,
  onNotify,
}: SarWizardModalProps) {
  const dir = getDirection(locale);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepDelta, setStepDelta] = useState<number>(1);

  const activeRole = useWorkbenchStore((s) => s.activeRole);
  const currency = useWorkbenchStore((s) => s.currency);
  const updateTransactionStatus = useWorkbenchStore(
    (s) => s.updateTransactionStatus
  );
  const addAuditLog = useWorkbenchStore((s) => s.addAuditLog);

  const isJuniorAnalyst = activeRole === 'junior_analyst';

  const schema = createSarSchema(dict);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SarFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      actionType: isJuniorAnalyst ? 'sar_only' : 'freeze_and_sar',
      evidenceConfirmed: false,
      typology: 'shetab_structuring',
      splitCount: '4',
      linkedMuleCount: '3',
      analystNotes: '',
      amlVerified: false,
      kycCrossChecked: false,
      chainOfCustody: false,
      faultSimulation: 'none',
      digitalSignature: '',
    },
  });

  const watchedTypology = watch('typology');
  const watchedActionType = watch('actionType');

  const mutation = useMutation({
    mutationFn: async (values: SarFormValues) => {
      if (!transaction) throw new Error('NO_ACTIVE_TRANSACTION');

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2800);

      try {
        const res = await fetch('/api/sar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-aegis-csrf': 'aegis-workbench-client',
          },
          body: JSON.stringify({
            transactionId: transaction.id,
            actionType: values.actionType,
            typology: values.typology,
            analystNotes: values.analystNotes,
            digitalSignature: values.digitalSignature,
            faultSimulation: values.faultSimulation,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errData.error ?? `HTTP_${res.status}`);
        }

        return res.json();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('CLIENT_TIMEOUT_EXCEEDED');
        }
        throw err;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    onMutate: async (values) => {
      if (!transaction) return { previousStatus: 'flagged' as TransactionStatus };
      const previousStatus = transaction.status;
      const optimisticStatus: TransactionStatus =
        values.actionType === 'freeze_and_sar' ? 'frozen' : 'reported_sar';

      updateTransactionStatus(transaction.id, optimisticStatus);
      return { previousStatus };
    },
    onSuccess: (_data, values) => {
      if (!transaction) return;
      addAuditLog({
        actorRole: activeRole,
        action:
          values.actionType === 'freeze_and_sar'
            ? 'ACCOUNT_FROZEN'
            : 'SAR_SUBMITTED',
        targetId: transaction.id,
        reason: `Filed FIU report (${values.typology}) signed by ${values.digitalSignature}`,
      });
      onNotify(dict.wizard.feedback.optimisticSuccess, 'success');
      onClose();
    },
    onError: (error, _values, context) => {
      if (transaction && context?.previousStatus) {
        updateTransactionStatus(transaction.id, context.previousStatus);
      }
      const reason = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      onNotify(
        dict.wizard.feedback.rollbackError.replace('{reason}', reason),
        'error'
      );
    },
  });

  if (!transaction) return null;

  const handleNextStep = async () => {
    let valid = false;
    if (step === 1) {
      valid = await trigger(['actionType', 'evidenceConfirmed']);
    } else if (step === 2) {
      valid = await trigger([
        'typology',
        'splitCount',
        'linkedMuleCount',
        'analystNotes',
      ]);
    } else if (step === 3) {
      valid = await trigger([
        'amlVerified',
        'kycCrossChecked',
        'chainOfCustody',
      ]);
    }

    if (valid && step < 4) {
      setStepDelta(1);
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStepDelta(-1);
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const onSubmit = (values: SarFormValues) => {
    mutation.mutate(values);
  };

  const typologies: readonly FraudTypology[] = [
    'shetab_structuring',
    'rented_mule_account',
    'shahkar_identity_mismatch',
    'illegal_betting_gateway',
    'account_takeover_vpn',
  ];

  const stepSlideOffset = getStepSlideOffset(dir, stepDelta);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dict.wizard.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={TELEMETRY_SPRING}
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
              <ShieldBan className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {dict.wizard.title}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {dict.wizard.subtitle} •{' '}
                <span dir="ltr" className="font-mono font-semibold text-blue-500">
                  {transaction.id}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict.wizard.actions.cancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        <div className="grid grid-cols-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 px-6 py-3">
          {([1, 2, 3, 4] as const).map((stepNum) => {
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={stepNum} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-muted)]'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
                </span>
                <span
                  className={`hidden truncate text-xs font-medium sm:inline ${
                    isCurrent
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {dict.wizard.steps[stepNum]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="min-h-[310px] overflow-hidden p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: stepSlideOffset }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -stepSlideOffset }}
                transition={SMOOTH_EASE}
                className="space-y-4"
              >
                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      {dict.wizard.step1.actionLabel}
                    </label>

                    <div className="space-y-2.5">
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                          isJuniorAnalyst
                            ? 'cursor-not-allowed border-[var(--border-subtle)] opacity-50'
                            : watchedActionType === 'freeze_and_sar'
                              ? 'border-rose-500 bg-rose-500/10'
                              : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40'
                        }`}
                      >
                        <input
                          type="radio"
                          value="freeze_and_sar"
                          disabled={isJuniorAnalyst}
                          {...register('actionType')}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            {dict.wizard.step1.freezeAndSar}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                            {dict.wizard.step1.freezeAndSarDesc}
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                          watchedActionType === 'sar_only'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40'
                        }`}
                      >
                        <input
                          type="radio"
                          value="sar_only"
                          {...register('actionType')}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            {dict.wizard.step1.sarOnly}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                            {dict.wizard.step1.sarOnlyDesc}
                          </div>
                        </div>
                      </label>
                    </div>

                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 p-3 text-xs text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        {...register('evidenceConfirmed')}
                        className="mt-0.5"
                      />
                      <span>{dict.wizard.step1.confirmEvidence}</span>
                    </label>
                    {errors.evidenceConfirmed && (
                      <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.evidenceConfirmed.message}
                      </p>
                    )}
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <div>
                      <label
                        htmlFor="typology-select"
                        className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                      >
                        {dict.wizard.step2.typologyLabel}
                      </label>
                      <select
                        id="typology-select"
                        {...register('typology')}
                        className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                      >
                        {typologies.map((typ) => (
                          <option key={typ} value={typ}>
                            {dict.wizard.step2.typologies[typ]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {watchedTypology === 'shetab_structuring' && (
                      <div>
                        <label
                          htmlFor="split-count-input"
                          className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                        >
                          {dict.wizard.step2.splitCountLabel}
                        </label>
                        <input
                          id="split-count-input"
                          type="text"
                          dir="ltr"
                          placeholder={dict.wizard.step2.splitCountPlaceholder}
                          {...register('splitCount')}
                          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 font-mono text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                        />
                        {errors.splitCount && (
                          <p role="alert" className="mt-1 text-xs text-rose-500">
                            {errors.splitCount.message}
                          </p>
                        )}
                      </div>
                    )}

                    {watchedTypology === 'rented_mule_account' && (
                      <div>
                        <label
                          htmlFor="mule-count-input"
                          className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                        >
                          {dict.wizard.step2.muleAccountsLabel}
                        </label>
                        <input
                          id="mule-count-input"
                          type="text"
                          dir="ltr"
                          placeholder={dict.wizard.step2.muleAccountsPlaceholder}
                          {...register('linkedMuleCount')}
                          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 font-mono text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                        />
                        {errors.linkedMuleCount && (
                          <p role="alert" className="mt-1 text-xs text-rose-500">
                            {errors.linkedMuleCount.message}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="notes-input"
                        className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                      >
                        {dict.wizard.step2.notesLabel}
                      </label>
                      <textarea
                        id="notes-input"
                        rows={3}
                        placeholder={dict.wizard.step2.notesPlaceholder}
                        {...register('analystNotes')}
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                      />
                      {errors.analystNotes && (
                        <p role="alert" className="mt-1 text-xs text-rose-500">
                          {errors.analystNotes.message}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">
                      {dict.wizard.step3.checklistTitle}
                    </h3>

                    {(
                      [
                        {
                          name: 'amlVerified',
                          label: dict.wizard.step3.amlVerified,
                        },
                        {
                          name: 'kycCrossChecked',
                          label: dict.wizard.step3.kycCrossChecked,
                        },
                        {
                          name: 'chainOfCustody',
                          label: dict.wizard.step3.chainOfCustody,
                        },
                      ] as const
                    ).map((item) => (
                      <label
                        key={item.name}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 p-3.5 text-xs text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                      >
                        <input
                          type="checkbox"
                          {...register(item.name)}
                          className="mt-0.5"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}

                    {(errors.amlVerified ||
                      errors.kycCrossChecked ||
                      errors.chainOfCustody) && (
                      <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {dict.wizard.validation.checklistRequired}
                      </p>
                    )}
                  </div>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 p-3.5 text-xs">
                      <div className="font-bold text-[var(--text-primary)]">
                        {dict.wizard.step4.summaryTitle}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[var(--text-secondary)]">
                        <div>
                          TX:{' '}
                          <span dir="ltr" className="font-mono font-semibold text-[var(--text-primary)]">
                            {transaction.id}
                          </span>
                        </div>
                        <div className="text-end font-semibold text-[var(--text-primary)]">
                          {formatIranianCurrency(
                            transaction.amountIrt,
                            currency,
                            locale
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="font-semibold text-blue-500">
                            {dict.wizard.step2.typologies[watchedTypology]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="fault-select"
                        className="mb-1.5 block text-xs font-bold text-amber-500"
                      >
                        {dict.wizard.step4.faultSimulatorLabel}
                      </label>
                      <select
                        id="fault-select"
                        {...register('faultSimulation')}
                        className="h-9 w-full rounded-lg border border-amber-500/30 bg-[var(--surface-elevated)] px-3 text-xs text-[var(--text-primary)] focus:border-amber-500 focus:outline-none"
                      >
                        <option value="none">{dict.wizard.step4.faultNone}</option>
                        <option value="server_error">{dict.wizard.step4.faultServer}</option>
                        <option value="timeout">{dict.wizard.step4.faultTimeout}</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="signature-input"
                        className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                      >
                        {dict.wizard.step4.signatureLabel}
                      </label>
                      <input
                        id="signature-input"
                        type="text"
                        placeholder={dict.wizard.step4.signaturePlaceholder}
                        {...register('digitalSignature')}
                        className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                      />
                      {errors.digitalSignature && (
                        <p role="alert" className="mt-1 text-xs text-rose-500">
                          {errors.digitalSignature.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 px-6 py-3.5">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50"
              >
                {dir === 'rtl' ? (
                  <ArrowRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowLeft className="h-3.5 w-3.5" />
                )}
                <span>{dict.wizard.actions.back}</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <span>{dict.wizard.actions.next}</span>
                {dir === 'rtl' ? (
                  <ArrowLeft className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-500 disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{dict.wizard.actions.submitting}</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>{dict.wizard.actions.submit}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}