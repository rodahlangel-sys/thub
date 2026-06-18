import { redirect } from "next/navigation";
import { DemandStatus, UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { getDashboardPath, getDemandStatusLabel, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { closeAdminDemandAction, reopenAdminDemandAction } from "./actions";

type AdminDemandDetailPageProps = {
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

export default async function AdminDemandDetailPage({
  params,
  searchParams,
}: AdminDemandDetailPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const { success } = await searchParams;
  const demand = await prisma.demand.findUnique({
    where: { id },
    include: {
      parent: {
        select: {
          email: true,
          name: true,
          phone: true,
          parentProfile: {
            select: {
              area: true,
            },
          },
        },
      },
    },
  });

  if (!demand) {
    redirect("/admin/demands");
  }

  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          actions={<ButtonLink href="/admin/demands" variant="outline">返回需求管理</ButtonLink>}
          description="查看家长需求和联系方式，处理需求关闭或重新开放。"
          eyebrow="需求详情"
          title={`${demand.childGrade} ${demand.subject}辅导`}
        />

        {success ? (
          <div className="mt-6 rounded-md border border-[#b9d8c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#27734d]">
            {success}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#182f38]">需求信息</h2>
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
                <dt className="text-sm text-[#708188]">区域</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{demand.area}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">上课方式</dt>
                <dd className="mt-1 font-medium text-[#182f38]">{getTeachModeLabel(demand.teachMode)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#708188]">预算</dt>
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

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">家长信息</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.parent.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">邮箱</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.parent.email}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">手机号</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.parent.phone}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">家长资料区域</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.parent.parentProfile?.area || "未填写"}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">管理操作</h2>
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
              <div className="mt-6 flex flex-wrap gap-3">
                {demand.status !== "CLOSED" ? (
                  <form action={closeAdminDemandAction}>
                    <input name="demandId" type="hidden" value={demand.id} />
                    <Button type="submit" variant="danger">关闭需求</Button>
                  </form>
                ) : (
                  <form action={reopenAdminDemandAction}>
                    <input name="demandId" type="hidden" value={demand.id} />
                    <Button type="submit">重新开放</Button>
                  </form>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </main>
  );
}
