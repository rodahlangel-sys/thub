"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CertificationStatus,
  TutorDocumentStatus,
  UserRole,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";
import { documentFileExists, isSchoolProofDocument } from "@/lib/tutor-documents";

const alreadyHandledMessage = "该资料已被处理，请刷新页面查看最新状态。";

async function requireAdminForAction() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  return user;
}

const idSchema = z.string().min(1);
const rejectSchema = z.object({
  tutorProfileId: z.string().min(1),
  reason: z.string().trim().min(1, "请填写驳回原因").max(300, "驳回原因不能超过 300 字"),
});

function adminTutorRedirect(
  tutorProfileId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(`/admin/tutors/${tutorProfileId}?${type}=${encodeURIComponent(message)}`);
}

export async function approveTutorCertificationAction(formData: FormData) {
  const admin = await requireAdminForAction();
  const tutorProfileId = idSchema.parse(String(formData.get("tutorProfileId") ?? ""));

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: {
      user: { select: { id: true } },
      verificationDocuments: true,
    },
  });

  if (!tutorProfile) {
    adminTutorRedirect(tutorProfileId, "error", "家教资料不存在。");
  }

  if (tutorProfile.certificationStatus !== CertificationStatus.PENDING) {
    adminTutorRedirect(tutorProfileId, "error", alreadyHandledMessage);
  }

  const submittedDocuments = tutorProfile.verificationDocuments.filter(
    (document) => document.status === TutorDocumentStatus.SUBMITTED,
  );
  const submittedSchoolProof = submittedDocuments.find((document) =>
    isSchoolProofDocument(document),
  );

  if (!submittedSchoolProof) {
    adminTutorRedirect(
      tutorProfileId,
      "error",
      "通过审核前，请确认已提交学生证、校园卡或在读证明。",
    );
  }

  const fileChecks = await Promise.all(
    submittedDocuments.map((document) => documentFileExists(document)),
  );

  if (fileChecks.some((exists) => !exists)) {
    adminTutorRedirect(
      tutorProfileId,
      "error",
      "有证明图片暂时无法读取，请先驳回并让学生重新上传。",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.tutorProfile.updateMany({
        where: {
          id: tutorProfileId,
          certificationStatus: CertificationStatus.PENDING,
        },
        data: {
          certificationStatus: CertificationStatus.APPROVED,
          certificationNote: null,
        },
      });

      if (updatedProfile.count !== 1) {
        throw new Error("TUTOR_ALREADY_HANDLED");
      }

      await tx.tutorVerificationDocument.updateMany({
        where: {
          tutorProfileId,
          status: TutorDocumentStatus.SUBMITTED,
        },
        data: {
          status: TutorDocumentStatus.APPROVED,
          rejectionReason: null,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
      });

      await createNotification(
        {
          userId: tutorProfile.user.id,
          title: "家教资料审核通过",
          content: "你的家教资料和证明材料已通过平台审核。",
          type: "AUDIT",
          link: "/tutor/profile",
          dedupeKey: buildNotificationDedupeKey(
            "tutor-profile",
            tutorProfile.id,
            "approved",
            tutorProfile.updatedAt.getTime().toString(),
            tutorProfile.user.id,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TUTOR_ALREADY_HANDLED") {
      adminTutorRedirect(tutorProfileId, "error", alreadyHandledMessage);
    }

    throw error;
  }

  adminTutorRedirect(tutorProfileId, "success", "已通过认证");
}

export async function rejectTutorCertificationAction(formData: FormData) {
  const admin = await requireAdminForAction();

  const result = rejectSchema.safeParse({
    tutorProfileId: formData.get("tutorProfileId"),
    reason: formData.get("reason"),
  });

  if (!result.success) {
    const tutorProfileId = String(formData.get("tutorProfileId") ?? "");
    adminTutorRedirect(
      tutorProfileId,
      "error",
      result.error.issues[0]?.message ?? "请填写驳回原因",
    );
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: result.data.tutorProfileId },
    select: {
      id: true,
      userId: true,
      certificationStatus: true,
      updatedAt: true,
    },
  });

  if (!tutorProfile) {
    adminTutorRedirect(result.data.tutorProfileId, "error", "家教资料不存在。");
  }

  if (tutorProfile.certificationStatus !== CertificationStatus.PENDING) {
    adminTutorRedirect(result.data.tutorProfileId, "error", alreadyHandledMessage);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.tutorProfile.updateMany({
        where: {
          id: result.data.tutorProfileId,
          certificationStatus: CertificationStatus.PENDING,
        },
        data: {
          certificationStatus: CertificationStatus.REJECTED,
          certificationNote: result.data.reason,
        },
      });

      if (updatedProfile.count !== 1) {
        throw new Error("TUTOR_ALREADY_HANDLED");
      }

      await tx.tutorVerificationDocument.updateMany({
        where: {
          tutorProfileId: result.data.tutorProfileId,
          status: TutorDocumentStatus.SUBMITTED,
        },
        data: {
          status: TutorDocumentStatus.REJECTED,
          rejectionReason: result.data.reason,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
      });

      await createNotification(
        {
          userId: tutorProfile.userId,
          title: "家教资料需要修改",
          content: `你的家教资料需要修改：${result.data.reason}`,
          type: "AUDIT",
          link: "/tutor/profile",
          dedupeKey: buildNotificationDedupeKey(
            "tutor-profile",
            tutorProfile.id,
            "rejected",
            tutorProfile.updatedAt.getTime().toString(),
            tutorProfile.userId,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TUTOR_ALREADY_HANDLED") {
      adminTutorRedirect(result.data.tutorProfileId, "error", alreadyHandledMessage);
    }

    throw error;
  }

  adminTutorRedirect(result.data.tutorProfileId, "success", "已驳回认证");
}
