'use client';

import { useEffect, useState } from 'react';

type AsyncDataState<T> =
  | {
      status: 'loading';
      data: null;
      error: null;
    }
  | {
      status: 'success';
      data: T;
      error: null;
    }
  | {
      status: 'error';
      data: null;
      error: string;
    };

type SettledState<T> = Exclude<AsyncDataState<T>, { status: 'loading' }>;

const LOADING = { status: 'loading', data: null, error: null } as const;

function isSameRequest(a: unknown[], b: unknown[]) {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

export function useAsyncData<T>(
  load: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = [...dependencies, attempt];
  // Each result remembers the request it answers. A result for any other request
  // (new dependencies or a retry) reads as loading, so stale data is never shown.
  const [settled, setSettled] = useState<{
    requestKey: unknown[];
    state: SettledState<T>;
  } | null>(null);

  useEffect(() => {
    let isActive = true;

    async function run() {
      try {
        const data = await load();

        if (!isActive) {
          return;
        }

        setSettled({
          requestKey,
          state: { status: 'success', data, error: null },
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSettled({
          requestKey,
          state: {
            status: 'error',
            data: null,
            error:
              error instanceof Error
                ? error.message
                : 'Something went wrong.',
          },
        });
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, requestKey);

  const state: AsyncDataState<T> =
    settled && isSameRequest(settled.requestKey, requestKey)
      ? settled.state
      : LOADING;

  return {
    data: state.data,
    error: state.error,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    retry: () => setAttempt((current) => current + 1),
  };
}
