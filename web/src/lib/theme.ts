// Light / dark appearance. The choice is stored on the device; with no choice the
// site follows the system setting. The inline script in index.astro applies it before
// first paint so the page never flashes the wrong colours.
export type Theme = "light" | "dark";
const KEY = "bhumitra.theme.v1";

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0A0A0A" : "#01271A");
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage blocked */
  }
}

/** Inline, dependency-free version for <head>. Keep in sync with the key above. */
export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${KEY}");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){}})();`;
