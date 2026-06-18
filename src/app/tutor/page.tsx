import { redirect } from "next/navigation";
import { CertificationStatus, UserRole } from "@prisma/client";
import { ButtonLink } from "@/components/Button";
import { PageShell } from "@/components/ui/PageShell";
import { TutorBookingCard } from "@/components/tutor/TutorBookingCard";
import { TutorEmptyState } from "@/components/tutor/TutorEmptyState";
import { TutorHero } from "@/components/tutor/TutorHero";
import { TutorPrimaryTask } from "@/components/tutor/TutorPrimaryTask";
import { TutorReviewPreview } from "@/components/tutor/TutorReviewPreview";
import { TutorServiceSummary } from "@/components/tutor/TutorServiceSummary";
import { requireUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getTutorProfileCompleteness } from "@/lib/tutor-profile";
import {
  formatTutorParentName,
  safeTutorText,
} from "@/lib/tutor-display";

function getCertificationLabel(status?: CertificationStatus) {
  if (!status) return "资料待完善";

  const labels: Record<CertificationStatus, string> = {
    PENDING: "审核中",
    APPROVED: "已认证",
    REJECTED: "需修改",
  };

  return labels[status];
}

function getCertificationTone(status?: CertificationStatus) {
  if (status === "APPROVED") return "green" as const;
  if (status === "REJECTED") return "red" as const;
  if (status === "PENDING") return "yellow" as const;
  return "gray" as const;
}

