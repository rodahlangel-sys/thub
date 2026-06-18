import {
  CertificationStatus,
  TutorDocumentStatus,
  TutorDocumentType,
  type TutorVerificationDocument,
} from "@prisma/client";
import { privateFileStorage } from "@/lib/storage";

export const MAX_TUTOR_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_OPTIONAL_TUTOR_DOCUMENTS = 5;

export const tutorDocumentTypeLabels: Record<TutorDocumentType, string> = {
  STUDENT_CARD: "学生证或校园卡",
  ENROLLMENT_PROOF: "在读证明",
  CERTIFICATE: "能力证明",
  OTHER: "其他证明",
};

export const tutorDocumentStatusLabels: Record<TutorDocumentStatus, string> = {
  DRAFT: "待提交",
  SUBMITTED: "审核中",
  APPROVED: "已通过",
  REJECTED: "需修改",
};

export const schoolProofTypes: TutorDocumentType[] = [
  TutorDocumentType.STUDENT_CARD,
  TutorDocumentType.ENROLLMENT_PROOF,
];

export type ValidatedTutorDocumentFile = {
  buffer: Buffer;
  extension: "jpg" | "jpeg" | "png" | "webp";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  originalName: string;
  sizeBytes: number;
};

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const extensionByMimeType: Record<
  ValidatedTutorDocumentFile["mimeType"],
  Array<ValidatedTutorDocumentFile["extension"]>
> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

function getExtension(fileName: string) {
  const match = /\.([^.]+)$/.exec(fileName.toLowerCase());
  return match?.[1] ?? "";
}

function detectImageMimeType(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export async function validateTutorDocumentFile(
  file: FormDataEntryValue | null,
): Promise<ValidatedTutorDocumentFile> {
  if (!(file instanceof File)) {
    throw new Error("请选择要上传的图片。");
  }

  if (file.size <= 0) {
    throw new Error("图片内容无法识别，请重新选择。");
  }

  if (file.size > MAX_TUTOR_DOCUMENT_BYTES) {
    throw new Error("单张图片不能超过5MB。");
  }

  if (!allowedMimeTypes.includes(file.type as ValidatedTutorDocumentFile["mimeType"])) {
    throw new Error("仅支持JPG、PNG或WebP图片。");
  }

  const extension = getExtension(file.name);
  const mimeType = file.type as ValidatedTutorDocumentFile["mimeType"];
  const allowedExtensions = extensionByMimeType[mimeType];

  if (
    !allowedExtensions.includes(
      extension as ValidatedTutorDocumentFile["extension"],
    )
  ) {
    throw new Error("仅支持JPG、PNG或WebP图片。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMimeType = detectImageMimeType(buffer);

  if (!detectedMimeType || detectedMimeType !== mimeType) {
    throw new Error("图片内容无法识别，请重新选择。");
  }

  return {
    buffer,
    extension: extension as ValidatedTutorDocumentFile["extension"],
    mimeType,
    originalName: file.name,
    sizeBytes: file.size,
  };
}

export function formatTutorDocumentSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;
}

export function isSchoolProofDocument(document: TutorVerificationDocument) {
  return schoolProofTypes.includes(document.type);
}

export function canEditTutorDocuments(
  certificationStatus: CertificationStatus,
  documents: Array<Pick<TutorVerificationDocument, "status">>,
) {
  return !(
    certificationStatus === CertificationStatus.PENDING &&
    documents.some((document) => document.status === TutorDocumentStatus.SUBMITTED)
  );
}

export async function documentFileExists(
  document: Pick<TutorVerificationDocument, "storageKey">,
) {
  return privateFileStorage.exists(document.storageKey);
}
