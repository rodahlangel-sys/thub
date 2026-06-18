import { redirect } from "next/navigation";
import { UserRole, UserStatus } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/orders";
import {
  getCertificationStatusLabel,
  getDashboardPath,
  getRoleLabel,
  getTeachModeLabel,
  getUserStatusLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { disableUserAction, enableUserAction } from "./actions";

type AdminUserDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function getStatusTone(status: UserStatus) {
  return status === UserStatus.ACTIVE ? ("green" as const) : ("red" as const);
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: AdminUserDetailPageProps) {
  const currentUser = await requireUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(currentUser.role));
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      parentProfile: true,
      tutorProfile: true,
    },
  });

  if (!user) {
    redirect("/admin/users");
  }

  const isSelf = user.id === currentUser.id;

  const [
    parentDemandCount,
    parentOpenDemandCount,
    parentOrderCount,
    parentCompletedOrderCount,
    parentRefundCount,
    tutorOrderCount,
    tutorPendingConfirmCount,
    tutorCompletedOrderCount,
    tutorRefundOrderCount,
    tutorReviewCount,
    tutorReviewAverage,
  ] = await Promise.all([
    user.role === UserRole.PARENT
      ? prisma.demand.count({ where: { parentId: user.id } })
      : Promise.resolve(0),
    user.role === UserRole.PARENT
      ? prisma.demand.count({ where: { parentId: user.id, status: "OPEN" } })
      : Promise.resolve(0),
    user.role === UserRole.PARENT
      ? prisma.order.count({ where: { parentId: user.id } })
      : Promise.resolve(0),
    user.role === UserRole.PARENT
      ? prisma.order.count({ where: { parentId: user.id, status: "COMPLETED" } })
      : Promise.resolve(0),
    user.role === UserRole.PARENT
      ? prisma.refund.count({ where: { applicantId: user.id } })
      : Promise.resolve(0),
    user.role === UserRole.TUTOR
      ? prisma.order.count({ where: { tutorId: user.id } })
      : Promise.resolve(0),
    user.role === UserRole.TUTOR
      ? prisma.order.count({ where: { tutorId: user.id, status: "PENDING_TUTOR_CONFIRM" } })
      : Promise.resolve(0),
    user.role === UserRole.TUTOR
      ? prisma.order.count({ where: { tutorId: user.id, status: "COMPLETED" } })
      : Promise.resolve(0),
    user.role === UserRole.TUTOR
      ? prisma.order.count({ where: { tutorId: user.id, refunds: { some: {} } } })
      : Promise.resolve(0),
    user.role === UserRole.TUTOR
      ? prisma.review.count({ where: { tutorId: user.id } })
      : Promise.resolve(0),
    user.role === UserRole.TUTOR
      ? prisma.review.aggregate({
          where: { tutorId: user.id },
          _avg: { overallScore: true },
        })
      : Promise.resolve({ _avg: { overallScore: null } }),
  ]);

  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          actions={<ButtonLink href="/admin/users" variant="outline">返回用户列表</ButtonLink>}
          description="查看用户资料、账号状态和业务数据。"
          eyebrow="用户详情"
          title={user.name}
        />

        {query.error ? (
          <div className="mt-5 rounded-md bg-[#fff1f1] px-4 py-3 text-sm text-[#9f3333]">
            {query.error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-6">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-[#182f38]">基础信息</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{getRoleLabel(user.role)}</Badge>
                  <Badge tone={getStatusTone(user.status)}>
                    {getUserStatusLabel(user.status)}
                  </Badge>
                </div>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#708188]">姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">邮箱</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">手机号</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{user.phone}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">注册时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">更新时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{formatDateTime(user.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">用户协议同意时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">
                    {user.termsAcceptedAt ? formatDateTime(user.termsAcceptedAt) : "未记录"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#708188]">隐私政策同意时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">
                    {user.privacyAcceptedAt ? formatDateTime(user.privacyAcceptedAt) : "未记录"}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">账号状态管理</h2>
              <p className="mt-2 text-sm leading-6 text-[#60727a]">
                禁用后用户不能登录，也不能继续访问受保护页面。
              </p>
              {isSelf ? (
                <p className="mt-4 rounded-md bg-[#fff8df] px-4 py-3 text-sm text-[#8a650e]">
                  不能禁用自己的管理员账号。
                </p>
              ) : (
                <div className="mt-5">
                  {user.status === UserStatus.ACTIVE ? (
                    <form action={disableUserAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <Button type="submit" variant="danger">禁用账号</Button>
                    </form>
                  ) : (
                    <form action={enableUserAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <Button type="submit">恢复账号</Button>
                    </form>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6">
            {user.role === UserRole.PARENT ? (
              <>
                <Card className="p-6">
                  <h2 className="font-semibold text-[#182f38]">家长资料</h2>
                  {user.parentProfile ? (
                    <dl className="mt-5 space-y-4 text-sm">
                      <div>
                        <dt className="text-[#708188]">所在区域</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.parentProfile.area}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">详细地址</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.parentProfile.addressDetail}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">孩子基本情况</dt>
                        <dd className="mt-1 leading-6 text-[#244b5b]">{user.parentProfile.childInfo}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-[#60727a]">暂未完善家长资料。</p>
                  )}
                </Card>
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard label="发布需求总数" value={parentDemandCount} />
                  <StatCard label="开放中需求" value={parentOpenDemandCount} />
                  <StatCard label="订单总数" value={parentOrderCount} />
                  <StatCard label="已完成订单" value={parentCompletedOrderCount} />
                  <StatCard label="退款申请数量" value={parentRefundCount} />
                </div>
              </>
            ) : null}

            {user.role === UserRole.TUTOR ? (
              <>
                <Card className="p-6">
                  <h2 className="font-semibold text-[#182f38]">家教资料</h2>
                  {user.tutorProfile ? (
                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[#708188]">学校</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.tutorProfile.school}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">专业</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.tutorProfile.major}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">年级</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.tutorProfile.grade}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">性别</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.tutorProfile.gender}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">可辅导科目</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.tutorProfile.subjects}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">服务区域</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{user.tutorProfile.areas}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">上课方式</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">{getTeachModeLabel(user.tutorProfile.teachMode)}</dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">价格区间</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">
                          {formatMoney(user.tutorProfile.priceMin)} - {formatMoney(user.tutorProfile.priceMax)} / 小时
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">认证状态</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">
                          {getCertificationStatusLabel(user.tutorProfile.certificationStatus)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#708188]">评分与接单</dt>
                        <dd className="mt-1 font-medium text-[#182f38]">
                          {user.tutorProfile.rating.toFixed(1)} 分｜{user.tutorProfile.orderCount} 次
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-[#60727a]">暂未创建家教资料。</p>
                  )}
                </Card>
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard label="收到订单总数" value={tutorOrderCount} />
                  <StatCard label="待确认订单" value={tutorPendingConfirmCount} />
                  <StatCard label="已完成订单" value={tutorCompletedOrderCount} />
                  <StatCard label="退款相关订单" value={tutorRefundOrderCount} />
                  <StatCard label="收到评价数量" value={tutorReviewCount} />
                  <StatCard
                    label="平均评分"
                    value={
                      tutorReviewAverage._avg.overallScore
                        ? `${tutorReviewAverage._avg.overallScore.toFixed(1)} 分`
                        : "暂无"
                    }
                  />
                </div>
              </>
            ) : null}

            {user.role === UserRole.ADMIN ? (
              <Card className="p-6">
                <h2 className="font-semibold text-[#182f38]">管理员信息</h2>
                <p className="mt-3 text-sm leading-6 text-[#60727a]">
                  该账号用于平台运营管理，可访问后台管理页面。
                </p>
              </Card>
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
