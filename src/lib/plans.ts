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
    name: "Trial",
    price: 0,
    credits: 10,
    label: "Try it out",
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 29,
    credits: 800,
    label: "A quick toast",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 109,
    credits: 8_000,
    label: "The full stack",
  },
  scale: {
    id: "scale",
    name: "Scale",
    price: 219,
    credits: 40_000,
    label: "All-you-can-eat",
  },
};

export const PAID_PLANS: PlanConfig[] = [PLANS.starter, PLANS.pro, PLANS.scale];
export const ALL_PLANS: PlanConfig[] = [PLANS.trial, ...PAID_PLANS];
