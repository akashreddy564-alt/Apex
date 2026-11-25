/** Scrolls to an element. The page itself uses native scrolling. */
export function scrollToTarget(el: HTMLElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
