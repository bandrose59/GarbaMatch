import type { NextRequest } from "next/server";

export function hasSameOrigin(request: NextRequest): boolean {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return false;

  let origin: string;
  try {
    origin = new URL(requestOrigin).origin;
  } catch {
    return false;
  }

  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      console.error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
      return false;
    }
  }
  return allowedOrigins.has(origin);
}
