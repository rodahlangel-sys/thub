import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/Button";
import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatShortOrderId } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type AdminFeedbacksPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function AdminFeedbacksPage({
  searchParams,
}: AdminFeedbacksPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const keyword = query.q?.trim() ?? "";

  const feedbacks = await prisma.lessonFeedback.findMany({
    where: {
      ...(keyword
        ? {
            OR: [
              { content: { contains: keyword } },
              { order: { is: { subject: { contains: keyword } } } },
              { order: { is: { parent: { is: { name: { contains: keyword } } } } } },
              { tutor: { is: { name: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    include: {
      tutor: { select: { name: true } },
      order: {
        select: {
          id: true,
          subject: true,
          parent: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell>
        <PageHeader
          description="查看大学生家教提交的课后反馈记录。"
          eyebrow="后台管理"
          title="课后反馈"
        />

        <div className="mt-6 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            <input
              className="h-10 rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
              defaultValue={keyword}
              name="q"
              placeholder="搜索老师、家长、科目或辅导内容"
            />
            <Button type="submit">搜索</Button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#d9e3e6] bg-white">
          {feedbacks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-[#eef3f5] text-xs font-semibold text-[#60727a]">
                  <tr>
                    <th className="px-4 py-3">订单编号</th>
                    <th className="px-4 py-3">老师</th>
                    <th className="px-4 py-3">家长</th>
                    <th className="px-4 py-3">科目</th>
                    <th className="px-4 py-3">本次辅导内容</th>
                    <th className="px-4 py-3">提交时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f3]">
                  {feedbacks.map((feedback) => (
                    <tr className="text-[#244b5b]" key={feedback.id}>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-[#176b87] hover:text-[#12566d]" href={`/admin/orders/${feedback.order.id}`}>
                          {formatShortOrderId(feedback.order.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-4">{feedback.tutor.name}</td>
                      <td className="px-4 py-4">{feedback.order.parent.name}</td>
                      <td className="px-4 py-4">{feedback.order.subject}</td>
                      <td className="max-w-md px-4 py-4 leading-6">{feedback.content}</td>
                      <td className="px-4 py-4">{formatDateTime(feedback.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="当前筛选条件下没有课后反馈记录。"
              title="暂无课后反馈"
            />
          )}
        </div>
      </AdminShell>
  );
}
