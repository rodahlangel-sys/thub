import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentSection } from "@/components/parent/ParentSection";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import {
  formatOrderCurrency,
  formatParentDateTime,
  getParentOrderStatusLabel,
  safeText,
} from "@/lib/parent-display";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { submitReviewAction } from "./actions";

type ParentReviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

const scoreOptions = [5, 4, 3, 2, 1];
const scoreFields = [
  ["scorePunctuality", "守时情况"],
  ["scoreClarity", "讲解清晰度"],
  ["scoreCommunication", "沟通态度"],
  ["scoreAcceptance", "孩子接受度"],
];

export default async function ParentReviewPage({
  params,
  searchParams,
}: ParentReviewPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const order = await prisma.order.findFirst({
    where: {
      id,
      parentId: user.id,
    },
    include: {
      tutor: {
        select: {
          name: true,
          tutorProfile: {
            select: {
              school: true,
              major: true,
            },
          },
        },
      },
      lessonFeedback: true,
      review: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  const canReview = order.status === "COMPLETED" && !order.review;

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">服务评价</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">评价本次辅导</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            结合本次上课体验，给老师留下真实反馈。
          </p>
        </div>
        <ButtonLink href={`/parent/orders/${order.id}`} variant="outline">
          返回订单详情
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6 content-start">
          <ParentSection title="本次辅导">
            <Card className="p-6">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">老师</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.tutor.name, "老师信息待完善")}
                    {order.tutor.tutorProfile
                      ? ` · ${safeText(order.tutor.tutorProfile.school, "学校待完善")} ${safeText(
                          order.tutor.tutorProfile.major,
                          "专业待完善",
                        )}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">科目</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {safeText(order.subject, "科目信息待确认")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">时间</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {formatParentDateTime(order.scheduledTime)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">课时与金额</dt>
                  <dd className="mt-1 font-semibold text-[#1f2d2d]">
                    {order.hours} 小时 · {formatOrderCurrency(order.totalAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">订单状态</dt>
                  <dd className="mt-1">
                    <Badge tone="green">{getParentOrderStatusLabel(order.status)}</Badge>
                  </dd>
                </div>
              </dl>
            </Card>
          </ParentSection>

          {order.lessonFeedback ? (
            <ParentSection title="老师反馈">
              <Card className="p-6">
                <p className="text-sm font-semibold text-[#244b5b]">本次辅导内容</p>
                <p className="mt-2 text-sm leading-6 text-[#536861]">
                  {safeText(order.lessonFeedback.content)}
                </p>
                <p className="mt-5 text-sm font-semibold text-[#244b5b]">孩子掌握情况</p>
                <p className="mt-2 text-sm leading-6 text-[#536861]">
                  {safeText(order.lessonFeedback.studentPerformance)}
                </p>
              </Card>
            </ParentSection>
          ) : null}
        </div>

        <ParentSection title={order.review ? "已提交评价" : "填写评价"}>
          <Card className="p-6">
            {order.review ? (
              <>
                <p className="text-3xl font-bold text-[#116a6c]">
                  {order.review.overallScore.toFixed(1)} 分
                </p>
                <p className="mt-4 leading-6 text-[#536861]">{safeText(order.review.comment)}</p>
              </>
            ) : (
              <>
                {query.error ? (
                  <NoticeStrip className="mb-5" tone="red">
                    {query.error}
                  </NoticeStrip>
                ) : null}
                <form action={submitReviewAction} className="space-y-5">
                  <input name="orderId" type="hidden" value={order.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {scoreFields.map(([name, label]) => (
                      <label className="block text-sm font-semibold text-[#244b5b]" key={name}>
                        {label}
                        <select
                          className="mt-2 h-12 w-full rounded-xl border border-[#d6e2df] bg-white px-4 outline-none focus:border-[#116a6c] focus:ring-4 focus:ring-[#d7ebe6]"
                          disabled={!canReview}
                          name={name}
                          defaultValue="5"
                        >
                          {scoreOptions.map((score) => (
                            <option key={score} value={score}>
                              {score} 分
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <label className="block text-sm font-semibold text-[#244b5b]">
                    综合感受
                    <textarea
                      className="mt-2 min-h-32 w-full rounded-xl border border-[#d6e2df] bg-white px-4 py-3 outline-none focus:border-[#116a6c] focus:ring-4 focus:ring-[#d7ebe6]"
                      disabled={!canReview}
                      maxLength={300}
                      name="comment"
                      placeholder="可以写写老师讲解、沟通和孩子接受情况"
                      required
                    />
                  </label>

                  <Button className="h-12 w-full text-base" disabled={!canReview} type="submit">
                    提交评价
                  </Button>
                  {!canReview ? (
                    <p className="text-sm text-[#708188]">订单完成后才能评价，且每个订单只能评价一次。</p>
                  ) : null}
                </form>
              </>
            )}
          </Card>
        </ParentSection>
      </div>
    </PageShell>
  );
}
