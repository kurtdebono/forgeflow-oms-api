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

export function useAsyncData<T>(
  load: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const [state, setState] = useState<AsyncDataState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    async function run() {
      try {
        const data = await load();

        if (!isActive) {
          return;
        }

        setState({
          status: 'success',
          data,
          error: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          status: 'error',
          data: null,
          error:
            error instanceof Error
              ? error.message
              : 'Something went wrong.',
        });
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, dependencies);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}