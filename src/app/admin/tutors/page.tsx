import { CertificationStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCertificationStatusLabel,
  getDashboardPath,
} from "@/lib/roles";

type AdminTutorsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

const statusOptions = [
  { label: "全部", value: "" },
  { label: "待审核", value: CertificationStatus.PENDING },
  { label: "已认证", value: CertificationStatus.APPROVED },
  { label: "未通过", value: CertificationStatus.REJECTED },
];

const statusTone = {
  PENDING: "yellow",
  APPROVED: "green",
  REJECTED: "red",
} as const;

export default async function AdminTutorsPage({
  searchParams,
}: AdminTutorsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const params = (await searchParams) ?? {};
  const status =
    params.status && params.status in CertificationStatus
      ? (params.status as CertificationStatus)
      : "";
  const keyword = params.q?.trim() ?? "";

  const tutors = await prisma.tutorProfile.findMany({
    where: {
      ...(status ? { certificationStatus: status } : {}),
      ...(keyword
        ? {
            OR: [
              { school: { contains: keyword } },
              { major: { contains: keyword } },
              { subjects: { contains: keyword } },
              { user: { is: { name: { contains: keyword } } } },
              { user: { is: { email: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ certificationStatus: "asc" }, { createdAt: "desc" }],
  });

  return (
    <AdminShell>
        <PageHeader
          actions={<ButtonLink href="/admin">返回后台首页</ButtonLink>}
          description="查看大学生家教资料，处理待审核、已认证和未通过记录。"
          eyebrow="家教认证审核"
          title="大学生家教资料"
        />

        <Card className="mt-6 p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" action="/admin/tutors">
            <label>
              <span className="text-xs font-medium text-[#60727a]">认证状态</span>
              <select
                className="mt-1 h-10 w-full rounded-md border border-[#cbd8dc] bg-white px-3 text-sm"
                defaultValue={status}
                name="status"
              >
                {statusOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-medium text-[#60727a]">关键词</span>
              <input
                className="mt-1 h-10 w-full rounded-md border border-[#cbd8dc] bg-white px-3 text-sm"
                defaultValue={keyword}
                name="q"
                placeholder="姓名、邮箱、学校、专业、科目"
              />
            </label>

            <button
              className="mt-5 h-10 rounded-md bg-[#176b87] px-5 text-sm font-semibold text-white hover:bg-[#12566d] md:mt-auto"
              type="submit"
            >
              查询
            </button>
          </form>
        </Card>

        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-[#d9e3e6] bg-[#f8fbfc] text-[#60727a]">
                <tr>
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">邮箱</th>
                  <th className="px-4 py-3 font-medium">学校/专业</th>
                  <th className="px-4 py-3 font-medium">科目</th>
                  <th className="px-4 py-3 font-medium">服务区域</th>
                  <th className="px-4 py-3 font-medium">价格区间</th>
                  <th className="px-4 py-3 font-medium">认证状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {tutors.map((tutor) => (
                  <tr className="border-b border-[#edf1f2]" key={tutor.id}>
                    <td className="px-4 py-3 font-medium text-[#182f38]">
                      {tutor.user.name}
                    </td>
                    <td className="px-4 py-3 text-[#60727a]">{tutor.user.email}</td>
                    <td className="px-4 py-3 text-[#60727a]">
                      {tutor.school} / {tutor.major}
                    </td>
                    <td className="px-4 py-3 text-[#60727a]">{tutor.subjects}</td>
                    <td className="px-4 py-3 text-[#60727a]">{tutor.areas}</td>
                    <td className="px-4 py-3 text-[#60727a]">
                      {tutor.priceMin}-{tutor.priceMax} 元/小时
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[tutor.certificationStatus]}>
                        {getCertificationStatusLabel(tutor.certificationStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[#60727a]">
                      {tutor.createdAt.toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <ButtonLink href={`/admin/tutors/${tutor.id}`} variant="outline">
                        查看审核
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {tutors.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              description="可以调整状态筛选或关键词后重新查询。"
              title="没有找到符合条件的家教资料"
            />
          </div>
        ) : null}
      </AdminShell>
  );
}
