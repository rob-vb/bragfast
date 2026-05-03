// Browser-only Google Font injector shared by the live preview and font picker.
// Loads multiple weights so per-object weight overrides render correctly.

const WEIGHT_QUERY = "wght@400;500;600;700";
const injected = new Set<string>();

export function injectGoogleFont(family: string) {
  if (typeof document === "undefined") return;
  if (injected.has(family)) return;
  injected.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${WEIGHT_QUERY}&display=swap`;
  document.head.appendChild(link);
}
