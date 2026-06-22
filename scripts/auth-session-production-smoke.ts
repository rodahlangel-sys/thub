import { readFile } from "node:fs/promises";
import path from "node:path";

const fixturePath = path.join(process.cwd(), ".tmp", "mysql-e2e-current.json");
const expectedHost = "thub-web-273292-8-1445308090.sh.run.tcloudbase.com";

type Fixture = {
  prefix: string;
  password: string;
  adminEmail: string;
  parentEmail: string;
  tutorEmail: string;
};

function getBaseUrl() {
  const value = process.env.AUTH_SESSION_SMOKE_BASE_URL?.trim();
  if (!value) throw new Error("SMOKE_BASE_URL_MISSING");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== expectedHost || url.pathname !== "/") {
    throw new Error("SMOKE_BASE_URL_INVALID");
  }
  return url.origin;
}

function actionId(html: string, field: string) {
  const form = Array.from(html.matchAll(/<form\b[\s\S]*?<\/form>/gi), (match) => match[0])
    .find((candidate) => new RegExp(`name=["']${field}["']`, "i").test(candidate));
  return form?.match(/name=["'](\$ACTION_[^"']+)["']/i)?.[1];
}

function sessionCookie(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return (headers.getSetCookie?.() ?? []).find((item) =>
    item.startsWith("wuhan_tutor_session="),
  );
}

function assertCreatedCookie(response: Response) {
  const cookie = sessionCookie(response);
  if (
    !cookie ||
    !/(?:^|;)\s*Path=\//i.test(cookie) ||
    !/(?:^|;)\s*HttpOnly/i.test(cookie) ||
    !/(?:^|;)\s*Secure/i.test(cookie) ||
    !/SameSite=Lax/i.test(cookie) ||
    !/Max-Age=604800/i.test(cookie) ||
    /(?:^|;)\s*Domain=/i.test(cookie)
  ) {
    throw new Error("LOGIN_COOKIE_ATTRIBUTES_INVALID");
  }
}

class HttpSession {
  private cookies = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  private update(response: Response) {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    for (const item of headers.getSetCookie?.() ?? []) {
      const pair = item.split(";", 1)[0];
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      if (/Max-Age=0/i.test(item)) this.cookies.delete(name);
      else this.cookies.set(name, pair);
    }
  }

  private headers(extra?: HeadersInit) {
    return {
      ...(this.cookies.size ? { cookie: Array.from(this.cookies.values()).join("; ") } : {}),
      ...extra,
    };
  }

  async get(route: string) {
    const response = await fetch(`${this.baseUrl}${route}`, {
      headers: this.headers(),
      redirect: "manual",
    });
    this.update(response);
    return response;
  }

  async post(route: string) {
    const response = await fetch(`${this.baseUrl}${route}`, {
      method: "POST",
      headers: this.headers(),
      redirect: "manual",
    });
    this.update(response);
    return response;
  }

  async action(route: string, anchor: string, fields: Record<string, string>) {
    const page = await fetch(`${this.baseUrl}${route}`, {
      headers: this.headers(),
      redirect: "manual",
    });
    if (page.status !== 200) throw new Error(`ACTION_PAGE_FAILED:${route}`);
    const id = actionId(await page.text(), anchor);
    if (!id) throw new Error(`ACTION_ID_MISSING:${route}`);
    const body = new FormData();
    body.set(id, "");
    for (const [name, value] of Object.entries(fields)) body.set(name, value);
    const response = await fetch(`${this.baseUrl}${route}`, {
      method: "POST",
      body,
      headers: this.headers({ origin: this.baseUrl, referer: `${this.baseUrl}${route}` }),
      redirect: "manual",
    });
    this.update(response);
    return response;
  }
}

function locationPath(response: Response, baseUrl: string) {
  return new URL(response.headers.get("location") ?? "", baseUrl).pathname;
}

async function expectPages(session: HttpSession, routes: string[]) {
  for (const route of routes) {
    const response = await session.get(route);
    if (response.status !== 200) throw new Error(`PROTECTED_PAGE_FAILED:${route}`);
  }
}

