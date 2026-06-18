import type { ParentProfile } from "@prisma/client";

function isFilled(value: string | null | undefined) {
  const normalized = value?.trim();

  return Boolean(normalized && normalized !== "待完善");
}

export function getParentProfileCompleteness(
  profile: Pick<ParentProfile, "area" | "childInfo"> | null,
  phone: string,
) {
  const items = [
    isFilled(phone),
    isFilled(profile?.area),
    isFilled(profile?.childInfo),
  ];
  const completed = items.filter(Boolean).length;
  const total = items.length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}
