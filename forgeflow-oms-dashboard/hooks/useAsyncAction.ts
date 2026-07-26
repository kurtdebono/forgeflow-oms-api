'use client';

import { useState } from 'react';

type UseAsyncActionOptions<TResult> = {
  onSuccess?: (result: TResult) => void;
  errorMessage?: string;
};

export function useAsyncAction<TResult>(
  action: () => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await action();
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : options.errorMessage ?? 'Action failed.',
      );

      return null;
    } finally {
      setIsExecuting(false);
    }
  }

  return {
    execute,
    isExecuting,
    error,
  };
}