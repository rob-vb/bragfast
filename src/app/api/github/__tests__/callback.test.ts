import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/get-session-user", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = vi.fn();
    action = vi.fn();
    mutation = vi.fn();
  },
}));

vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServer: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "../callback/route";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { captureServer } from "@/lib/analytics/posthog-server";

const mockedGetSessionUser = getSessionUser as ReturnType<typeof vi.fn>;
const mockedCapture = captureServer as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedGetSessionUser.mockReset();
  mockedCapture.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeReq(url: string) {
  return new Request(url) as unknown as import("next/server").NextRequest;
}

describe("github callback — org-pending detection", () => {
  it("redirects to /admin/sous-chef?install_state=pending when setup_action=request", async () => {
    mockedGetSessionUser.mockResolvedValue({ _id: "user_123" });
    const res = await GET(
      makeReq("https://app.test/api/github/callback?setup_action=request"),
    );
    expect(res.status).toBe(302);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin");
  });

  it("fires github_app_install_blocked with block_reason=org_admin_required", async () => {
    mockedGetSessionUser.mockResolvedValue({ _id: "user_456" });
    await GET(
      makeReq("https://app.test/api/github/callback?setup_action=request"),
    );
    expect(mockedCapture).toHaveBeenCalledWith({
      event: "github_app_install_blocked",
      distinctId: "user_456",
      properties: { block_reason: "org_admin_required" },
    });
  });

  it("redirects unauthenticated users to /login", async () => {
    mockedGetSessionUser.mockResolvedValue(null);
    const res = await GET(
      makeReq("https://app.test/api/github/callback?setup_action=request"),
    );
    expect(res.headers.get("location") ?? "").toContain("/login");
    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it("falls through to missing_installation_id when neither setup_action=request nor installation_id present", async () => {
    mockedGetSessionUser.mockResolvedValue({ _id: "user_789" });
    const res = await GET(makeReq("https://app.test/api/github/callback"));
    expect(res.headers.get("location") ?? "").toContain(
      "github_missing_installation_id",
    );
    expect(mockedCapture).not.toHaveBeenCalled();
  });
});

describe("github callback — success redirect (repositioned)", () => {
  it("redirects to /admin after successful install", async () => {
    mockedGetSessionUser.mockResolvedValue({ _id: "user_111" });
    const res = await GET(
      makeReq(
        "https://app.test/api/github/callback?installation_id=42&setup_action=install",
      ),
    );
    expect(res.headers.get("location") ?? "").toContain("/admin");
  });
});
