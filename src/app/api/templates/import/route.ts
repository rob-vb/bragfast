import crypto from "crypto";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

// Session-auth endpoint for the public Template Library Import button.
// Idempotent — backed by templates.importTemplate, which dedupes per
// (userId, sourceExternalId) via the by_user_import_source index.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceExternalId = body.sourceExternalId;
  if (typeof sourceExternalId !== "string" || sourceExternalId === "") {
    return Response.json(
      { error: "sourceExternalId required" },
      { status: 400 },
    );
  }

  const externalId = `tmpl_${crypto.randomBytes(12).toString("hex")}`;

  try {
    const result = await fetchMutation(api.templates.importTemplate, {
      sourceExternalId,
      userId: user._id,
      externalId,
    });
    return Response.json(
      {
        id: result.id,
        name: result.name,
        already_imported: result.alreadyImported,
        imported_from: sourceExternalId,
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Import failed";
    if (msg.includes("not public") || msg.includes("not found")) {
      return Response.json({ error: msg }, { status: 404 });
    }
    console.error("Failed to import template:", err);
    return Response.json({ error: "Failed to import template" }, { status: 500 });
  }
}
