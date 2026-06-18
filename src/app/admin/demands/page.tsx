import Link from "next/link";
import { redirect } from "next/navigation";
import type { DemandStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { getDashboardPath, getDemandStatusLabel, getTeachModeLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminDemandsPageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

const statusOptions: Array<{ value: "ALL" | DemandStatus; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "OPEN", label: "开放中" },
  { value: "MATCHED", label: "已匹配" },
  { value: "CLOSED", label: "已关闭" },
];

function isDemandStatus(value: string | undefined): value is DemandStatus {
  return value === "OPEN" || value === "MATCHED" || value === "CLOSED";
}

function getDemandStatusTone(status: DemandStatus) {
  if (status === "OPEN") {
    return "green" as const;
  }

  if (status === "MATCHED") {
    return "blue" as const;
  }

  return "gray" as const;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AdminDemandsPage({
  searchParams,
}: AdminDemandsPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const { status, q } = await searchParams;
  const activeStatus = isDemandStatus(status) ? status : undefined;
  const keyword = q?.trim() ?? "";

  const demands = await prisma.demand.findMany({
    where: {
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(keyword
        ? {
            OR: [
              { childGrade: { contains: keyword } },
              { subject: { contains: keyword } },
              { area: { contains: keyword } },
              { parent: { is: { name: { contains: keyword } } } },
              { parent: { is: { email: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    include: {
      parent: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell>
        <PageHeader
          description="查看家长发布的需求，按状态和关键词筛选，必要时关闭或重新开放。"
          eyebrow="后台管理"
          title="需求管理"
        />

        <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            {activeStatus ? <input name="status" type="hidden" value={activeStatus} /> : null}
            <input
              className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={keyword}
              name="q"
              placeholder="搜索家长、邮箱、科目、区域或年级"
            />
            <Button type="submit">搜索</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const params = new URLSearchParams();
              if (option.value !== "ALL") {
                params.set("status", option.value);
              }
              if (keyword) {
                params.set("q", keyword);
              }
              const href = params.toString()
                ? `/admin/demands?${params.toString()}`
                : "/admin/demands";
              const isActive =
                option.value === "ALL" ? !activeStatus : activeStatus === option.value;

              return (
                <Link
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-[#176b87] bg-[#176b87] text-white"
                      : "border-[#cbd9de] bg-white text-[#244b5b] hover:border-[#176b87]"
                  }`}
                  href={href}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#d9e3e6] bg-white">
          {demands.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full text-left text-sm">
                <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                  <tr>
                    <th className="px-4 py-3">家长</th>
                    <th className="px-4 py-3">邮箱</th>
                    <th className="px-4 py-3">年级</th>
                    <th className="px-4 py-3">科目</th>
                    <th className="px-4 py-3">区域</th>
                    <th className="px-4 py-3">方式</th>
                    <th className="px-4 py-3">预算</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">发布时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f3]">
                  {demands.map((demand) => (
                    <tr className="text-[#244b5b]" key={demand.id}>
                      <td className="px-4 py-4 font-medium text-[#182f38]">{demand.parent.name}</td>
                      <td className="px-4 py-4">{demand.parent.email}</td>
                      <td className="px-4 py-4">{demand.childGrade}</td>
                      <td className="px-4 py-4">{demand.subject}</td>
                      <td className="px-4 py-4">{demand.area}</td>
                      <td className="px-4 py-4">{getTeachModeLabel(demand.teachMode)}</td>
                      <td className="px-4 py-4">{demand.budgetMin}-{demand.budgetMax} 元/小时</td>
                      <td className="px-4 py-4">
                        <Badge tone={getDemandStatusTone(demand.status)}>
                          {getDemandStatusLabel(demand.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{formatDate(demand.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-[#176b87] hover:text-[#12566d]" href={`/admin/demands/${demand.id}`}>
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="当前筛选条件下没有家长需求。可以调整状态或关键词后再查看。"
              title="暂无需求"
            />
          )}
        </div>
      </AdminShell>
  );
}
