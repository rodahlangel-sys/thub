"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CertificationStatus,
  TeachMode,
  UserRole,
  UserStatus,
} from "@prisma/client";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "姓名至少 2 个字"),
    email: z.string().trim().toLowerCase().email("请输入正确的邮箱"),
    phone: z.string().trim().min(6, "请输入正确的手机号"),
    password: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string().min(6, "请再次输入密码"),
    role: z.enum([UserRole.PARENT, UserRole.TUTOR]),
    policyAccepted: z.literal("on", {
      error: "请先阅读并同意用户协议和隐私政策。",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

function registerError(message: string): never {
  redirect(`/register?error=${encodeURIComponent(message)}`);
}

export async function registerAction(formData: FormData) {
  const result = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    role: formData.get("role"),
    policyAccepted: formData.get("policyAccepted"),
  });

  if (!result.success) {
    registerError(result.error.issues[0]?.message ?? "注册信息填写有误");
  }

  const existed = await prisma.user.findUnique({
    where: { email: result.data.email },
    select: { id: true },
  });

  if (existed) {
    registerError("该邮箱已被注册");
  }

  const passwordHash = await bcrypt.hash(result.data.password, 10);
  const role = result.data.role;
  const acceptedAt = new Date();

  const user = await prisma.user.create({
    data: {
      email: result.data.email,
      passwordHash,
      role,
      name: result.data.name,
      phone: result.data.phone,
      status: UserStatus.ACTIVE,
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt,
      parentProfile:
        role === UserRole.PARENT
          ? {
              create: {
                area: "待完善",
                addressDetail: "",
                childInfo: "",
              },
            }
          : undefined,
      tutorProfile:
        role === UserRole.TUTOR
          ? {
              create: {
                school: "待完善",
                major: "待完善",
                grade: "待完善",
                gender: "待完善",
                subjects: "",
                teachLevels: "",
                areas: "",
                teachMode: TeachMode.BOTH,
                availableTimes: "",
                priceMin: 0,
                priceMax: 0,
                introduction: "待完善",
                experience: "待完善",
                certificationStatus: CertificationStatus.PENDING,
                certificationNote: "新注册用户，待提交认证资料。",
              },
            }
          : undefined,
    },
  });

  const token = await signSession(user.id, user.role);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  redirect(getDashboardPath(user.role));
}
