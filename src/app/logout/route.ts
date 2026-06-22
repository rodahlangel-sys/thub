import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
