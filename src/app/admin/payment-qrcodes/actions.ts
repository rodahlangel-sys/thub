"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  parsePaymentQrType,
} from "@/lib/payment-qrcodes";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { privateFileStorage } from "@/lib/storage";
import {
  persistPrivateImageUpload,
  validatePrivateImageFile,
} from "@/lib/private-image-upload";

function redirectToSettings(type: "success" | "error", message: string): never {
  redirect(`/admin/payment-qrcodes?${type}=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.ADMIN) redirect(getDashboardPath(user.role));
  return user;
}

export async function uploadPlatformPaymentQrAction(formData: FormData) {
  const user = await requireAdmin();
  const qrType = parsePaymentQrType(formData.get("type"));
  if (!qrType) redirectToSettings("error", "收款码类型不正确。");

  let file;
  try {
    file = await validatePrivateImageFile(formData.get("qr"));
  } catch (error) {
    redirectToSettings(
      "error",
      error instanceof Error ? error.message : "二维码上传失败，请重新选择图片。",
    );
  }

  const existing = await prisma.platformPaymentQrCode.findUnique({
    where: { type: qrType },
    select: { storageKey: true },
  });

  try {
    await persistPrivateImageUpload({
      storage: privateFileStorage,
      input: {
        buffer: file.buffer,
        extension: file.extension,
        scope: {
          kind: "payment-qr",
          ownerType: "platform",
          ownerId: "default",
          qrType,
        },
      },
      oldStorageKeys: existing ? [existing.storageKey] : [],
      commit: async (newStorageKey) => {
        await prisma.platformPaymentQrCode.upsert({
          where: { type: qrType },
          create: {
            type: qrType,
            storageKey: newStorageKey,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            updatedById: user.id,
          },
          update: {
            storageKey: newStorageKey,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            updatedById: user.id,
          },
        });
      },
      onCleanupError: () => {
        console.error("Failed to clean up replaced platform payment QR");
      },
    });
  } catch (error) {
    console.error("Failed to upload platform payment QR", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectToSettings("error", "该收款码已存在，请刷新后重试。");
    }
    redirectToSettings("error", "平台收款码上传失败，请稍后重试。");
  }

  revalidatePath("/admin/payment-qrcodes");
  redirectToSettings("success", "平台收款码已更新。");
}

export async function deletePlatformPaymentQrAction(formData: FormData) {
  await requireAdmin();
  const qrType = parsePaymentQrType(formData.get("type"));
  if (!qrType) redirectToSettings("error", "收款码类型不正确。");

  const existing = await prisma.platformPaymentQrCode.findUnique({
    where: { type: qrType },
    select: { id: true, storageKey: true },
  });
  if (!existing) redirectToSettings("error", "收款码不存在。");

  await prisma.platformPaymentQrCode.delete({ where: { id: existing.id } });
  await privateFileStorage.delete(existing.storageKey);

  revalidatePath("/admin/payment-qrcodes");
  redirectToSettings("success", "平台收款码已删除。");
}
