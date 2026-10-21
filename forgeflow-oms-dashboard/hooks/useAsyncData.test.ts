import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncData } from './useAsyncData';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('useAsyncData', () => {
  it('starts loading and then exposes the loaded data', async () => {
    const { result } = renderHook(() => useAsyncData(() => Promise.resolve('a'), []));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('a'));
    expect(result.current.isSuccess).toBe(true);
  });

  it('goes back to loading, without the previous data, when dependencies change (R13)', async () => {
    const second = deferred<string>();
    const load = vi.fn((key: number) =>
      key === 1 ? Promise.resolve('page 1') : second.promise,
    );
    const { result, rerender } = renderHook(
      ({ key }) => useAsyncData(() => load(key), [key]),
      { initialProps: { key: 1 } },
    );
    await waitFor(() => expect(result.current.data).toBe('page 1'));

    rerender({ key: 2 });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await act(async () => second.resolve('page 2'));
    expect(result.current.data).toBe('page 2');
  });

  it('ignores a slow response that arrives after the dependencies changed', async () => {
    const first = deferred<string>();
    const load = vi.fn((key: number) =>
      key === 1 ? first.promise : Promise.resolve('page 2'),
    );
    const { result, rerender } = renderHook(
      ({ key }) => useAsyncData(() => load(key), [key]),
      { initialProps: { key: 1 } },
    );

    rerender({ key: 2 });
    await waitFor(() => expect(result.current.data).toBe('page 2'));
    await act(async () => first.resolve('page 1'));

    expect(result.current.data).toBe('page 2');
  });

  it('reports the error message and loads again on retry', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Server down'))
      .mockResolvedValueOnce('recovered');
    const { result } = renderHook(() => useAsyncData(load, []));
    await waitFor(() => expect(result.current.error).toBe('Server down'));

    act(() => result.current.retry());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.data).toBe('recovered'));
    expect(load).toHaveBeenCalledTimes(2);
  });
});
