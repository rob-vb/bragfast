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
  toast: string | boolean;
  plate: string | boolean;
  buffet: string | boolean;
}[] = [
  { name: "Credits / month", toast: "200", plate: "800", buffet: "2,500" },
  {
    name: "Sources",
    toast: "1 (GitHub)",
    plate: "3 (GitHub + Stripe + PostHog/GA)",
    buffet: "Unlimited",
  },
  {
    name: "Platforms per post",
    toast: "1 (X or LinkedIn)",
    plate: "2 (X + LinkedIn)",
    buffet: "2 (X + LinkedIn)",
  },
  {
    name: "Formats per post",
    toast: "All formats",
    plate: "All formats",
    buffet: "All formats",
  },
  { name: "Video posts", toast: true, plate: true, buffet: true },
  { name: "Active goals", toast: "1", plate: "5", buffet: "Unlimited" },
  { name: "Voice calibration", toast: true, plate: true, buffet: true },
  {
    name: "History feed",
    toast: "30 days",
    plate: "1 year",
    buffet: "Forever (annual recap)",
  },
];

export function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-brand" />;
  if (value === false)
    return <X className="mx-auto h-4 w-4 text-brand/30" />;
  return (
    <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand">
      {value}
    </span>
  );
}
