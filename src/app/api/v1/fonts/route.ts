import { authenticate } from "@/lib/auth/authenticate";
import { FONT_CATALOG } from "@/lib/fonts";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(FONT_CATALOG);
}
