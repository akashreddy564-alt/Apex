/**
 * Whether Log should start recording a trail handed over from Trail detail's
 * slider (an in-app pending request, never a URL param). It starts only for a
 * trail we know, once the saved hike has been read, and never on top of a hike
 * that is already recording.
 */
export function startPlan(input: {
  pending: string | null;
  knownIds: ReadonlySet<string>;
  hydrated: boolean;
  tracking: boolean;
}): { start: string | null } {
  const { pending } = input;
  if (!pending || !input.hydrated || input.tracking || !input.knownIds.has(pending)) {
    return { start: null };
  }
  return { start: pending };
}
