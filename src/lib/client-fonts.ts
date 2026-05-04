// Browser-only Google Font injector shared by the live preview and font picker.
// Loads multiple weights so per-object weight overrides render correctly.

const WEIGHT_QUERY = "wght@400;500;600;700";
const injected = new Map<string, Promise<void>>();

/**
 * Inject a Google Font stylesheet and resolve once the font face is actually
 * loaded into `document.fonts`. The returned promise lets callers force a
 * re-render after the font is ready — without it, the first paint uses the
 * fallback face and never repaints because no React state has changed (which
 * is why Press Start 2P was showing as Plus Jakarta Sans in the kitchen
 * preview). Idempotent per family.
 */
export function injectGoogleFont(family: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = injected.get(family);
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${WEIGHT_QUERY}&display=swap`;
  document.head.appendChild(link);

  // Force the browser to actually fetch the file (not just register the
  // @font-face). document.fonts.load probes every weight; we just need any to
  // resolve before signaling ready.
  const ready = (async () => {
    try {
      await Promise.allSettled([
        document.fonts.load(`400 16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`),
      ]);
    } catch {
      // ignore — caller treats as ready either way
    }
  })();

  injected.set(family, ready);
  return ready;
}
