import Link from "next/link";
import { redirect } from "next/navigation";
import type { DemandStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentEmptyState } from "@/components/parent/ParentEmptyState";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { matchTutorsForDemand } from "@/lib/matching";
import {
  formatCurrency,
  formatParentDate,
  getParentDemandStatusLabel,
  getParentDemandStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type ParentDemandsPageProps = {
  searchParams: Promise<{
    status?: string;
    success?: string;
  }>;
};

const statusOptions: Array<{ value: "ALL" | DemandStatus; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "OPEN", label: "正在寻找老师" },
  { value: "MATCHED", label: "已进入预约" },
  { value: "CLOSED", label: "已结束" },
];

function isDemandStatus(value: string | undefined): value is DemandStatus {
  return value === "OPEN" || value === "MATCHED" || value === "CLOSED";
}

export default async function ParentDemandsPage({ searchParams }: ParentDemandsPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { status, success } = await searchParams;
  const activeStatus = isDemandStatus(status) ? status : undefined;
  const [demands, approvedTutors] = await Promise.all([
    prisma.demand.findMany({
      where: {
        parentId: user.id,
        ...(activeStatus ? { status: activeStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tutorProfile.findMany({
      where: { certificationStatus: "APPROVED" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const recommendationCounts = new Map(
    demands.map((demand) => [
      demand.id,
      demand.status === "OPEN" ? matchTutorsForDemand(demand, approvedTutors).length : 0,
    ]),
  );

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">我的需求</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">已发布的家教需求</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            查看每条需求当前进展，并从开放需求进入推荐老师列表。
          </p>
        </div>
        <ButtonLink href="/parent/demands/new">发布新需求</ButtonLink>
      </div>

      {success ? (
        <NoticeStrip className="mb-6" tone="green">
          {success}
        </NoticeStrip>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {statusOptions.map((option) => {
          const href = option.value === "ALL" ? "/parent/demands" : `/parent/demands?status=${option.value}`;
          const isActive = option.value === "ALL" ? !activeStatus : activeStatus === option.value;

          return (
            <Link
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-[#116a6c] bg-[#116a6c] text-white"
                  : "border-[#d6e2df] bg-white text-[#536861] hover:border-[#116a6c]"
              }`}
              href={href}
              key={option.value}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {demands.length > 0 ? (
        <div className="grid gap-4">
          {demands.map((demand) => {
            const recommendationCount = recommendationCounts.get(demand.id) ?? 0;
            const action =
              demand.status === "OPEN"
                ? { label: "查看推荐老师", href: `/parent/demands/${demand.id}/recommend` }
                : { label: "查看需求", href: `/parent/demands/${demand.id}` };

            return (
              <Card className="p-5 sm:p-6" key={demand.id}>
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-[#1f2d2d]">
                        {safeText(demand.childGrade)} · {safeText(demand.subject)}
                      </h2>
                      <Badge tone={getParentDemandStatusTone(demand.status)}>
                        {getParentDemandStatusLabel(demand.status)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-[#536861] md:grid-cols-2 lg:grid-cols-4">
                      <p>区域：{safeText(demand.area)}</p>
                      <p>方式：{getTeachModeLabel(demand.teachMode)}</p>
                      <p>
                        预算：{formatCurrency(demand.budgetMin)} - {formatCurrency(demand.budgetMax)} / 小时
                      </p>
                      <p>发布：{formatParentDate(demand.createdAt)}</p>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#66736e]">
                      {safeText(demand.goal, "学习目标待补充")}
                    </p>

                    {demand.status === "OPEN" ? (
                      <p className="mt-3 text-sm font-medium text-[#116a6c]">
                        {recommendationCount > 0
                          ? `已找到 ${recommendationCount} 位可进一步了解的老师`
                          : "暂时没有合适推荐，可以稍后再看"}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <ButtonLink href={action.href}>{action.label}</ButtonLink>
                    <ButtonLink href={`/parent/demands/${demand.id}`} variant="outline">
                      需求详情
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <ParentEmptyState
          action={<ButtonLink href="/parent/demands/new">发布第一条需求</ButtonLink>}
          description="写清楚孩子年级、科目、区域和预算后，就可以查看推荐老师。"
          title="暂时没有家教需求"
        />
      )}
    </PageShell>
  );
}
