import { describe, it, expect, vi } from "vitest";

// Mock convex/nextjs fetchQuery and the generated api
vi.mock("convex/nextjs", () => ({
  fetchQuery: vi.fn(),
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    userProfiles: {
      getByUserId: "userProfiles:getByUserId",
    },
  },
}));

// Import after mocks are set up
import { fetchQuery } from "convex/nextjs";
// checkSubscriptionGate is the file under test — it does not exist yet.
// This import WILL fail until Plan 08-08 creates src/lib/auth/subscription-gate.ts.
import { checkSubscriptionGate } from "@/lib/auth/subscription-gate";

const mockFetchQuery = fetchQuery as ReturnType<typeof vi.fn>;

describe("checkSubscriptionGate", () => {
  it("active trial returns null (no gate failure)", async () => {
    const trialEnd = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
    mockFetchQuery.mockResolvedValueOnce({ plan: "trial", trialEnd });

    const result = await checkSubscriptionGate("user_001");

    expect(result).toBeNull();
  });

  it("expired trial returns 402 with subscription_required error", async () => {
    const trialEnd = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
    mockFetchQuery.mockResolvedValueOnce({ plan: "trial", trialEnd });

    const result = await checkSubscriptionGate("user_002");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(402);
    const body = await (result as Response).json();
    expect(body).toMatchObject({ error: "subscription_required" });
  });

  it("free plan returns 402 with subscription_required error", async () => {
    mockFetchQuery.mockResolvedValueOnce({ plan: "free" });

    const result = await checkSubscriptionGate("user_003");

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(402);
    const body = await (result as Response).json();
    expect(body).toMatchObject({ error: "subscription_required" });
  });

  it("active plate subscription returns null (no gate failure)", async () => {
    mockFetchQuery.mockResolvedValueOnce({ plan: "plate" });

    const result = await checkSubscriptionGate("user_004");

    expect(result).toBeNull();
  });
});