export default async function TutorDashboardPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const [
    profile,
    pendingConfirmOrder,
    pendingPaymentOrder,
    escrowedOrder,
    inProgressOrder,
    pendingParentConfirmOrder,
    refundOrder,
    recentOrders,
    recentReviews,
    pendingConfirmCount,
    activeServiceCount,
    completedOrderCount,
  ] = await Promise.all([
    prisma.tutorProfile.findUnique({ where: { userId: user.id } }),
    prisma.order.findFirst({
      where: { tutorId: user.id, status: "PENDING_TUTOR_CONFIRM" },
      include: { parent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findFirst({
      where: { tutorId: user.id, status: "PENDING_PAYMENT" },
      include: { parent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findFirst({
      where: { tutorId: user.id, status: "ESCROWED" },
      include: { parent: { select: { name: true } } },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.order.findFirst({
      where: { tutorId: user.id, status: "IN_PROGRESS" },
      include: { parent: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findFirst({
      where: { tutorId: user.id, status: "PENDING_PARENT_CONFIRM" },
      include: { parent: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findFirst({
      where: { tutorId: user.id, status: "REFUND_REQUESTED" },
      include: { parent: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findMany({
      where: { tutorId: user.id },
      include: { parent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.review.findMany({
      where: { tutorId: user.id },
      include: { order: { select: { subject: true } } },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.order.count({ where: { tutorId: user.id, status: "PENDING_TUTOR_CONFIRM" } }),
    prisma.order.count({
      where: {
        tutorId: user.id,
        status: { in: ["ESCROWED", "IN_PROGRESS", "PENDING_PARENT_CONFIRM"] },
      },
    }),
    prisma.order.count({ where: { tutorId: user.id, status: "COMPLETED" } }),
  ]);

  const completeness = getTutorProfileCompleteness(profile);
  const activeOrder =
    pendingConfirmOrder ||
    refundOrder ||
    inProgressOrder ||
    escrowedOrder ||
    pendingParentConfirmOrder ||
    pendingPaymentOrder;

  const primaryTask =
    !profile || completeness.percentage < 80
      ? {
          title: "先完善家教资料",
          description: "补充学校、专业、可教科目、服务区域和时间安排。",
          href: "/tutor/profile",
          actionLabel: "完善资料",
        }
      : profile.certificationStatus === "REJECTED"
        ? {
            title: "资料需要修改后重新提交",
            description: safeTutorText(
              profile.certificationNote,
              "请根据审核说明补充资料，修改后再次提交审核。",
            ),
            href: "/tutor/profile",
            actionLabel: "修改资料",
          }
        : profile.certificationStatus === "PENDING"
          ? {
              title: "资料正在审核",
              description: "审核完成后，你的资料会进入家长的推荐范围。",
              href: "/tutor/profile",
              actionLabel: "查看我的资料",
            }
          : pendingConfirmOrder
            ? {
                title: "你收到一条新的预约",
                description: `${formatTutorParentName(pendingConfirmOrder.parent.name)}预约了${pendingConfirmOrder.subject}，请查看时间和上课方式后确认。`,
                href: `/tutor/orders/${pendingConfirmOrder.id}`,
                actionLabel: "查看并确认",
              }
            : refundOrder
              ? {
                  title: "该订单正在处理退款申请",
                  description: `${refundOrder.subject}订单进入售后处理，请关注平台处理进度。`,
                  href: `/tutor/orders/${refundOrder.id}`,
                  actionLabel: "查看处理进度",
                }
              : inProgressOrder
                ? {
                    title: "完成辅导后提交反馈",
                    description: `${inProgressOrder.subject}正在服务中，结束后请记录本次辅导内容和建议。`,
                    href: `/tutor/orders/${inProgressOrder.id}/feedback`,
                    actionLabel: "提交课后反馈",
                  }
                : escrowedOrder
                  ? {
                      title: "下一次辅导已安排",
                      description: `${escrowedOrder.subject}已完成担保支付，请按预约时间准备辅导。`,
                      href: `/tutor/orders/${escrowedOrder.id}`,
                      actionLabel: "查看辅导安排",
                    }
                  : pendingParentConfirmOrder
                    ? {
                        title: "课后反馈已提交",
                        description: "等待家长确认本次辅导完成，后续评价会同步到服务评价中。",
                        href: `/tutor/orders/${pendingParentConfirmOrder.id}`,
                        actionLabel: "查看订单",
                      }
                    : pendingPaymentOrder
                      ? {
                          title: "已确认预约，等待家长付款",
                          description: `${pendingPaymentOrder.subject}预约已确认，付款完成后即可按安排服务。`,
                          href: `/tutor/orders/${pendingPaymentOrder.id}`,
                          actionLabel: "查看预约",
                        }
                      : {
                          title: "保持资料清晰，等待合适预约",
                          description: "关注预约管理和服务评价，新的家长预约会在消息和订单中提醒你。",
                          href: "/tutor/orders",
                          actionLabel: "查看预约管理",
                        };

  return (
    <PageShell>
      <TutorHero
        action={<TutorPrimaryTask {...primaryTask} />}
        description={
          activeOrder
            ? "先处理当前最重要的一项服务安排，再查看最近预约和评价。"
            : "资料、预约和评价集中在这里，保持信息清楚会让家长更容易判断是否合适。"
        }
        name={user.name}
        statusLabel={getCertificationLabel(profile?.certificationStatus)}
        statusTone={getCertificationTone(profile?.certificationStatus)}
        summary={
          <TutorServiceSummary
            items={[
              {
                label: "当前评分",
                value: profile ? `${profile.rating.toFixed(1)} 分` : "待完善",
              },
              {
                label: "已完成服务",
                value: completedOrderCount,
              },
              {
                label: "待确认预约",
                value: pendingConfirmCount,
              },
            ]}
          />
        }
        title={primaryTask.title}
      />

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.75rem] border border-[#dfe8e4] bg-white p-6 shadow-[0_18px_55px_rgba(31,79,72,0.08)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#117b7a]">预约管理</p>
              <h2 className="mt-1 text-2xl font-bold text-[#172c2c]">最近预约</h2>
            </div>
            <ButtonLink href="/tutor/orders" variant="outline">
              查看全部
            </ButtonLink>
          </div>

          <div className="grid gap-4">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <TutorBookingCard
                  id={order.id}
                  key={order.id}
                  location={order.location}
                  parentName={order.parent.name}
                  scheduledTime={order.scheduledTime}
                  status={order.status}
                  subject={order.subject}
                  teachMode={order.teachMode}
                  totalAmount={order.totalAmount}
                />
              ))
            ) : (
              <TutorEmptyState
                description="认证通过后，新的家长预约会显示在这里。"
                title="暂无预约记录"
              />
            )}
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-[#e4e2d8] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(31,79,72,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#117b7a]">服务评价</p>
              <h2 className="mt-1 text-2xl font-bold text-[#172c2c]">最近反馈</h2>
            </div>
            <ButtonLink href="/tutor/reviews" variant="outline">
              查看评价
            </ButtonLink>
          </div>

          <div className="mt-5 grid gap-3">
            {recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <TutorReviewPreview
                  comment={review.comment}
                  createdAt={review.createdAt}
                  key={review.id}
                  score={review.overallScore}
                  subject={review.order.subject}
                />
              ))
            ) : (
              <TutorEmptyState
                description={
                  activeServiceCount > 0
                    ? "完成辅导并获得家长确认后，评价会显示在这里。"
                    : "完成首个订单后，家长评价会显示在这里。"
                }
                title="暂无家长评价"
              />
            )}
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
