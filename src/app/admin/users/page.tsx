import Link from "next/link";
import { redirect } from "next/navigation";
import type { UserRole, UserStatus } from "@prisma/client";
import { UserRole as RoleEnum, UserStatus as StatusEnum } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/orders";
import {
  getDashboardPath,
  getRoleLabel,
  getUserStatusLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminUsersPageProps = {
  searchParams?: Promise<{
    role?: string;
    status?: string;
    q?: string;
  }>;
};

const roleOptions: Array<{ value: "ALL" | UserRole; label: string }> = [
  { value: "ALL", label: "全部角色" },
  { value: "PARENT", label: "家长" },
  { value: "TUTOR", label: "大学生家教" },
  { value: "ADMIN", label: "管理员" },
];

const statusOptions: Array<{ value: "ALL" | UserStatus; label: string }> = [
  { value: "ALL", label: "全部状态" },
  { value: "ACTIVE", label: "正常" },
  { value: "DISABLED", label: "已禁用" },
];

function isUserRole(value: string | undefined): value is UserRole {
  return value === RoleEnum.PARENT || value === RoleEnum.TUTOR || value === RoleEnum.ADMIN;
}

function isUserStatus(value: string | undefined): value is UserStatus {
  return value === StatusEnum.ACTIVE || value === StatusEnum.DISABLED;
}

function getStatusTone(status: UserStatus) {
  return status === StatusEnum.ACTIVE ? ("green" as const) : ("red" as const);
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const currentUser = await requireUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== RoleEnum.ADMIN) {
    redirect(getDashboardPath(currentUser.role));
  }

  const query = (await searchParams) ?? {};
  const activeRole = isUserRole(query.role) ? query.role : undefined;
  const activeStatus = isUserStatus(query.status) ? query.status : undefined;
  const keyword = query.q?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(activeRole ? { role: activeRole } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { email: { contains: keyword } },
              { phone: { contains: keyword } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell>
        <PageHeader
          description="查看平台用户账号，按角色、状态和关键词筛选。"
          eyebrow="后台管理"
          title="用户管理"
        />

        <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <form className="grid gap-3 lg:grid-cols-[180px_180px_1fr_auto]" method="get">
            <select
              className="h-10 rounded-md border border-[#cbd9de] bg-white px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={activeRole ?? ""}
              name="role"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value === "ALL" ? "" : option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-[#cbd9de] bg-white px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={activeStatus ?? ""}
              name="status"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value === "ALL" ? "" : option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={keyword}
              name="q"
              placeholder="搜索姓名、邮箱或手机号"
            />
            <Button type="submit">筛选</Button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#d9e3e6] bg-white">
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full text-left text-sm">
                <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                  <tr>
                    <th className="px-4 py-3">用户姓名</th>
                    <th className="px-4 py-3">邮箱</th>
                    <th className="px-4 py-3">手机号</th>
                    <th className="px-4 py-3">用户角色</th>
                    <th className="px-4 py-3">账号状态</th>
                    <th className="px-4 py-3">注册时间</th>
                    <th className="px-4 py-3">最近更新</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f3]">
                  {users.map((user) => (
                    <tr className="text-[#244b5b]" key={user.id}>
                      <td className="px-4 py-4 font-medium text-[#182f38]">{user.name}</td>
                      <td className="px-4 py-4">{user.email}</td>
                      <td className="px-4 py-4">{user.phone}</td>
                      <td className="px-4 py-4">{getRoleLabel(user.role)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={getStatusTone(user.status)}>
                          {getUserStatusLabel(user.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">{formatDateTime(user.createdAt)}</td>
                      <td className="px-4 py-4">{formatDateTime(user.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <Link
                          className="font-semibold text-[#176b87] hover:text-[#12566d]"
                          href={`/admin/users/${user.id}`}
                        >
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
              description="当前筛选条件下没有找到用户。"
              title="暂无用户"
            />
          )}
        </div>
      </AdminShell>
  );
}
