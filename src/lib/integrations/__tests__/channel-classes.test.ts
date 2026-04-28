/**
 * Unit tests for src/lib/integrations/channel-classes.ts
 */

import { describe, it, expect } from "vitest";
import {
  channelClassFromBufferService,
  channelClassFromPostizIdentifier,
  BUILT_IN_FORMAT_DEFAULTS,
  CHANNEL_CLASS_ICONS,
  type ChannelClass,
} from "../channel-classes";

describe("channelClassFromBufferService", () => {
  it("maps known services", () => {
    expect(channelClassFromBufferService("twitter")).toBe("x");
    expect(channelClassFromBufferService("x")).toBe("x");
    expect(channelClassFromBufferService("linkedin")).toBe("linkedin");
    expect(channelClassFromBufferService("instagram")).toBe("instagram");
    expect(channelClassFromBufferService("tiktok")).toBe("tiktok");
    expect(channelClassFromBufferService("threads")).toBe("threads");
    expect(channelClassFromBufferService("facebook")).toBe("facebook");
    expect(channelClassFromBufferService("youtube")).toBe("youtube");
  });

  it("is case-insensitive", () => {
    expect(channelClassFromBufferService("Twitter")).toBe("x");
    expect(channelClassFromBufferService("LINKEDIN")).toBe("linkedin");
    expect(channelClassFromBufferService("Instagram")).toBe("instagram");
  });

  it("falls back to 'other' for unknown services", () => {
    expect(channelClassFromBufferService("pinterest")).toBe("other");
    expect(channelClassFromBufferService("googlebusiness")).toBe("other");
    expect(channelClassFromBufferService("bluesky")).toBe("other");
    expect(channelClassFromBufferService("")).toBe("other");
  });
});

describe("channelClassFromPostizIdentifier", () => {
  it("maps known identifiers (uppercase Postiz style)", () => {
    expect(channelClassFromPostizIdentifier("TWITTER")).toBe("x");
    expect(channelClassFromPostizIdentifier("LINKEDIN")).toBe("linkedin");
    expect(channelClassFromPostizIdentifier("INSTAGRAM")).toBe("instagram");
    expect(channelClassFromPostizIdentifier("TIKTOK")).toBe("tiktok");
    expect(channelClassFromPostizIdentifier("THREADS")).toBe("threads");
    expect(channelClassFromPostizIdentifier("FACEBOOK")).toBe("facebook");
    expect(channelClassFromPostizIdentifier("YOUTUBE")).toBe("youtube");
  });

  it("is case-insensitive", () => {
    expect(channelClassFromPostizIdentifier("twitter")).toBe("x");
    expect(channelClassFromPostizIdentifier("LinkedIn")).toBe("linkedin");
  });

  it("falls back to 'other' for unknown identifiers", () => {
    expect(channelClassFromPostizIdentifier("MASTODON")).toBe("other");
    expect(channelClassFromPostizIdentifier("BLUESKY")).toBe("other");
    expect(channelClassFromPostizIdentifier("")).toBe("other");
  });
});

describe("BUILT_IN_FORMAT_DEFAULTS", () => {
  it("covers all six formats", () => {
    const formats = [
      "square",
      "landscape",
      "portrait",
      "video-square",
      "video-landscape",
      "video-portrait",
    ];
    for (const fmt of formats) {
      expect(BUILT_IN_FORMAT_DEFAULTS[fmt]).toBeDefined();
    }
  });

  it("square → x, linkedin", () => {
    expect(BUILT_IN_FORMAT_DEFAULTS["square"]).toEqual(
      expect.arrayContaining(["x", "linkedin"]),
    );
    expect(BUILT_IN_FORMAT_DEFAULTS["square"]).toHaveLength(2);
  });

  it("landscape → linkedin only", () => {
    expect(BUILT_IN_FORMAT_DEFAULTS["landscape"]).toEqual(["linkedin"]);
  });

  it("portrait → instagram, tiktok, threads", () => {
    expect(BUILT_IN_FORMAT_DEFAULTS["portrait"]).toEqual(
      expect.arrayContaining(["instagram", "tiktok", "threads"]),
    );
    expect(BUILT_IN_FORMAT_DEFAULTS["portrait"]).toHaveLength(3);
  });

  it("video formats mirror their image counterparts", () => {
    expect(BUILT_IN_FORMAT_DEFAULTS["video-square"]).toEqual(
      BUILT_IN_FORMAT_DEFAULTS["square"],
    );
    expect(BUILT_IN_FORMAT_DEFAULTS["video-landscape"]).toEqual(
      BUILT_IN_FORMAT_DEFAULTS["landscape"],
    );
    expect(BUILT_IN_FORMAT_DEFAULTS["video-portrait"]).toEqual(
      BUILT_IN_FORMAT_DEFAULTS["portrait"],
    );
  });
});

describe("CHANNEL_CLASS_ICONS", () => {
  it("has an icon for every ChannelClass", () => {
    const classes: ChannelClass[] = [
      "x",
      "linkedin",
      "instagram",
      "tiktok",
      "threads",
      "facebook",
      "youtube",
      "other",
    ];
    for (const cls of classes) {
      expect(CHANNEL_CLASS_ICONS[cls]).toBeTruthy();
    }
  });
});
