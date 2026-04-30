// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_A = "user_oauth_a";
const USER_B = "user_oauth_b";

describe("oauthState — S0.4b auth gating", () => {
  it("issueStateAction requires auth", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.oauthState.issueStateAction, {
        provider: "buffer",
        state: "nonce_anon",
      }),
    ).rejects.toThrow(/Unauthenticated/);
  });

  it("issueStateAction binds nonce to authed userId (cannot forge)", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: USER_A }).mutation(
      api.oauthState.issueStateAction,
      { provider: "buffer", state: "nonce_a" },
    );

    // User B consumes — should be rejected (state belongs to A).
    await expect(
      t.withIdentity({ subject: USER_B }).mutation(
        api.oauthState.consumeStateAction,
        { state: "nonce_a" },
      ),
    ).rejects.toThrow(/state mismatch/i);
  });

  it("consumeStateAction requires auth", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: USER_A }).mutation(
      api.oauthState.issueStateAction,
      { provider: "buffer", state: "nonce_anon_c" },
    );
    await expect(
      t.mutation(api.oauthState.consumeStateAction, {
        state: "nonce_anon_c",
      }),
    ).rejects.toThrow(/Unauthenticated/);
  });

  it("happy path — owner consumes own nonce", async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity({ subject: USER_A });
    await asA.mutation(api.oauthState.issueStateAction, {
      provider: "buffer",
      state: "nonce_happy",
    });
    const result = await asA.mutation(api.oauthState.consumeStateAction, {
      state: "nonce_happy",
    });
    expect(result).toEqual({ userId: USER_A, provider: "buffer" });
  });

  it("nonce is single-use even on success", async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity({ subject: USER_A });
    await asA.mutation(api.oauthState.issueStateAction, {
      provider: "buffer",
      state: "nonce_once",
    });
    await asA.mutation(api.oauthState.consumeStateAction, {
      state: "nonce_once",
    });
    const second = await asA.mutation(api.oauthState.consumeStateAction, {
      state: "nonce_once",
    });
    expect(second).toBeNull();
  });
});
