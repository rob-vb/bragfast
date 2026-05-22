import { after } from "next/server";

export const maxDuration = 60;

import {
  authenticateAndCheckRateLimit,
  parseJsonBody,
  validateCommonFields,
  toReleaseRequest,
} from "../_shared";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";

export async function POST(request: Request) {
  const authResult = await authenticateAndCheckRateLimit(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  if (body.video !== undefined) {
    return Response.json(
      { error: "video field is not allowed on /cook/image; use /cook/video instead" },
      { status: 400 }
    );
  }

  const commonError = await validateCommonFields(body, userId);
  if (commonError) return commonError;

  const imageBody = toReleaseRequest(body);

  try {
    const result = await createRelease(imageBody, userId, { source: "api" });
    after(() => renderReleaseAsync(result.cook_id, imageBody, userId));
    return Response.json(result, { status: 202 });
  } catch (err) {
    console.error("Failed to create release:", err);
    return Response.json({ error: "Something burned. Try again." }, { status: 500 });
  }
}