async function expectRoleRedirect(
  session: HttpSession,
  route: string,
  dashboard: string,
  baseUrl: string,
) {
  const response = await session.get(route);
  if (response.status !== 307 || locationPath(response, baseUrl) !== dashboard) {
    throw new Error(`ROLE_REDIRECT_FAILED:${route}`);
  }
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--apply") {
    throw new Error("SMOKE_REQUIRES_EXPLICIT_APPLY");
  }
  const baseUrl = getBaseUrl();
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Fixture;
  const parent = new HttpSession(baseUrl);
  const tutor = new HttpSession(baseUrl);
  const admin = new HttpSession(baseUrl);

  const register = async (
    session: HttpSession,
    role: "PARENT" | "TUTOR",
    email: string,
  ) => {
    const response = await session.action("/register", "policyAccepted", {
      name: `${fixture.prefix}_${role.toLowerCase()}`,
      phone: "00000000000",
      email,
      password: fixture.password,
      confirmPassword: fixture.password,
      role,
      policyAccepted: "on",
    });
    if (response.status !== 303) throw new Error("REGISTRATION_STATUS_INVALID");
    assertCreatedCookie(response);
    const expected = role === "PARENT" ? "/parent" : "/tutor";
    if (locationPath(response, baseUrl) !== expected) {
      throw new Error("REGISTRATION_REDIRECT_INVALID");
    }
  };

  await register(parent, "PARENT", fixture.parentEmail);
  await register(tutor, "TUTOR", fixture.tutorEmail);
  const adminLogin = await admin.action("/login", "password", {
    email: fixture.adminEmail,
    password: fixture.password,
  });
  if (adminLogin.status !== 303 || locationPath(adminLogin, baseUrl) !== "/admin") {
    throw new Error("ADMIN_LOGIN_FAILED");
  }
  assertCreatedCookie(adminLogin);

  await expectPages(parent, [
    "/parent",
    "/parent/profile",
    "/parent/demands",
    "/parent/recommend",
    "/parent/orders",
  ]);
  await expectPages(tutor, [
    "/tutor",
    "/tutor/profile",
    "/tutor/orders",
    "/tutor/reviews",
  ]);
  await expectPages(admin, [
    "/admin",
    "/admin/users",
    "/admin/tutors",
    "/admin/orders",
    "/admin/payments",
    "/admin/refunds",
  ]);
  await expectRoleRedirect(parent, "/tutor", "/parent", baseUrl);
  await expectRoleRedirect(parent, "/admin", "/parent", baseUrl);
  await expectRoleRedirect(tutor, "/parent", "/tutor", baseUrl);
  await expectRoleRedirect(tutor, "/admin", "/tutor", baseUrl);
  await expectRoleRedirect(admin, "/parent", "/admin", baseUrl);
  await expectRoleRedirect(admin, "/tutor", "/admin", baseUrl);

  const prefetchedLogout = await parent.get("/logout");
  if (prefetchedLogout.status !== 405 || prefetchedLogout.headers.has("set-cookie")) {
    throw new Error("LOGOUT_GET_HAS_SIDE_EFFECTS");
  }
  await expectPages(parent, ["/parent/orders"]);

  for (const [session, route] of [
    [parent, "/parent"],
    [tutor, "/tutor"],
    [admin, "/admin"],
  ] as const) {
    const response = await session.post("/logout");
    const cookie = sessionCookie(response);
    if (
      response.status !== 303 ||
      locationPath(response, baseUrl) !== "/login" ||
      !cookie ||
      !/Max-Age=0/i.test(cookie) ||
      !/(?:^|;)\s*Path=\//i.test(cookie) ||
      /(?:^|;)\s*Domain=/i.test(cookie)
    ) {
      throw new Error("LOGOUT_RESPONSE_INVALID");
    }
    const blocked = await session.get(route);
    if (blocked.status !== 307 || locationPath(blocked, baseUrl) !== "/login") {
      throw new Error("LOGOUT_SESSION_STILL_ACTIVE");
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      roles: 3,
      authenticatedPages: 15,
      roleIsolationChecks: 6,
      logoutChecks: 3,
      cookieValuesExposed: false,
    }),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({ ok: false, category: String((error as Error).message).split(":")[0] }),
  );
  process.exitCode = 1;
});
