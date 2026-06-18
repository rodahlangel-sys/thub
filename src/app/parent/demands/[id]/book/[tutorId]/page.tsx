import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import {
  calculateOrderAmounts,
  calculateServerHourlyPrice,
  formatOrderMoney,
} from "@/lib/orders";
import { yuanToFen } from "@/lib/settlements";
import {
  getCertificationStatusLabel,
  getDashboardPath,
  getDemandStatusLabel,
  getTeachModeLabel,
} from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createOrderAction } from "./actions";

type BookTutorPageProps = {
  params: Promise<{
    id: string;
    tutorId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const teachModeOptions = [
  { value: "ONLINE", label: "线上" },
  { value: "OFFLINE", label: "线下" },
  { value: "BOTH", label: "线上/线下均可" },
];

export default async function BookTutorPage({
  params,
  searchParams,
}: BookTutorPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { id, tutorId } = await params;
  const query = (await searchParams) ?? {};
  const [demand, tutorProfile] = await Promise.all([
    prisma.demand.findFirst({
      where: {
        id,
        parentId: user.id,
      },
    }),
    prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  if (!demand) {
    redirect("/parent/demands");
  }

  if (!tutorProfile || tutorProfile.certificationStatus !== "APPROVED") {
    redirect(`/parent/demands/${demand.id}/recommend`);
  }

  const defaultPrice = calculateServerHourlyPrice(demand, tutorProfile);
  const previewAmounts = calculateOrderAmounts(2, yuanToFen(defaultPrice));

  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          actions={
            <ButtonLink href={`/parent/demands/${demand.id}/recommend`} variant="outline">
              返回推荐老师
            </ButtonLink>
          }
          description="确认上课时间、地点、课时和价格后，订单会先提交给老师确认。"
          eyebrow="创建预约"
          title={`预约 ${tutorProfile.user.name}`}
        />

        {query.error ? (
          <div className="mt-6 rounded-md border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
            {query.error}
          </div>
        ) : null}

        {demand.status === "CLOSED" ? (
          <div className="mt-6 rounded-md border border-[#e5d4a1] bg-[#fff8df] px-4 py-3 text-sm text-[#8a650e]">
            该需求已关闭，不能创建新的预约订单。你仍然可以返回推荐页查看老师资料。
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="font-semibold text-[#182f38]">需求摘要</h2>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#708188]">孩子年级</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.childGrade}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">辅导科目</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.subject}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">所在区域</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.area}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">上课方式</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{getTeachModeLabel(demand.teachMode)}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">预算范围</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.budgetMin}-{demand.budgetMax} 元/小时</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">期望时间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{demand.expectedTime}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[#708188]">需求状态</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{getDemandStatusLabel(demand.status)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-[#182f38]">老师摘要</h2>
                <Badge tone="green">{getCertificationStatusLabel(tutorProfile.certificationStatus)}</Badge>
              </div>
              <dl className="mt-5 grid gap-4 text-sm">
                <div>
                  <dt className="text-[#708188]">姓名</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{tutorProfile.user.name}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">学校与专业</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{tutorProfile.school} · {tutorProfile.major}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">可辅导科目</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{tutorProfile.subjects}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">服务区域</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{tutorProfile.areas}</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">价格区间</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{tutorProfile.priceMin}-{tutorProfile.priceMax} 元/小时</dd>
                </div>
                <div>
                  <dt className="text-[#708188]">评分</dt>
                  <dd className="mt-1 font-medium text-[#182f38]">{tutorProfile.rating.toFixed(1)} 分</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="font-semibold text-[#182f38]">预约信息</h2>
            <p className="mt-2 text-sm leading-6 text-[#60727a]">
              预约提交后，老师确认接单前，家长仍可取消订单。
            </p>

            <form action={createOrderAction} className="mt-6 grid gap-5 md:grid-cols-2">
              <input name="demandId" type="hidden" value={demand.id} />
              <input name="tutorProfileId" type="hidden" value={tutorProfile.id} />

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">预约科目</span>
                <input className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]" defaultValue={demand.subject} name="subject" required />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">预约时间</span>
                <input className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]" name="scheduledTime" placeholder="例如：2026-06-13 14:00" required />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">上课方式</span>
                <select className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] bg-white px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]" defaultValue={demand.teachMode} name="teachMode">
                  {teachModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">上课地点</span>
                <input className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]" defaultValue={demand.teachMode === "ONLINE" ? "腾讯会议/微信沟通" : demand.area} name="location" required />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">课时</span>
                <input className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] px-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]" defaultValue="2" max="8" min="0.5" name="hours" required step="0.5" type="number" />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">每小时价格</span>
                <input className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] bg-[#f6f8f9] px-3 text-sm text-[#60727a] outline-none" defaultValue={defaultPrice} readOnly type="number" />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[#244b5b]">备注</span>
                <textarea className="mt-2 min-h-24 w-full rounded-md border border-[#cbd9de] px-3 py-3 text-sm outline-none focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]" name="note" placeholder="备注暂不保存，可在正式沟通时补充给老师。" />
                <span className="mt-2 block text-xs text-[#708188]">当前订单表暂未保存备注，下一步可在沟通功能中扩展。</span>
              </label>

              <div className="rounded-md bg-[#f6f8f9] p-4 text-sm md:col-span-2">
                <div className="flex justify-between py-1">
                  <span className="text-[#60727a]">课时费（按默认 2 小时预估）</span>
                  <span className="font-semibold text-[#182f38]">{formatOrderMoney(previewAmounts.courseAmount)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#60727a]">预计订单总额</span>
                  <span className="font-semibold text-[#182f38]">{formatOrderMoney(previewAmounts.totalAmount)}</span>
                </div>
                <div className="mt-2 border-t border-[#d9e3e6] pt-3 text-xs leading-5 text-[#708188]">
                  最终金额会按平台记录的老师价格和你填写的课时在服务端计算。信息服务费从大学生家教结算金额中扣取，不会额外增加家长支付金额。
                </div>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Button disabled={demand.status === "CLOSED"} type="submit">
                  提交预约
                </Button>
                <ButtonLink href={`/parent/demands/${demand.id}/recommend`} variant="outline">
                  返回推荐
                </ButtonLink>
              </div>
            </form>
          </Card>
        </div>
      </Container>
    </main>
  );
}
