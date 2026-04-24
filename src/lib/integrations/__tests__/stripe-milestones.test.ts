import { describe, it, expect } from "vitest";
import {
  computeMrrUsd,
  lineItemMonthlyUsd,
} from "../stripe-milestones";

describe("computeMrrUsd", () => {
  it("sums monthlyUsd across active subs", () => {
    expect(
      computeMrrUsd([
        { status: "active", monthlyUsd: 20 },
        { status: "active", monthlyUsd: 50 },
        { status: "trialing", monthlyUsd: 10 },
      ]),
    ).toBe(80);
  });

  it("includes past_due (Stripe still counts it)", () => {
    expect(
      computeMrrUsd([
        { status: "past_due", monthlyUsd: 30 },
        { status: "active", monthlyUsd: 20 },
      ]),
    ).toBe(50);
  });

  it("excludes canceled / incomplete / unpaid subs", () => {
    expect(
      computeMrrUsd([
        { status: "canceled", monthlyUsd: 100 },
        { status: "incomplete", monthlyUsd: 200 },
        { status: "unpaid", monthlyUsd: 50 },
        { status: "active", monthlyUsd: 10 },
      ]),
    ).toBe(10);
  });

  it("returns 0 for empty input", () => {
    expect(computeMrrUsd([])).toBe(0);
  });
});

describe("lineItemMonthlyUsd", () => {
  it("monthly plan contributes full amount", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 2000,
        currency: "usd",
        interval: "month",
        intervalCount: 1,
        quantity: 1,
      }),
    ).toBe(20);
  });

  it("yearly plan contributes 1/12", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 24000,
        currency: "usd",
        interval: "year",
        intervalCount: 1,
        quantity: 1,
      }),
    ).toBe(20);
  });

  it("quarterly plan (month intervalCount=3) contributes 1/3", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 6000,
        currency: "usd",
        interval: "month",
        intervalCount: 3,
        quantity: 1,
      }),
    ).toBe(20);
  });

  it("weekly plan contributes 4x", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 500,
        currency: "usd",
        interval: "week",
        intervalCount: 1,
        quantity: 1,
      }),
    ).toBe(20);
  });

  it("daily plan contributes 30x", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 100,
        currency: "usd",
        interval: "day",
        intervalCount: 1,
        quantity: 1,
      }),
    ).toBe(30);
  });

  it("quantity multiplies contribution", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 1000,
        currency: "usd",
        interval: "month",
        intervalCount: 1,
        quantity: 5,
      }),
    ).toBe(50);
  });

  it("non-USD currency returns 0 (v1 limitation)", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: 2000,
        currency: "eur",
        interval: "month",
        intervalCount: 1,
        quantity: 1,
      }),
    ).toBe(0);
  });

  it("null unitAmount returns 0", () => {
    expect(
      lineItemMonthlyUsd({
        unitAmountCents: null,
        currency: "usd",
        interval: "month",
        intervalCount: 1,
        quantity: 1,
      }),
    ).toBe(0);
  });
});

