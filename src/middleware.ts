import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";

  // Serve markdown docs when agents request text/markdown on the homepage
  if (
    request.nextUrl.pathname === "/" &&
    accept.includes("text/markdown")
  ) {
    return NextResponse.rewrite(new URL("/docs.md", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
