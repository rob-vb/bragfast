import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

async function parseJsonBody(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return Response.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    return body as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (body instanceof Response) return body;

  if (typeof body.device_code !== "string" || body.device_code.length === 0) {
    return Response.json({ error: "device_code is required" }, { status: 400 });
  }

  try {
    const result = await fetchMutation(api.deviceCodes.exchangeToken, {
      device_code: body.device_code,
    });

    if (!result.ok) {
      const status = result.error === "authorization_pending" ? 428 : 400;
      return Response.json({ error: result.error }, { status });
    }

    return Response.json({
      access_token: result.access_token,
      token_type: result.token_type,
      userId: result.userId,
    });
  } catch (err) {
    console.error("Failed to exchange device token:", err);
    return Response.json({ error: "Failed to exchange device token" }, { status: 500 });
  }
}
