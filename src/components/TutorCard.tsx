import Link from "next/link";
import { BookOpen, MapPin, Star } from "lucide-react";
import type { TutorProfile, User } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { getCertificationStatusLabel, getTeachModeLabel } from "@/lib/roles";

type TutorCardProps = {
  tutor: TutorProfile & {
    user: Pick<User, "name">;
  };
};

export function TutorCard({ tutor }: TutorCardProps) {
  const subjectTags = tutor.subjects
    .split(/[，,、/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  const areaTags = tutor.areas
    .split(/[，,、/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#d9ded6] bg-[#fffdf8] p-5 shadow-[0_1px_2px_rgba(18,45,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#bad8cf] hover:shadow-[0_16px_34px_rgba(54,66,58,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="text-lg font-semibold text-[#1f2d2d] transition hover:text-[#116a6c]"
            href={`/tutors/${tutor.id}`}
          >
            {tutor.user.name}
          </Link>
          <p className="mt-1 text-sm leading-6 text-[#66736e]">
            {tutor.school}｜{tutor.major}｜{tutor.grade}
          </p>
        </div>
        <Badge tone={tutor.certificationStatus === "APPROVED" ? "green" : "yellow"}>
          {getCertificationStatusLabel(tutor.certificationStatus)}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {subjectTags.length > 0 ? (
          subjectTags.map((subject) => (
            <span
              className="rounded-full bg-[#e8f3ef] px-2.5 py-1 text-xs font-medium text-[#1f6f58]"
              key={subject}
            >
              {subject}
            </span>
          ))
        ) : (
          <span className="text-sm text-[#66736e]">科目待完善</span>
        )}
      </div>

      <div className="mt-4 grid gap-2 text-sm text-[#52625d]">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 text-[#116a6c]" aria-hidden />
          {areaTags.length > 0 ? areaTags.join("、") : "服务区域待完善"}
        </p>
        <p className="flex items-center gap-2">
          <BookOpen className="size-4 text-[#116a6c]" aria-hidden />
          {getTeachModeLabel(tutor.teachMode)}
        </p>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#66736e]">
        {tutor.introduction || "老师暂未填写详细简介，可先查看科目、区域和评分记录。"}
      </p>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#ebe6dc] pt-4">
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold text-[#116a6c]">
            <Star className="size-4 fill-[#e2a446] text-[#e2a446]" aria-hidden />
            {tutor.rating.toFixed(1)} 分
            <span className="text-[#8a9690]">· {tutor.orderCount} 单</span>
          </p>
          <p className="mt-1 text-xs text-[#66736e]">
            {tutor.priceMin}-{tutor.priceMax} 元/小时
          </p>
        </div>
        <ButtonLink href={`/tutors/${tutor.id}`} variant="outline">
          查看详情
        </ButtonLink>
      </div>
    </article>
  );
}
