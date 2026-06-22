"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CertificationStatus,
  TeachMode,
  TutorDocumentStatus,
  TutorDocumentType,
  UserRole,
} from "@prisma/client";
import { getDashboardPath } from "@/lib/roles";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyNotifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { privateFileStorage } from "@/lib/storage";
import { persistTutorDocumentUpload } from "@/lib/tutor-document-upload";
import {
  canEditTutorDocuments,
  documentFileExists,
  isSchoolProofDocument,
  MAX_OPTIONAL_TUTOR_DOCUMENTS,
  schoolProofTypes,
  validateTutorDocumentFile,
} from "@/lib/tutor-documents";

const tutorProfileSchema = z
  .object({
    school: z.string().trim().min(1, "请填写学校"),
    major: z.string().trim().min(1, "请填写专业"),
    grade: z.string().trim().min(1, "请填写年级"),
    gender: z.string().trim().min(1, "请填写性别"),
    subjects: z.string().trim().min(1, "请填写可辅导科目"),
    teachLevels: z.string().trim().min(1, "请填写可辅导学段"),
    areas: z.string().trim().min(1, "请填写服务区域"),
    teachMode: z.enum([TeachMode.ONLINE, TeachMode.OFFLINE, TeachMode.BOTH]),
    availableTimes: z.string().trim().min(1, "请填写可上课时间"),
    priceMin: z.coerce.number().int("最低时薪必须是整数").min(1, "最低时薪必须大于 0"),
    priceMax: z.coerce.number().int("最高时薪必须是整数").min(1, "最高时薪必须大于 0"),
    introduction: z.string().trim().min(1, "请填写个人简介").max(300, "个人简介不能超过 300 字"),
    experience: z.string().trim().min(1, "请填写过往经验").max(500, "过往经验不能超过 500 字"),
  })
  .refine((data) => data.priceMin <= data.priceMax, {
    message: "最低时薪不能大于最高时薪",
    path: ["priceMax"],
  });

const documentTypeSchema = z.enum([
  TutorDocumentType.STUDENT_CARD,
  TutorDocumentType.ENROLLMENT_PROOF,
  TutorDocumentType.CERTIFICATE,
  TutorDocumentType.OTHER,
]);

const documentIdSchema = z.string().trim().min(1);

function profileRedirect(
  type: "success" | "error",
  message: string,
): never {
  redirect(`/tutor/profile?${type}=${encodeURIComponent(message)}`);
}

async function requireTutorProfileForAction() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: user.id },
    include: { verificationDocuments: true },
  });

  if (!profile) {
    redirect("/tutor");
  }

  return { user, profile };
}

function assertDocumentsEditable(
  profile: Awaited<ReturnType<typeof requireTutorProfileForAction>>["profile"],
) {
  if (
    !canEditTutorDocuments(
      profile.certificationStatus,
      profile.verificationDocuments,
    )
  ) {
    profileRedirect("error", "资料正在审核中，暂时不能修改证明材料。");
  }
}

export async function uploadTutorDocumentAction(formData: FormData) {
  const { profile } = await requireTutorProfileForAction();
  assertDocumentsEditable(profile);

  const typeResult = documentTypeSchema.safeParse(formData.get("documentType"));
  if (!typeResult.success) {
    profileRedirect("error", "证明材料类型不正确。");
  }

  let file;
  try {
    file = await validateTutorDocumentFile(formData.get("document"));
  } catch (error) {
    profileRedirect(
      "error",
      error instanceof Error ? error.message : "图片上传失败，请重新选择。",
    );
  }

  const documentIdValue = String(formData.get("documentId") ?? "").trim();
  const replaceDocument = documentIdValue
    ? profile.verificationDocuments.find((document) => document.id === documentIdValue)
    : null;

  if (documentIdValue && !replaceDocument) {
    profileRedirect("error", "要替换的证明材料不存在。");
  }

  const isSchoolProofType = schoolProofTypes.includes(typeResult.data);
  const optionalDocuments = profile.verificationDocuments.filter(
    (document) => !isSchoolProofDocument(document),
  );

  if (
    !isSchoolProofType &&
    !replaceDocument &&
    optionalDocuments.length >= MAX_OPTIONAL_TUTOR_DOCUMENTS
  ) {
    profileRedirect("error", "其他能力证明最多上传5张。");
  }

  const documentsToRemove = replaceDocument
    ? [replaceDocument]
    : isSchoolProofType
      ? profile.verificationDocuments.filter((document) =>
          isSchoolProofDocument(document),
        )
      : [];

  try {
    await persistTutorDocumentUpload({
      storage: privateFileStorage,
      input: {
        buffer: file.buffer,
        extension: file.extension,
        tutorProfileId: profile.id,
      },
      oldStorageKeys: documentsToRemove.map((document) => document.storageKey),
      commit: async (newStorageKey) => {
        await prisma.$transaction(async (tx) => {
          if (documentsToRemove.length > 0) {
            await tx.tutorVerificationDocument.deleteMany({
              where: {
                id: { in: documentsToRemove.map((document) => document.id) },
                tutorProfileId: profile.id,
              },
            });
          }

          if (!isSchoolProofType && !replaceDocument) {
            const optionalDocumentCount = await tx.tutorVerificationDocument.count({
              where: {
                tutorProfileId: profile.id,
                type: { notIn: schoolProofTypes },
              },
            });

            if (optionalDocumentCount >= MAX_OPTIONAL_TUTOR_DOCUMENTS) {
              throw new Error("TOO_MANY_OPTIONAL_DOCUMENTS");
            }
          }

          await tx.tutorVerificationDocument.create({
            data: {
              tutorProfileId: profile.id,
              type: typeResult.data,
              storageKey: newStorageKey,
              originalName: file.originalName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              status: TutorDocumentStatus.DRAFT,
            },
          });
        });
      },
      onCleanupError: () => {
        console.error("Failed to clean up replaced tutor verification file");
      },
    });
  } catch (error) {
    console.error("Failed to upload tutor verification document", error);
    if (error instanceof Error && error.message === "TOO_MANY_OPTIONAL_DOCUMENTS") {
      profileRedirect("error", "其他能力证明最多上传5张。");
    }
    profileRedirect("error", "证明材料上传失败，请稍后重试。");
  }

  profileRedirect("success", "证明材料已上传。");
}

