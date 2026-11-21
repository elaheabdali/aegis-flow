'use client';

import { useCallback, useState, type KeyboardEvent } from 'react';
import type { Transaction } from '@/types/domain';

interface UseGridKeyboardNavOptions {
  readonly transactions: readonly Transaction[];
  readonly onInspect: (tx: Transaction) => void;
  readonly onTogglePause: () => void;
  readonly scrollToIndex: (index: number) => void;
}

export function useGridKeyboardNav({
  transactions,
  onInspect,
  onTogglePause,
  scrollToIndex,
}: UseGridKeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const safeFocusedIndex =
    transactions.length === 0
      ? -1
      : Math.min(focusedIndex, transactions.length - 1);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (transactions.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = Math.min(transactions.length - 1, safeFocusedIndex + 1);
        setFocusedIndex(next);
        scrollToIndex(next);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = Math.max(0, safeFocusedIndex - 1);
        setFocusedIndex(prev);
        scrollToIndex(prev);
      } else if (event.key === 'Enter') {
        const target = transactions[safeFocusedIndex];
        if (target) {
          event.preventDefault();
          onInspect(target);
        }
      } else if (event.key === ' ') {
        event.preventDefault();
        onTogglePause();
      }
    },
    [transactions, safeFocusedIndex, scrollToIndex, onInspect, onTogglePause]
  );

  return {
    focusedIndex: safeFocusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}