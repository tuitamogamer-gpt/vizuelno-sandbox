import type { KeyboardEvent } from "react";

/** Index of the tab a key moves to (WAI-ARIA tabs: arrows wrap, Home and End jump), or -1 for other keys. */
export function nextTabIndex(key: string, index: number, count: number) {
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return -1;
}

/** Keyboard handler for a role="tablist" element with automatic activation. */
export function tabListKeyDown<T extends string>(event: KeyboardEvent<HTMLElement>, tabs: readonly T[], current: T, select: (tab: T) => void) {
  const next = nextTabIndex(event.key, tabs.indexOf(current), tabs.length);
  if (next < 0) return;
  event.preventDefault();
  select(tabs[next]);
  event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
}