export async function deleteTutorDocumentAction(formData: FormData) {
  const { profile } = await requireTutorProfileForAction();
  assertDocumentsEditable(profile);

  const documentId = documentIdSchema.safeParse(formData.get("documentId"));
  if (!documentId.success) {
    profileRedirect("error", "证明材料不存在。");
  }

  const document = profile.verificationDocuments.find(
    (item) => item.id === documentId.data,
  );

  if (!document) {
    profileRedirect("error", "证明材料不存在。");
  }

  if (document.status === TutorDocumentStatus.SUBMITTED) {
    profileRedirect("error", "审核中的证明材料不能删除。");
  }

  await prisma.tutorVerificationDocument.delete({
    where: { id: document.id },
  });

  await privateFileStorage.delete(document.storageKey);

  profileRedirect("success", "证明材料已删除。");
}

export async function updateTutorProfileAction(formData: FormData) {
  const { user, profile } = await requireTutorProfileForAction();

  if (
    !canEditTutorDocuments(
      profile.certificationStatus,
      profile.verificationDocuments,
    )
  ) {
    profileRedirect("error", "资料正在审核中，请等待平台审核完成。");
  }

  const result = tutorProfileSchema.safeParse({
    school: formData.get("school"),
    major: formData.get("major"),
    grade: formData.get("grade"),
    gender: formData.get("gender"),
    subjects: formData.get("subjects"),
    teachLevels: formData.get("teachLevels"),
    areas: formData.get("areas"),
    teachMode: formData.get("teachMode"),
    availableTimes: formData.get("availableTimes"),
    priceMin: formData.get("priceMin"),
    priceMax: formData.get("priceMax"),
    introduction: formData.get("introduction"),
    experience: formData.get("experience"),
  });

  if (!result.success) {
    profileRedirect("error", result.error.issues[0]?.message ?? "资料填写有误");
  }

  const schoolProof = profile.verificationDocuments.find((document) =>
    isSchoolProofDocument(document),
  );

  if (!schoolProof) {
    profileRedirect("error", "请先上传学生证、校园卡或有效在读证明。");
  }

  const allFilesExist = await Promise.all(
    profile.verificationDocuments.map((document) => documentFileExists(document)),
  );

  if (allFilesExist.some((exists) => !exists)) {
    profileRedirect("error", "有证明图片暂时无法读取，请重新上传后再提交。");
  }

  const submittedProfile = await prisma.$transaction(async (tx) => {
    const updatedProfile = await tx.tutorProfile.update({
      where: { userId: user.id },
      data: {
        ...result.data,
        certificationStatus: CertificationStatus.PENDING,
        certificationNote: "资料和证明材料已提交审核。",
      },
    });

    await tx.tutorVerificationDocument.updateMany({
      where: {
        tutorProfileId: profile.id,
      },
      data: {
        status: TutorDocumentStatus.SUBMITTED,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
      },
    });

    return updatedProfile;
  });

  await safelyNotifyAdmins({
    title: "有新的家教资料待审核",
    content: `${user.name}同学提交或更新了家教资料和证明材料，请及时审核。`,
    type: "AUDIT",
    link: "/admin/tutors",
    dedupeKey: buildNotificationDedupeKey(
      "tutor-profile",
      profile.id,
      "submitted",
      submittedProfile.updatedAt.getTime().toString(),
      "admins",
    ),
  });

  profileRedirect("success", "资料和证明材料已提交平台审核。");
}
