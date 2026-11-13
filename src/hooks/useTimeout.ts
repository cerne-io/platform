import { useCallback, useEffect, useRef } from "react";

/**
 * Custom hook for managing a setTimeout timer with automatic cleanup on unmount
 * or when delay changes.
 *
 * @param callback Function to be called after the timeout fires
 * @param delay Delay in milliseconds. If null, the timer is disabled.
 * @returns Object with `reset` and `clear` functions to control the timer imperatively.
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remember the latest callback if it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    if (delay !== null) {
      timerRef.current = setTimeout(() => {
        savedCallback.current();
      }, delay);
    }
  }, [clear, delay]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    timerRef.current = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delay]);

  return { reset, clear };
}
