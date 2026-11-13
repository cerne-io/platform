/**
 * Lightweight debounce implementation with cancellation support.
 */
export function debounce<Args extends unknown[], Return = void>(
  fn: (...args: Args) => Return,
  delay: number
): ((...args: Args) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const debounced = (...args: Args) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      const pending = lastArgs;
      lastArgs = null;
      if (pending) fn(...pending);
    }, delay);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      const pending = lastArgs;
      lastArgs = null;
      if (pending) fn(...pending);
    }
  };

  return debounced;
}

export default debounce;
