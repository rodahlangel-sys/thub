import { redirect } from "next/navigation";
import { DemandStatus, UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { getDashboardPath, getDemandStatusLabel, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { closeParentDemandAction } from "./actions";

type ParentDemandDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    success?: string;
  }>;
};

function getDemandStatusTone(status: DemandStatus) {
  if (status === "OPEN") {
    return "green" as const;
  }

  if (status === "MATCHED") {
    return "blue" as const;
  }

  return "gray" as const;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function ParentDemandDetailPage({
  params,
  searchParams,
}: ParentDemandDetailPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const { success } = await searchParams;
  const demand = await prisma.demand.findFirst({
    where: {
      id,
      parentId: user.id,
    },
  });

  if (!demand) {
    redirect("/parent/demands");
  }

  return (
    <PageShell>
        <PageHeader
          actions={
            <>
              <ButtonLink href={`/parent/demands/${demand.id}/recommend`}>
                查看推荐老师
              </ButtonLink>
              <ButtonLink href="/parent/demands" variant="outline">返回我的需求</ButtonLink>
            </>
          }
          description="查看这条需求的完整信息，也可以在不再需要时关闭需求。"
          eyebrow="需求详情"
          title={`${demand.childGrade} ${demand.subject}辅导`}
        />

        {success ? (
          <NoticeStrip className="mt-6" tone="green">
            {success}
          </NoticeStrip>
        ) : null}
        {demand.status === "CLOSED" ? (
          <NoticeStrip className="mt-6" tone="yellow">
            需求已关闭，推荐仅供查看。
          </NoticeStrip>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#182f38]">需求内容</h2>
              <Badge tone={getDemandStatusTone(demand.status)}>
                {getDemandStatusLabel(demand.status)}
              </Badge>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-[#708188]">孩子年级</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{demand.childGrade}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">辅导科目</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{demand.subject}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">所在区域</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{demand.area}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">上课方式</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{getTeachModeLabel(demand.teachMode)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">预算范围</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{demand.budgetMin}-{demand.budgetMax} 元/小时</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">期望时间</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{demand.expectedTime}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-[#708188]">辅导目标</dt>
                <dd className="mt-1 leading-7 text-[#244b5b]">{demand.goal}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-[#708188]">补充说明</dt>
                <dd className="mt-1 leading-7 text-[#244b5b]">{demand.description || "暂无补充说明"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-[#182f38]">状态与操作</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-[#708188]">发布时间</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(demand.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[#708188]">最近更新</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(demand.updatedAt)}</dd>
              </div>
            </dl>
            {demand.status !== "CLOSED" ? (
              <form action={closeParentDemandAction} className="mt-6">
                <input name="demandId" type="hidden" value={demand.id} />
                <Button type="submit" variant="danger">关闭需求</Button>
              </form>
            ) : (
              <p className="mt-6 rounded-md bg-[#f6f7f8] px-4 py-3 text-sm text-[#60727a]">
                这条需求已关闭，如需继续找老师，可以重新发布一条需求。
              </p>
            )}
          </Card>
        </div>
    </PageShell>
  );
}
