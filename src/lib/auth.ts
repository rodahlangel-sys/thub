import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { UserRole, UserStatus } from "@prisma/client";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "wuhan_tutor_session";

export type SessionPayload = {
  userId: string;
  role: UserRole;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
};

function getAuthSecret() {
  return new TextEncoder().encode(getServerEnv().authSecret);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function signSession(userId: string, role: UserRole) {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());

    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function requireUser() {
  return getCurrentUser();
}

export async function requireRole(role: UserRole | UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const roles = Array.isArray(role) ? role : [role];

  if (!roles.includes(user.role)) {
    return null;
  }

  return user;
}
