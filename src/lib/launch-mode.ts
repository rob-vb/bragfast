/**
 * Launch-mode flag for the brag.fast repositioning rollout (PRD.md §14).
 * Big-bang launch: everything on `repos/launch` branch ships behind this flag.
 * Production stays on `legacy` until the explicit launch merge to main.
 */

export type LaunchMode = "legacy" | "repositioned";

export function getLaunchMode(): LaunchMode {
  const value = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  return value === "repositioned" ? "repositioned" : "legacy";
}

export function isLaunchModeRepositioned(): boolean {
  return getLaunchMode() === "repositioned";
}
