export type RecordingLinkAction = 'pause' | 'finish';

/**
 * A Pause or Finish link is handled once.
 * Until the saved hike has been read, the param stays so a cold start can
 * still open the sheet. After that read, a hike runs the action and the param
 * is cleared. No hike drops the param so the next recording does not inherit it.
 */
export function recordingLinkPlan(input: {
  param: string | null | undefined;
  hydrated: boolean;
  tracking: boolean;
}): { action: RecordingLinkAction | null; clear: boolean } {
  const param = input.param;
  if (param !== 'pause' && param !== 'finish') {
    return { action: null, clear: false };
  }
  if (!input.hydrated) {
    return { action: null, clear: false };
  }
  if (!input.tracking) {
    return { action: null, clear: true };
  }
  return { action: param, clear: true };
}
