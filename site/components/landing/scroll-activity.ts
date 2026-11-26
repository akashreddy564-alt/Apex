/**
 * True while the page is scrolling. Decorative canvases check this and skip
 * frames so a flick stays on the compositor instead of sharing it with a
 * full-viewport redraw.
 */
let scrolling = false;

if (typeof window !== "undefined") {
  let timer = 0;
  window.addEventListener(
    "scroll",
    () => {
      scrolling = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        scrolling = false;
      }, 140);
    },
    { passive: true },
  );
}

export function isPageScrolling() {
  return scrolling;
}
