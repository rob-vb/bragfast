// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");
const USER_A = "user_device_a";

describe("deviceCodes", () => {
  it("issues split device and user codes", async () => {
    const t = convexTest(schema, modules);
    const issued = await t.mutation(api.deviceCodes.issueCode, {});

    expect(issued.device_code).toMatch(/^dc_/);
    expect(issued.user_code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(issued.expires_in).toBe(600);
    expect(issued.interval).toBe(5);
  });

  it("approve requires auth", async () => {
    const t = convexTest(schema, modules);
    const issued = await t.mutation(api.deviceCodes.issueCode, {});

    await expect(
      t.mutation(api.deviceCodes.approveCode, { user_code: issued.user_code }),
    ).rejects.toThrow(/Unauthenticated/);
  });

  it("returns pending before approval", async () => {
    const t = convexTest(schema, modules);
    const issued = await t.mutation(api.deviceCodes.issueCode, {});
    const result = await t.mutation(api.deviceCodes.exchangeToken, {
      device_code: issued.device_code,
    });

    expect(result).toEqual({ ok: false, error: "authorization_pending" });
  });

  it("denial is visible to token polling", async () => {
    const t = convexTest(schema, modules);
    const issued = await t.mutation(api.deviceCodes.issueCode, {});
    await t.withIdentity({ subject: USER_A }).mutation(api.deviceCodes.denyCode, {
      user_code: issued.user_code,
    });

    const result = await t.mutation(api.deviceCodes.exchangeToken, {
      device_code: issued.device_code,
    });
    expect(result).toEqual({ ok: false, error: "access_denied" });
  });

  it("approval exchanges once for a bf_ key", async () => {
    const t = convexTest(schema, modules);
    const issued = await t.mutation(api.deviceCodes.issueCode, {});
    await t.withIdentity({ subject: USER_A }).mutation(api.deviceCodes.approveCode, {
      user_code: issued.user_code,
    });

    const first = await t.mutation(api.deviceCodes.exchangeToken, {
      device_code: issued.device_code,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected token");
    expect(first.access_token).toMatch(/^bf_/);
    expect(first.token_type).toBe("Bearer");
    expect(first.userId).toBe(USER_A);

    const second = await t.mutation(api.deviceCodes.exchangeToken, {
      device_code: issued.device_code,
    });
    expect(second).toEqual({ ok: false, error: "expired_token" });
  });

  it("browser lookup never returns device_code", async () => {
    const t = convexTest(schema, modules);
    const issued = await t.mutation(api.deviceCodes.issueCode, {});
    const pageState = await t.query(api.deviceCodes.getByUserCode, {
      user_code: issued.user_code,
    });

    expect(pageState?.user_code).toBe(issued.user_code);
    expect(JSON.stringify(pageState)).not.toContain(issued.device_code);
  });
});
