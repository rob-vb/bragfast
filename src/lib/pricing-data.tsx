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
    blurb: "GitHub-powered, one channel, square posts.",
  },
  {
    id: "plate",
    name: "Full Plate",
    price: 29,
    label: "The full stack",
    blurb: "Three sources, every format, X + LinkedIn.",
  },
  {
    id: "buffet",
    name: "Buffet",
    price: 79,
    label: "Big appetite",
    blurb: "Unlimited sources, video, every channel.",
  },
];

export const FEATURES: {
  name: string;
  toast: string | boolean;
  plate: string | boolean;
  buffet: string | boolean;
}[] = [
  { name: "Posts / month", toast: "30", plate: "100", buffet: "500" },
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
    toast: "Square",
    plate: "Square + landscape + portrait",
    buffet: "All formats",
  },
  { name: "Video posts", toast: false, plate: false, buffet: "1 per post" },
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
