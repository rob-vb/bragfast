// S4.1: pricing-page data — outcome-denominated rows per PRD §4.
// New-tier surface (Toast/Plate/Buffet). Legacy credit data lives in src/lib/plans.ts
// and is consumed only by /admin/billing for grandfathered customers.
import { Check, X } from "lucide-react";

export type NewTierId = "toast" | "plate" | "buffet";

export interface NewTierConfig {
  id: NewTierId;
  name: string;
  price: number; // monthly USD
  label: string;
  blurb: string;
}

export const NEW_TIERS: NewTierConfig[] = [
  {
    id: "toast",
    name: "Toast",
    price: 12,
    label: "Quick and crispy",
    blurb: "200 credits — about 200 image posts or 40 videos.",
  },
  {
    id: "plate",
    name: "Full Plate",
    price: 29,
    label: "The full stack",
    blurb: "800 credits — about 800 image posts or 160 videos.",
  },
  {
    id: "buffet",
    name: "Buffet",
    price: 79,
    label: "Big appetite",
    blurb: "2,500 credits — about 2,500 image posts or 500 videos.",
  },
];

export const FEATURES: {
  name: string;
  toast?: string | boolean;
  plate?: string | boolean;
  buffet?: string | boolean;
  section?: boolean;
}[] = [
  { name: "Core", section: true },
  { name: "Credits / month", toast: "200", plate: "800", buffet: "2,500" },
  { name: "Image", toast: true, plate: true, buffet: true },
  { name: "Video", toast: true, plate: true, buffet: true },
  { name: "Landscape, square & portrait", toast: true, plate: true, buffet: true },
  { name: "Custom brand", toast: true, plate: true, buffet: true },
  { name: "Custom templates", toast: true, plate: true, buffet: true },
  { name: "Sous-Chef (agent)", toast: true, plate: true, buffet: true },
  {
    name: "History feed",
    toast: "30 days",
    plate: "1 year",
    buffet: "Forever (annual recap)",
  },
  { name: "Integrations", section: true },
  { name: "REST API", toast: true, plate: true, buffet: true },
  { name: "Webhooks", toast: true, plate: true, buffet: true },
  { name: "GitHub", toast: true, plate: true, buffet: true },
  { name: "Stripe", toast: true, plate: true, buffet: true },
  { name: "PostHog", toast: true, plate: true, buffet: true },
  { name: "Google Analytics", toast: true, plate: true, buffet: true },
  { name: "Buffer", toast: true, plate: true, buffet: true },
  { name: "Postiz", toast: true, plate: true, buffet: true },
  { name: "Support", section: true },
  { name: "Priority support", toast: false, plate: true, buffet: true },
];

export function FeatureValue({
  value,
  align = "center",
}: {
  value: string | boolean;
  align?: "center" | "right";
}) {
  const iconAlign = align === "center" ? "mx-auto" : "ml-auto";
  if (value === true)
    return <Check className={`${iconAlign} h-4 w-4 text-brand`} />;
  if (value === false)
    return <X className={`${iconAlign} h-4 w-4 text-brand/30`} />;
  return (
    <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand">
      {value}
    </span>
  );
}
