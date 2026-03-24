export type PlanId = "trial" | "starter" | "pro" | "scale";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // monthly USD, 0 for trial
  credits: number;
  label: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  trial: {
    id: "trial",
    name: "On the House",
    price: 0,
    credits: 10,
    label: "10 free credits",
  },
  starter: {
    id: "starter",
    name: "Toast",
    price: 29,
    credits: 800,
    label: "Quick and crispy",
  },
  pro: {
    id: "pro",
    name: "Full Plate",
    price: 109,
    credits: 8_000,
    label: "The full stack",
  },
  scale: {
    id: "scale",
    name: "Buffet",
    price: 219,
    credits: 40_000,
    label: "All-you-can-eat",
  },
};

export const PAID_PLANS: PlanConfig[] = [PLANS.starter, PLANS.pro, PLANS.scale];
export const ALL_PLANS: PlanConfig[] = [PLANS.trial, ...PAID_PLANS];
