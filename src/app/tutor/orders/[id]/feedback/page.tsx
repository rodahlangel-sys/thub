import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/orders";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { canSubmitLessonFeedback } from "@/lib/order-status";
import {
  formatTutorMoney,
  formatTutorParentName,
  getTutorOrderStatusLabel,
  getTutorTeachModeLabel,
} from "@/lib/tutor-display";
import { submitLessonFeedbackAction } from "./actions";

type TutorFeedbackPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

const textareaClassName =
  "mt-2 min-h-28 w-full rounded-xl border border-[#cbd9de] px-3 py-3 text-sm outline-none transition focus:border-[#117b7a] focus:ring-2 focus:ring-[#d7ebf0]";

export default async function TutorFeedbackPage({ params, searchParams }: TutorFeedbackPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const order = await prisma.order.findFirst({
    where: {
      id,
      tutorId: user.id,
    },
    include: {
      parent: { select: { name: true } },
      lessonFeedback: true,
    },
  });

  if (!order) {
    redirect("/tutor/orders");
  }

  const canSubmit =
    !order.lessonFeedback &&
    canSubmitLessonFeedback(order.status);

  return (
    <PageShell>
      <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#117b7a]">课后反馈</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">
            {order.subject} 课后反馈
          </h1>
          <p className="mt-3 text-sm text-[#60716c]">
            记录本次辅导内容、孩子掌握情况和下次建议。
          </p>
        </div>
        <ButtonLink href={`/tutor/orders/${order.id}`} variant="outline">
          返回订单
        </ButtonLink>
      </section>

      {query.error ? (
        <div className="mb-6 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-[#182f38]">本次辅导</h2>
            <Badge tone="blue">{getTutorOrderStatusLabel(order.status)}</Badge>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-[#708188]">家长</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {formatTutorParentName(order.parent.name)}
              </dd>
            </div>
            <div>
              <dt className="text-[#708188]">科目</dt>
              <dd className="mt-1 font-medium text-[#182f38]">{order.subject}</dd>
            </div>
            <div>
              <dt className="text-[#708188]">时间</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {formatDateTime(order.scheduledTime)}
              </dd>
            </div>
            <div>
              <dt className="text-[#708188]">方式</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {getTutorTeachModeLabel(order.teachMode)}
              </dd>
            </div>
            <div>
              <dt className="text-[#708188]">课时与金额</dt>
              <dd className="mt-1 font-medium text-[#182f38]">
                {order.hours} 小时 · {formatTutorMoney(order.totalAmount)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          {order.lessonFeedback ? (
            <div>
              <h2 className="font-semibold text-[#182f38]">已提交反馈</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-[#708188]">本次辅导内容</dt>
                  <dd className="mt-1 leading-6 text-[#244b5b]">{order.lessonFeedback.content}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">学生掌握情况</dt>
                  <dd className="mt-1 leading-6 text-[#244b5b]">{order.lessonFeedback.studentPerformance}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">需要继续关注的问题</dt>
                  <dd className="mt-1 leading-6 text-[#244b5b]">{order.lessonFeedback.problems || "暂无"}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">下次建议</dt>
                  <dd className="mt-1 leading-6 text-[#244b5b]">{order.lessonFeedback.nextSuggestion || "暂无"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <form action={submitLessonFeedbackAction} className="space-y-5">
              <input name="orderId" type="hidden" value={order.id} />
              <h2 className="font-semibold text-[#182f38]">填写课后反馈</h2>
              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">本次辅导内容</span>
                <textarea className={textareaClassName} maxLength={500} name="content" required />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">学生掌握情况</span>
                <textarea className={textareaClassName} maxLength={500} name="studentPerformance" required />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">需要继续关注的问题</span>
                <textarea className={textareaClassName} maxLength={500} name="problems" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">下次建议</span>
                <textarea className={textareaClassName} maxLength={500} name="nextSuggestion" />
              </label>
              <Button disabled={!canSubmit} type="submit">
                提交课后反馈
              </Button>
              {!canSubmit ? (
                <p className="text-sm text-[#708188]">当前订单暂不能提交反馈。</p>
              ) : null}
            </form>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
