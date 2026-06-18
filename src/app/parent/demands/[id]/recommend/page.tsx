import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentEmptyState } from "@/components/parent/ParentEmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { matchTutorsForDemand } from "@/lib/matching";
import { requireUser } from "@/lib/auth";
import {
  formatCurrency,
  getFitLabel,
  getFitTone,
  getParentDemandStatusLabel,
  getParentDemandStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type DemandRecommendPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    filter?: string;
    sort?: string;
  }>;
};

export default async function DemandRecommendPage({
  params,
  searchParams,
}: DemandRecommendPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const demand = await prisma.demand.findFirst({
    where: {
      id,
      parentId: user.id,
    },
  });

  if (!demand) {
    redirect("/parent/demands");
  }

  const tutors = await prisma.tutorProfile.findMany({
    where: { certificationStatus: "APPROVED" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  let results = matchTutorsForDemand(demand, tutors);

  if (query.filter === "high80") {
    results = results.filter((result) => result.matchPercent >= 80);
  }

  if (query.sort === "priceAsc") {
    results = [...results].sort((left, right) => {
      if (left.tutor.priceMin !== right.tutor.priceMin) {
        return left.tutor.priceMin - right.tutor.priceMin;
      }

      return right.matchPercent - left.matchPercent;
    });
  } else if (query.sort === "ratingDesc") {
    results = [...results].sort((left, right) => {
      if (right.tutor.rating !== left.tutor.rating) {
        return right.tutor.rating - left.tutor.rating;
      }

      return right.matchPercent - left.matchPercent;
    });
  }

  const filterLinks = [
    { label: "综合推荐", href: `/parent/demands/${demand.id}/recommend`, active: !query.filter && !query.sort },
    { label: "只看非常合适", href: `/parent/demands/${demand.id}/recommend?filter=high80`, active: query.filter === "high80" },
    { label: "价格从低到高", href: `/parent/demands/${demand.id}/recommend?sort=priceAsc`, active: query.sort === "priceAsc" },
    { label: "评分从高到低", href: `/parent/demands/${demand.id}/recommend?sort=ratingDesc`, active: query.sort === "ratingDesc" },
  ];

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">推荐老师</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">
            {safeText(demand.childGrade)} {safeText(demand.subject)}的推荐大学生
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#66736e]">
            {safeText(demand.area)} · {getTeachModeLabel(demand.teachMode)} · {safeText(demand.expectedTime)} · 预算{" "}
            {formatCurrency(demand.budgetMin)} - {formatCurrency(demand.budgetMax)} / 小时
          </p>
        </div>
        <ButtonLink href="/parent/demands" variant="outline">
          返回我的需求
        </ButtonLink>
      </div>

      {demand.status === "CLOSED" ? (
        <div className="mb-6 rounded-2xl border border-[#ead8a6] bg-[#fff8e5] px-5 py-4 text-sm text-[#8a650e]">
          这条需求已结束，推荐结果仅供查看。
        </div>
      ) : null}

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#116a6c]">需求摘要</p>
            <p className="mt-2 text-lg font-bold text-[#1f2d2d]">
              {safeText(demand.childGrade)} · {safeText(demand.subject)} · {safeText(demand.area)}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736e]">
              {safeText(demand.goal, "学习目标待补充")}
            </p>
          </div>
          <Badge tone={getParentDemandStatusTone(demand.status)}>
            {getParentDemandStatusLabel(demand.status)}
          </Badge>
        </div>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        {filterLinks.map((item) => (
          <Link
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              item.active
                ? "border-[#116a6c] bg-[#116a6c] text-white"
                : "border-[#d6e2df] bg-white text-[#536861] hover:border-[#116a6c]"
            }`}
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4">
          {results.map((result) => (
            <Card className="p-5 sm:p-6" key={result.tutor.id}>
              <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-[#1f2d2d]">
                      {safeText(result.tutor.user.name, "老师信息待完善")}
                    </h2>
                    <Badge tone="green">已认证</Badge>
                    <Badge tone={getFitTone(result.matchPercent)}>
                      {getFitLabel(result.matchPercent)}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-[#66736e]">
                    {safeText(result.tutor.school, "学校待完善")} · {safeText(result.tutor.major, "专业待完善")} ·{" "}
                    {safeText(result.tutor.grade, "年级待完善")}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-[#536861] md:grid-cols-2 lg:grid-cols-3">
                    <p>可教科目：{safeText(result.tutor.subjects, "科目信息待完善")}</p>
                    <p>服务区域：{safeText(result.tutor.areas, "区域待完善")}</p>
                    <p>上课方式：{getTeachModeLabel(result.tutor.teachMode)}</p>
                    <p>
                      价格：{formatCurrency(result.tutor.priceMin)} - {formatCurrency(result.tutor.priceMax)} / 小时
                    </p>
                    <p>评分：{result.tutor.rating.toFixed(1)} 分</p>
                    <p>接单：{result.tutor.orderCount} 单</p>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#66736e]">
                    {safeText(result.tutor.introduction, "老师暂未填写详细介绍。")}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.reasons.slice(0, 3).map((reason) => (
                      <Badge key={reason} tone="blue">
                        {safeText(reason, "资料可供参考")}
                      </Badge>
                    ))}
                    {result.warnings.length > 0 ? (
                      <Badge tone="yellow">价格或时间需要再确认</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:flex-col lg:items-stretch">
                  <ButtonLink href={`/parent/demands/${demand.id}/book/${result.tutor.id}`}>
                    发起预约
                  </ButtonLink>
                  <ButtonLink href={`/tutors/${result.tutor.id}`} variant="outline">
                    查看资料
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <ParentEmptyState
          action={<ButtonLink href={`/parent/demands/${demand.id}/recommend`}>查看全部推荐</ButtonLink>}
          description="当前筛选下没有合适老师，可以放宽条件或稍后再看。"
          title="暂时没有符合条件的推荐"
        />
      )}
    </PageShell>
  );
}
