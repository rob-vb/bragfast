import { Check, X } from "lucide-react";

export const FEATURES: {
  name: string;
  starter: string | boolean;
  pro: string | boolean;
  scale: string | boolean;
}[] = [
  { name: "Credits / month", starter: "200", pro: "800", scale: "2,500" },
  { name: "Templates", starter: "All", pro: "All", scale: "All" },
  { name: "Custom templates", starter: true, pro: true, scale: true },
  { name: "Brand kits", starter: "3", pro: "10", scale: "Unlimited" },
  { name: "Video generation", starter: true, pro: true, scale: true },
  { name: "MCP / AI skill", starter: true, pro: true, scale: true },
  { name: "AI analysis", starter: true, pro: true, scale: true },
  { name: "GitHub auto-publish", starter: true, pro: true, scale: true },
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
