import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { TutorEmptyState } from "@/components/tutor/TutorEmptyState";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export default async function TutorReviewsPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const [profile, reviews, completedCount] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { userId: user.id },
      select: {
        rating: true,
        orderCount: true,
      },
    }),
    prisma.review.findMany({
      where: { tutorId: user.id },
      include: {
        order: { select: { id: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({
      where: {
        tutorId: user.id,
        status: "COMPLETED",
      },
    }),
  ]);

  return (
    <PageShell>
      <section className="mb-7 rounded-[1.75rem] border border-[#dfe8e4] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(31,79,72,0.07)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#117b7a]">服务评价</p>
            <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">收到的家长评价</h1>
            <p className="mt-3 text-sm text-[#60716c]">
              查看已完成辅导后的评价和反馈。
            </p>
          </div>
          <ButtonLink href="/tutor/orders" variant="outline">
            查看预约管理
          </ButtonLink>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e2ebe7] bg-white px-5 py-4">
            <p className="text-2xl font-bold text-[#0f6f70]">
              {profile ? `${profile.rating.toFixed(1)} 分` : "待完善"}
            </p>
            <p className="mt-1 text-xs text-[#61736e]">当前综合评分</p>
          </div>
          <div className="rounded-2xl border border-[#e2ebe7] bg-white px-5 py-4">
            <p className="text-2xl font-bold text-[#0f6f70]">{reviews.length}</p>
            <p className="mt-1 text-xs text-[#61736e]">收到评价</p>
          </div>
          <div className="rounded-2xl border border-[#e2ebe7] bg-white px-5 py-4">
            <p className="text-2xl font-bold text-[#0f6f70]">
              {profile?.orderCount ?? completedCount}
            </p>
            <p className="mt-1 text-xs text-[#61736e]">完成服务</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Card className="p-6" key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-[#182f38]">
                      {review.order.subject}
                    </h2>
                    <Badge tone="blue">{review.overallScore.toFixed(1)} 分</Badge>
                  </div>
                  <p className="mt-2 text-xs text-[#708188]">
                    {formatDateTime(review.createdAt)}
                  </p>
                </div>
                <ButtonLink href={`/tutor/orders/${review.order.id}`} variant="outline">
                  查看订单
                </ButtonLink>
              </div>
              <p className="mt-4 leading-7 text-[#244b5b]">{review.comment}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-[#f6faf8] px-3 py-2">
                  <dt className="text-[#708188]">守时</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{review.scorePunctuality} 分</dd>
                </div>
                <div className="rounded-xl bg-[#f6faf8] px-3 py-2">
                  <dt className="text-[#708188]">讲解</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{review.scoreClarity} 分</dd>
                </div>
                <div className="rounded-xl bg-[#f6faf8] px-3 py-2">
                  <dt className="text-[#708188]">沟通</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{review.scoreCommunication} 分</dd>
                </div>
                <div className="rounded-xl bg-[#f6faf8] px-3 py-2">
                  <dt className="text-[#708188]">接受度</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{review.scoreAcceptance} 分</dd>
                </div>
              </dl>
            </Card>
          ))
        ) : (
          <TutorEmptyState
            description="完成辅导并由家长评价后，评价会显示在这里。"
            title="暂无家长评价"
          />
        )}
      </div>
    </PageShell>
  );
}
