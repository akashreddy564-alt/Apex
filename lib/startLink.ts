/**
 * `/log?start=<trailId>` from Trail detail's slider is handled once.
 * Until the saved hike has been read, the param stays so a cold start still
 * sees it. After that read, it starts a hike on that trail unless one is
 * already recording; either way the param is cleared so it never starts twice.
 */
export function startLinkPlan(input: {
  param: string | string[] | null | undefined;
  hydrated: boolean;
  tracking: boolean;
}): { start: string | null; clear: boolean } {
  const raw = Array.isArray(input.param) ? input.param[0] : input.param;
  if (!raw) return { start: null, clear: false };
  if (!input.hydrated) return { start: null, clear: false };
  if (input.tracking) return { start: null, clear: true };
  return { start: raw, clear: true };
}
