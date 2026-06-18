import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatShortOrderId } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminReviewsPageProps = {
  searchParams?: Promise<{
    q?: string;
    score?: string;
  }>;
};

const scoreOptions = [
  { value: "ALL", label: "全部" },
  { value: "5", label: "5分" },
  { value: "4plus", label: "4分及以上" },
  { value: "3minus", label: "3分及以下" },
];

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const keyword = query.q?.trim() ?? "";
  const score = query.score ?? "ALL";

  const reviews = await prisma.review.findMany({
    where: {
      ...(score === "5" ? { overallScore: 5 } : {}),
      ...(score === "4plus" ? { overallScore: { gte: 4 } } : {}),
      ...(score === "3minus" ? { overallScore: { lte: 3 } } : {}),
      ...(keyword
        ? {
            OR: [
              { comment: { contains: keyword } },
              { order: { is: { subject: { contains: keyword } } } },
              { parent: { is: { name: { contains: keyword } } } },
              { tutor: { is: { name: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    include: {
      parent: { select: { name: true } },
      tutor: { select: { name: true } },
      order: { select: { id: true, subject: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell>
        <PageHeader
          description="查看家长提交的服务评价，按评分和关键词筛选。"
          eyebrow="后台管理"
          title="评价管理"
        />

        <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            {score !== "ALL" ? <input name="score" type="hidden" value={score} /> : null}
            <input
              className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={keyword}
              name="q"
              placeholder="搜索家长、老师、科目或评价内容"
            />
            <Button type="submit">搜索</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {scoreOptions.map((option) => {
              const params = new URLSearchParams();
              if (option.value !== "ALL") {
                params.set("score", option.value);
              }
              if (keyword) {
                params.set("q", keyword);
              }
              const href = params.toString()
                ? `/admin/reviews?${params.toString()}`
                : "/admin/reviews";
              const isActive = score === option.value;

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
          {reviews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full text-left text-sm">
                <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                  <tr>
                    <th className="px-4 py-3">订单编号</th>
                    <th className="px-4 py-3">家长</th>
                    <th className="px-4 py-3">老师</th>
                    <th className="px-4 py-3">科目</th>
                    <th className="px-4 py-3">综合评分</th>
                    <th className="px-4 py-3">评价内容</th>
                    <th className="px-4 py-3">评价时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f3]">
                  {reviews.map((review) => (
                    <tr className="text-[#244b5b]" key={review.id}>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-[#176b87] hover:text-[#12566d]" href={`/admin/orders/${review.order.id}`}>
                          {formatShortOrderId(review.order.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{review.parent.name}</td>
                      <td className="px-4 py-4">{review.tutor.name}</td>
                      <td className="px-4 py-4">{review.order.subject}</td>
                      <td className="px-4 py-4">
                        <Badge tone="blue">{review.overallScore.toFixed(1)} 分</Badge>
                      </td>
                      <td className="max-w-sm px-4 py-4 leading-6">{review.comment}</td>
                      <td className="px-4 py-4">{formatDateTime(review.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="当前筛选条件下没有评价记录。"
              title="暂无评价"
            />
          )}
        </div>
      </AdminShell>
  );
}
