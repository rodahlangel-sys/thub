import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("session cookie uses one production-safe configuration", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    assert.equal(SESSION_COOKIE_NAME, "wuhan_tutor_session");
    assert.deepEqual(getSessionCookieOptions(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("login and registration share the session cookie constants", () => {
  for (const path of ["src/app/login/actions.ts", "src/app/register/actions.ts"]) {
    const source = read(path);
    assert.match(source, /SESSION_COOKIE_NAME/);
    assert.match(source, /getSessionCookieOptions\(\)/);
    assert.doesNotMatch(source, /wuhan_tutor_session/);
  }
});

test("logout is an explicit POST form and cannot be prefetched", () => {
  const navigation = read("src/components/NavigationClient.tsx");
  assert.match(navigation, /<form[^>]+action=["']\/logout["'][^>]+method=["']post["']/i);
  assert.doesNotMatch(navigation, /<ButtonLink\s+href=["']\/logout["']/);
  assert.doesNotMatch(navigation, /<Link[^>]+href=["']\/logout["']/);
});

test("logout route only mutates the session cookie on POST", async () => {
  const route = await import("../src/app/logout/route");
  assert.equal(route.GET, undefined);
  assert.equal(typeof route.POST, "function");

  const response = await route.POST(
    new NextRequest("https://example.test/logout", { method: "POST" }),
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://example.test/login");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Max-Age=0/i);
  assert.doesNotMatch(setCookie, /Domain=/i);
});

test("proxy does not redirect public, protected, logout, or static requests", () => {
  const source = read("src/proxy.ts");
  assert.doesNotMatch(source, /NextResponse\.redirect/);
  assert.match(source, /_next\/static/);
  assert.match(source, /_next\/image/);
  assert.match(source, /favicon\.ico/);
});
