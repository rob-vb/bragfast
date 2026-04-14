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
    credits: 30,
    label: "30 free credits",
  },
  starter: {
    id: "starter",
    name: "Toast",
    price: 12,
    credits: 200,
    label: "Quick and crispy",
  },
  pro: {
    id: "pro",
    name: "Full Plate",
    price: 29,
    credits: 800,
    label: "The full stack",
  },
  scale: {
    id: "scale",
    name: "Buffet",
    price: 79,
    credits: 2_500,
    label: "All-you-can-eat",
  },
};

export const PAID_PLANS: PlanConfig[] = [PLANS.starter, PLANS.pro, PLANS.scale];
export const ALL_PLANS: PlanConfig[] = [PLANS.trial, ...PAID_PLANS];
