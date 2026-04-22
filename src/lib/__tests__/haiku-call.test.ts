import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import { callHaikuText, callHaikuJson } from "../haiku-call";

beforeEach(() => {
  mockCreate.mockReset();
});

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("callHaikuText", () => {
  it("returns the text content of the first block", async () => {
    mockCreate.mockResolvedValue(textResponse("hello world"));
    const result = await callHaikuText({ system: "s", user: "u" });
    expect(result).toBe("hello world");
  });

  it("returns empty string when first content block is not text", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "tool_use" }] });
    const result = await callHaikuText({ system: "s", user: "u" });
    expect(result).toBe("");
  });

  it("throws when the SDK throws", async () => {
    mockCreate.mockRejectedValue(new Error("boom"));
    await expect(
      callHaikuText({ system: "s", user: "u" }),
    ).rejects.toThrow("boom");
  });

  it("passes maxTokens through (default 1024)", async () => {
    mockCreate.mockResolvedValue(textResponse("ok"));
    await callHaikuText({ system: "s", user: "u" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 1024 }),
    );

    mockCreate.mockClear();
    await callHaikuText({ system: "s", user: "u", maxTokens: 512 });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 512 }),
    );
  });
});

describe("callHaikuJson", () => {
  const Schema = z.object({ title: z.string(), count: z.number() });
  const FALLBACK = { title: "", count: 0 };

  it("returns typed data for a valid JSON response", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"Hello","count":42}'),
    );
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: Schema,
      fallback: FALLBACK,
    });
    expect(result).toEqual({ title: "Hello", count: 42 });
  });

  it("extracts JSON from prose-wrapped text", async () => {
    mockCreate.mockResolvedValue(
      textResponse('Sure thing: {"title":"H","count":1} — hope that helps!'),
    );
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: Schema,
      fallback: FALLBACK,
    });
    expect(result).toEqual({ title: "H", count: 1 });
  });

  it("returns fallback when no JSON object appears in response", async () => {
    mockCreate.mockResolvedValue(textResponse("totally plain text"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: Schema,
      fallback: FALLBACK,
    });
    expect(result).toBe(FALLBACK);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns fallback when JSON is malformed", async () => {
    mockCreate.mockResolvedValue(textResponse('{"title": "oops", count: 5'));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: Schema,
      fallback: FALLBACK,
    });
    expect(result).toBe(FALLBACK);
    warn.mockRestore();
  });

  it("returns fallback when JSON fails schema validation", async () => {
    mockCreate.mockResolvedValue(
      textResponse('{"title":"ok","count":"not-a-number"}'),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: Schema,
      fallback: FALLBACK,
    });
    expect(result).toBe(FALLBACK);
    warn.mockRestore();
  });

  it("returns fallback when SDK throws", async () => {
    mockCreate.mockRejectedValue(new Error("network"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: Schema,
      fallback: FALLBACK,
    });
    expect(result).toBe(FALLBACK);
    warn.mockRestore();
  });

  it("applies zod transforms in the schema", async () => {
    const TruncatedSchema = z.object({
      tweet: z.string().transform((s) => s.slice(0, 10)),
    });
    mockCreate.mockResolvedValue(
      textResponse('{"tweet":"this is definitely more than ten chars"}'),
    );
    const result = await callHaikuJson({
      system: "s",
      user: "u",
      schema: TruncatedSchema,
      fallback: { tweet: "" },
    });
    expect(result.tweet).toBe("this is de");
  });
});
