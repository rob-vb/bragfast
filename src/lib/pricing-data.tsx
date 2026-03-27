import { Check, X } from "lucide-react";

export const FEATURES: {
  name: string;
  starter: string | boolean;
  pro: string | boolean;
  scale: string | boolean;
}[] = [
  { name: "API credits / month", starter: "800", pro: "8,000", scale: "40,000" },
  { name: "Image credits", starter: "1 / slide", pro: "1 / slide", scale: "1 / slide" },
  { name: "Video credits", starter: "15 / slide", pro: "15 / slide", scale: "15 / slide" },
  { name: "Templates", starter: "All", pro: "All", scale: "All" },
  { name: "Custom templates", starter: true, pro: true, scale: true },
  { name: "Brand kits", starter: "3", pro: "10", scale: "Unlimited" },
  { name: "Video generation", starter: true, pro: true, scale: true },
  { name: "GitHub integration", starter: true, pro: true, scale: true },
  { name: "AI analysis", starter: true, pro: true, scale: true },
  { name: "Webhooks", starter: true, pro: true, scale: true },
  { name: "API rate limit", starter: "30/min", pro: "60/min", scale: "120/min" },
  { name: "CDN image hosting", starter: true, pro: true, scale: true },
  { name: "Priority support", starter: false, pro: true, scale: true },
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
