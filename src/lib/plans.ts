export type PlanId = "trial" | "free" | "plate";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // monthly USD, 0 for trial/free
  label: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  trial: {
    id: "trial",
    name: "On the House",
    price: 0,
    label: "14-day free trial",
  },
  free: {
    id: "free",
    name: "Free",
    price: 0,
    label: "No active subscription",
  },
  plate: {
    id: "plate",
    name: "Full Plate",
    price: 29,
    label: "$29/mo",
  },
};
