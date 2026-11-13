import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeout } from '../useTimeout';

describe('useTimeout Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls callback after the specified delay', () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, 500));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire if delay is null', () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, null));

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('cancels the timer on unmount to prevent leaks', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useTimeout(callback, 1000));

    act(() => {
      vi.advanceTimersByTime(500);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('allows manual cancellation via clear()', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout(callback, 1000));

    act(() => {
      vi.advanceTimersByTime(500);
      result.current.clear();
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('allows manual restart via reset()', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout(callback, 1000));

    act(() => {
      vi.advanceTimersByTime(800);
      result.current.reset(); // restarts the 1000ms countdown
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
