/**
 * Opening-screen timing. `onReady` fires when the photo shows, or after
 * `readyFallbackMs` if it never reports in. `onLeave` fires on a tap, or
 * `autoContinueMs` after ready. Each fires at most once.
 */
export function createOpeningClock(options: {
  readyFallbackMs: number;
  autoContinueMs: number;
  onReady: () => void;
  onLeave: () => void;
}) {
  let isReady = false;
  let hasLeft = false;
  let disposed = false;
  let autoContinue: ReturnType<typeof setTimeout> | null = null;

  const tap = () => {
    if (disposed || hasLeft) return;
    hasLeft = true;
    options.onLeave();
  };

  const ready = () => {
    if (disposed || isReady) return;
    isReady = true;
    options.onReady();
    autoContinue = setTimeout(tap, options.autoContinueMs);
  };

  const fallback = setTimeout(ready, options.readyFallbackMs);

  return {
    ready,
    tap,
    dispose() {
      disposed = true;
      clearTimeout(fallback);
      if (autoContinue) clearTimeout(autoContinue);
    },
  };
}
