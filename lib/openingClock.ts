/**
 * Opening-screen timing. `onReady` fires when the photo shows, or after
 * `readyFallbackMs` if it never reports in. `onLeave` fires on a tap, or
 * `autoContinueMs` after ready. Each fires at most once.
 *
 * `held` starts the clock paused while something plays over the screen (the
 * launch intro): taps are ignored and the auto-continue wait doesn't start
 * until `release()`, so the intro doesn't eat into the time on the photo.
 */
export function createOpeningClock(options: {
  readyFallbackMs: number;
  autoContinueMs: number;
  onReady: () => void;
  onLeave: () => void;
  held?: boolean;
}) {
  let held = options.held ?? false;
  let isReady = false;
  let hasLeft = false;
  let disposed = false;
  let autoContinue: ReturnType<typeof setTimeout> | null = null;

  const tap = () => {
    if (disposed || hasLeft || held) return;
    hasLeft = true;
    options.onLeave();
  };

  const ready = () => {
    if (disposed || isReady) return;
    isReady = true;
    options.onReady();
    if (!held) autoContinue = setTimeout(tap, options.autoContinueMs);
  };

  const release = () => {
    if (disposed || !held) return;
    held = false;
    if (isReady) autoContinue = setTimeout(tap, options.autoContinueMs);
  };

  const fallback = setTimeout(ready, options.readyFallbackMs);

  return {
    ready,
    tap,
    release,
    dispose() {
      disposed = true;
      clearTimeout(fallback);
      if (autoContinue) clearTimeout(autoContinue);
    },
  };
}
