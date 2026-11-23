"use client";

import { type CueName, createUISFX, type UISFXPlayer } from "uisfx";

/**
 * Interface sounds from UI SFX (MIT code, CC0 audio), "zen" pack: paper folds,
 * soft brush and warm wood, like a map being unfolded. Off until the visitor
 * turns sound on; the choice is remembered on their device.
 */
let player: UISFXPlayer | null = null;
const KEY = "apex-landing:sound";
const listeners = new Set<(on: boolean) => void>();

function get() {
  if (typeof window === "undefined") return null;
  if (!player) {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(KEY);
    } catch {}
    player = createUISFX({ pack: "zen", volume: 0.55, enabled: stored === "on" });
  }
  return player;
}

export function soundOn() {
  return get()?.isEnabled() ?? false;
}

export async function setSound(on: boolean) {
  const p = get();
  if (!p) return;
  p.setEnabled(on);
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (on) {
    await p.unlock();
    p.play("toggle-on");
  }
  for (const l of listeners) l(on);
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Plays a cue when sound is on; silent and free otherwise. */
export function sfx(cue: CueName) {
  const p = get();
  if (!p?.isEnabled()) return;
  p.play(cue);
}
