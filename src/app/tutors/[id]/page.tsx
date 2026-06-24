import { notFound } from "next/navigation";
import { CalendarDays, Clock3, CreditCard, FileText, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { TutorProfileHero } from "@/components/product/TutorProfileHero";
import { InfoRow } from "@/components/ui/InfoRow";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { SectionCard } from "@/components/ui/SectionCard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startConversationAction } from "@/app/messages/actions";
import {
  getCertificationStatusLabel,
  getDashboardPath,
  getRoleLabel,
  getTeachModeLabel,
} from "@/lib/roles";

type TutorDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const serviceSteps = [
  { title: "选择需求", description: "家长先选择或发布一条需求。", icon: FileText },
  { title: "发起预约", description: "确认科目、时间、课时和地点。", icon: CalendarDays },
  { title: "老师确认", description: "老师确认后进入待支付。", icon: Clock3 },
  { title: "担保支付", description: "费用状态会记录在订单中。", icon: CreditCard },
];

export default async function TutorDetailPage({ params }: TutorDetailPageProps) {
  const { id } = await params;
  const [user, tutor] = await Promise.all([
    getCurrentUser(),
    prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            tutorReviews: {
              orderBy: { createdAt: "desc" },
              take: 5,
              select: {
                id: true,
                overallScore: true,
                comment: true,
                createdAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!tutor || tutor.certificationStatus !== "APPROVED") {
    notFound();
  }

  const parentDemands =
    user?.role === "PARENT"
      ? await prisma.demand.findMany({
          where: {
            parentId: user.id,
            status: "OPEN",
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            childGrade: true,
            subject: true,
          },
        })
      : [];

  const actionHref = user
    ? user.role === "PARENT"
      ? "/parent/recommend"
      : getDashboardPath(user.role)
    : "/login";
  const actionText = user
    ? user.role === "PARENT"
      ? "选择需求后预约"
      : `返回${getRoleLabel(user.role)}工作台`
    : "登录后预约";

  const details = [
    ["学校", tutor.school],
    ["专业", tutor.major],
    ["年级", tutor.grade],
    ["性别", tutor.gender],
    ["可辅导科目", tutor.subjects],
    ["可辅导学段", tutor.teachLevels],
    ["服务区域", tutor.areas],
    ["上课方式", getTeachModeLabel(tutor.teachMode)],
    ["可上课时间", tutor.availableTimes],
    ["价格区间", `${tutor.priceMin}-${tutor.priceMax} 元/小时`],
    ["认证状态", getCertificationStatusLabel(tutor.certificationStatus)],
  ];

  return (
    <PageShell compact>
      <TutorProfileHero
        actionHref={actionHref}
        actionText={actionText}
        tutor={tutor}
      />

      {user && user.role !== "PARENT" ? (
        <NoticeStrip tone="yellow" className="mt-5">
          预约功能仅面向家长账号。
        </NoticeStrip>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#116a6c]">资料信息</p>
              <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">
                能否匹配，先看这些信息
              </h2>
            </div>
            <Badge tone="green">已通过平台认证</Badge>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <InfoRow key={label} label={label} value={value || "待完善"} />
            ))}
          </dl>
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard className="p-6">
            <h2 className="font-semibold text-[#1f2d2d]">过往经验</h2>
            <p className="mt-3 text-sm leading-7 text-[#52625d]">
              {tutor.experience || "老师暂未填写过往经验。"}
            </p>
          </SectionCard>

          <SectionCard className="p-6">
            <h2 className="font-semibold text-[#1f2d2d]">预约前会经过这些步骤</h2>
            <div className="mt-4 grid gap-3">
              {serviceSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div className="flex gap-3" key={step.title}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8f3ef] text-xs font-bold text-[#116a6c]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#1f2d2d]">
                        <Icon className="size-4 text-[#116a6c]" aria-hidden />
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#66736e]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard className="mt-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#116a6c]">家长评价</p>
            <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">
              最近服务反馈
            </h2>
          </div>
          <Badge tone="blue">
            {tutor.user.tutorReviews.length > 0
              ? `${tutor.user.tutorReviews.length} 条`
              : "暂无评价"}
          </Badge>
        </div>
        {tutor.user.tutorReviews.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {tutor.user.tutorReviews.map((review) => (
              <div
                className="rounded-xl border border-[#ebe6dc] bg-white p-4"
                key={review.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge tone="blue">{review.overallScore.toFixed(1)} 分</Badge>
                  <span className="text-xs text-[#7b8580]">
                    {new Intl.DateTimeFormat("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(review.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#52625d]">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[#d5d2c8] bg-[#fffdf8] p-6 text-sm text-[#66736e]">
            暂无家长评价。可以先根据学校、专业、科目和服务区域判断是否合适。
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#1f2d2d]">
            <MessageSquareText className="size-4 text-[#116a6c]" aria-hidden />
            想预约这位老师？
          </p>
          <p className="mt-2 text-sm text-[#66736e]">
            家长需要先选择一条需求，再进入预约流程。
          </p>
        </div>
        <ButtonLink href={actionHref}>{actionText}</ButtonLink>
      </SectionCard>

      {user?.role === "PARENT" ? (
        <SectionCard className="mt-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#116a6c]">站内沟通</p>
              <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">联系这位家教</h2>
              <p className="mt-2 text-sm leading-6 text-[#66736e]">
                会话需要关联一条需求，便于双方围绕具体辅导目标沟通。
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {parentDemands.length > 0 ? (
                parentDemands.map((demand) => (
                  <form action={startConversationAction} key={demand.id}>
                    <input name="demandId" type="hidden" value={demand.id} />
                    <input name="tutorProfileId" type="hidden" value={tutor.id} />
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-md bg-[#116a6c] px-4 text-sm font-semibold text-white transition hover:bg-[#0d5759] focus:outline-none focus:ring-2 focus:ring-[#b8dcd8] focus:ring-offset-2"
                      type="submit"
                    >
                      联系：{demand.childGrade} {demand.subject}
                    </button>
                  </form>
                ))
              ) : (
                <ButtonLink href="/parent/demands/new">先发布需求</ButtonLink>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}
