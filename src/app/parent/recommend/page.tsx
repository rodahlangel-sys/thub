import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentEmptyState } from "@/components/parent/ParentEmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import {
  formatCurrency,
  formatParentDate,
  getParentDemandStatusLabel,
  getParentDemandStatusTone,
  safeText,
} from "@/lib/parent-display";
import { getDashboardPath, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export default async function ParentRecommendPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const demands = await prisma.demand.findMany({
    where: { parentId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">推荐老师</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">选择一条需求查看匹配结果</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            每条需求会按照科目、区域、时间和预算推荐合适的大学生家教。
          </p>
        </div>
        <ButtonLink href="/parent/demands/new">发布新需求</ButtonLink>
      </div>

      {demands.length > 0 ? (
        <div className="grid gap-4">
          {demands.map((demand) => (
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
                  <p className="mt-3 text-sm leading-6 text-[#66736e]">
                    {safeText(demand.area)} · {getTeachModeLabel(demand.teachMode)} ·{" "}
                    {formatCurrency(demand.budgetMin)} - {formatCurrency(demand.budgetMax)} / 小时 ·{" "}
                    {formatParentDate(demand.createdAt)}
                  </p>
                  {demand.status === "CLOSED" ? (
                    <p className="mt-2 text-sm text-[#8a650e]">这条需求已结束，推荐结果仅供查看。</p>
                  ) : null}
                </div>
                <ButtonLink href={`/parent/demands/${demand.id}/recommend`}>
                  查看推荐老师
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <ParentEmptyState
          action={<ButtonLink href="/parent/demands/new">发布需求</ButtonLink>}
          description="发布家教需求后，就可以在这里查看合适的大学生家教。"
          title="还没有可推荐的需求"
        />
      )}
    </PageShell>
  );
}
