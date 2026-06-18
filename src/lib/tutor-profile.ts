import type { CertificationStatus, TeachMode, TutorProfile } from "@prisma/client";

type ProfileForCompleteness = Pick<
  TutorProfile,
  | "school"
  | "major"
  | "grade"
  | "subjects"
  | "teachLevels"
  | "areas"
  | "teachMode"
  | "availableTimes"
  | "priceMin"
  | "priceMax"
  | "introduction"
  | "experience"
>;

const requiredFields: Array<keyof ProfileForCompleteness> = [
  "school",
  "major",
  "grade",
  "subjects",
  "teachLevels",
  "areas",
  "teachMode",
  "availableTimes",
  "priceMin",
  "priceMax",
  "introduction",
  "experience",
];

function isFilled(value: string | number | TeachMode | null | undefined) {
  if (typeof value === "number") {
    return value > 0;
  }

  return typeof value === "string" && value.trim().length > 0 && value !== "待完善";
}

export function getTutorProfileCompleteness(profile: ProfileForCompleteness | null) {
  if (!profile) {
    return {
      completed: 0,
      total: requiredFields.length,
      percentage: 0,
    };
  }

  const completed = requiredFields.filter((field) => isFilled(profile[field])).length;

  return {
    completed,
    total: requiredFields.length,
    percentage: Math.round((completed / requiredFields.length) * 100),
  };
}

export function getTutorCertificationMessage(status: CertificationStatus) {
  const messages: Record<CertificationStatus, string> = {
    PENDING: "资料已提交，等待平台审核。",
    APPROVED: "已通过平台认证，可在家教列表中展示。",
    REJECTED: "资料未通过审核，请根据原因修改后重新提交。",
  };

  return messages[status];
}
