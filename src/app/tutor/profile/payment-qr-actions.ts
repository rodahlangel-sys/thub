"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { parsePaymentQrType } from "@/lib/payment-qrcodes";
import { persistPrivateImageUpload, validatePrivateImageFile } from "@/lib/private-image-upload";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";
import { privateFileStorage } from "@/lib/storage";

function redirectToProfile(type: "success" | "error", message: string): never {
  redirect(`/tutor/profile?${type}=${encodeURIComponent(message)}`);
}

async function requireTutorProfile() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.TUTOR) redirect(getDashboardPath(user.role));
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: user.id },
    include: { paymentQrCodes: true },
  });
  if (!profile) redirect("/tutor");
  return { user, profile };
}

export async function uploadTutorPaymentQrAction(formData: FormData) {
  const { profile } = await requireTutorProfile();
  const qrType = parsePaymentQrType(formData.get("type"));
  if (!qrType) redirectToProfile("error", "收款码类型不正确。");

  let file;
  try {
    file = await validatePrivateImageFile(formData.get("qr"));
  } catch (error) {
    redirectToProfile(
      "error",
      error instanceof Error ? error.message : "收款码上传失败，请重新选择图片。",
    );
  }

  const existing = profile.paymentQrCodes.find((qr) => qr.type === qrType);

  try {
    await persistPrivateImageUpload({
      storage: privateFileStorage,
      input: {
        buffer: file.buffer,
        extension: file.extension,
        scope: {
          kind: "payment-qr",
          ownerType: "tutor",
          ownerId: profile.id,
          qrType,
        },
      },
      oldStorageKeys: existing ? [existing.storageKey] : [],
      commit: async (newStorageKey) => {
        await prisma.tutorPaymentQrCode.upsert({
          where: {
            tutorProfileId_type: {
              tutorProfileId: profile.id,
              type: qrType,
            },
          },
          create: {
            tutorProfileId: profile.id,
            type: qrType,
            storageKey: newStorageKey,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          },
          update: {
            storageKey: newStorageKey,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          },
        });
      },
      onCleanupError: () => {
        console.error("Failed to clean up replaced tutor payment QR");
      },
    });
  } catch (error) {
    console.error("Failed to upload tutor payment QR", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectToProfile("error", "该收款码已存在，请刷新后重试。");
    }
    redirectToProfile("error", "收款码上传失败，请稍后重试。");
  }

  revalidatePath("/tutor/profile");
  redirectToProfile("success", "收款二维码已更新。");
}

export async function deleteTutorPaymentQrAction(formData: FormData) {
  const { profile } = await requireTutorProfile();
  const qrType = parsePaymentQrType(formData.get("type"));
  if (!qrType) redirectToProfile("error", "收款码类型不正确。");

  const existing = profile.paymentQrCodes.find((qr) => qr.type === qrType);
  if (!existing) redirectToProfile("error", "收款码不存在。");

  await prisma.tutorPaymentQrCode.delete({ where: { id: existing.id } });
  await privateFileStorage.delete(existing.storageKey);

  revalidatePath("/tutor/profile");
  redirectToProfile("success", "收款二维码已删除。");
}
