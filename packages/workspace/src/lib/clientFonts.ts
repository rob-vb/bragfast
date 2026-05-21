const WEIGHT_QUERY = "wght@400;500;600;700";
const injected = new Map<string, Promise<void>>();

export function injectGoogleFont(family: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = injected.get(family);
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${WEIGHT_QUERY}&display=swap`;
  document.head.appendChild(link);

  const ready = (async () => {
    try {
      await Promise.allSettled([
        document.fonts.load(`400 16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`),
      ]);
    } catch {
      // Font loading should not block Workspace rendering.
    }
  })();

  injected.set(family, ready);
  return ready;
}
