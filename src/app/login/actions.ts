"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserStatus } from "@prisma/client";
import { z } from "zod";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";

const loginSchema = z.object({
  email: z.string().email("请输入正确的邮箱"),
  password: z.string().min(1, "请输入密码"),
});

function loginError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  const result = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.success) {
    loginError("请输入正确的邮箱和密码");
  }

  const user = await prisma.user.findUnique({
    where: { email: result.data.email },
  });

  if (!user) {
    loginError("邮箱或密码错误");
  }

  if (user.status !== UserStatus.ACTIVE) {
    loginError("账号已被禁用，请联系平台管理员");
  }

  const passwordMatched = await bcrypt.compare(
    result.data.password,
    user.passwordHash,
  );

  if (!passwordMatched) {
    loginError("邮箱或密码错误");
  }

  const token = await signSession(user.id, user.role);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  redirect(getDashboardPath(user.role));
}
