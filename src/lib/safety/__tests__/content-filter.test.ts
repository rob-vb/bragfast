import { describe, it, expect } from "vitest";
import { scanContent } from "../content-filter";

describe("scanContent", () => {
  it("returns no matches for benign content", () => {
    const r = scanContent("Add dashboard widget", "Adds per-repo stats widget.");
    expect(r.blocked).toBe(false);
    expect(r.matches).toEqual([]);
  });

  it("flags security keywords on word boundaries", () => {
    const r = scanContent("Patch security vulnerability in auth", null);
    expect(r.blocked).toBe(true);
    const cats = r.matches.map((m) => m.category);
    expect(cats).toContain("security");
  });

  it("does not flag substrings inside other words", () => {
    // 'patch' should not fire on 'dispatcher'
    const r = scanContent("Refactor dispatcher", "Cleanup");
    expect(r.blocked).toBe(false);
  });

  it("flags multi-word phrases across whitespace", () => {
    const r = scanContent("Rotate API   key", "");
    expect(r.blocked).toBe(true);
    expect(r.matches.some((m) => m.term === "api key")).toBe(true);
  });

  it("flags HR/financial terms", () => {
    const r = scanContent("Update salary calculator", "");
    expect(r.blocked).toBe(true);
    expect(r.matches.some((m) => m.category === "hr_financial")).toBe(true);
  });

  it("flags confidentiality markers", () => {
    const r = scanContent("Internal only doc updates", null);
    expect(r.blocked).toBe(true);
    expect(r.matches.some((m) => m.category === "confidentiality")).toBe(true);
  });

  it("is case-insensitive", () => {
    const r = scanContent("Fix CVE-2024-1234 in TLS", "");
    expect(r.blocked).toBe(true);
  });

  it("dedupes repeated terms across inputs", () => {
    const r = scanContent("token rotation", "rotate token again");
    const tokenHits = r.matches.filter((m) => m.term === "token");
    expect(tokenHits.length).toBe(1);
  });

  it("handles null/undefined inputs", () => {
    const r = scanContent(null, undefined, "");
    expect(r.blocked).toBe(false);
  });
});
