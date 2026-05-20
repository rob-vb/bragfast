import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

function getSiteOrigin(request: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const issued = await fetchMutation(api.deviceCodes.issueCode, {});
    const verification_uri = `${getSiteOrigin(request)}/device?code=${encodeURIComponent(issued.user_code)}`;

    return Response.json({
      device_code: issued.device_code,
      user_code: issued.user_code,
      verification_uri,
      expires_in: issued.expires_in,
      interval: issued.interval,
    });
  } catch (err) {
    console.error("Failed to issue device code:", err);
    return Response.json({ error: "Failed to issue device code" }, { status: 500 });
  }
}
