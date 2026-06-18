import type { TutorProfile, User } from "@prisma/client";
import { GraduationCap, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { getCertificationStatusLabel, getTeachModeLabel } from "@/lib/roles";

type TutorProfileHeroProps = {
  tutor: TutorProfile & {
    user: Pick<User, "name">;
  };
  actionHref: string;
  actionText: string;
};

export function TutorProfileHero({
  tutor,
  actionHref,
  actionText,
}: TutorProfileHeroProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d9ded6] bg-[#fffdf8] shadow-[0_18px_46px_rgba(54,66,58,0.10)]">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="green">
              {getCertificationStatusLabel(tutor.certificationStatus)}
            </Badge>
            <Badge tone="blue">{getTeachModeLabel(tutor.teachMode)}</Badge>
          </div>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-[#e8f3ef] text-[#116a6c]">
              <GraduationCap className="size-10" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1f2d2d]">
                {tutor.user.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#66736e]">
                {tutor.school}｜{tutor.major}｜{tutor.grade}
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-[#52625d]">
            {tutor.introduction ||
              "老师暂未填写个人简介，可先查看科目、区域和评价记录。"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={actionHref}>{actionText}</ButtonLink>
            <ButtonLink href="/" variant="outline">
              返回首页
            </ButtonLink>
          </div>
        </div>

        <div className="border-t border-[#e5e1d7] bg-white p-6 lg:border-l lg:border-t-0">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-xl bg-[#116a6c] p-4 text-white">
              <div className="flex items-center gap-2">
                <Star className="size-5 fill-white" aria-hidden />
                <span className="text-2xl font-bold">
                  {tutor.rating.toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-white/75">综合评分</p>
            </div>
            <div className="rounded-xl border border-[#dedbd2] bg-[#f8f7f3] p-4">
              <p className="text-2xl font-bold text-[#1f2d2d]">
                {tutor.orderCount}
              </p>
              <p className="mt-1 text-xs text-[#66736e]">接单记录</p>
            </div>
            <div className="rounded-xl border border-[#dedbd2] bg-[#f8f7f3] p-4">
              <div className="flex items-center gap-2 text-[#1f2d2d]">
                <MapPin className="size-4 text-[#116a6c]" aria-hidden />
                <span className="text-sm font-semibold">服务区域</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#66736e]">
                {tutor.areas || "待完善"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
