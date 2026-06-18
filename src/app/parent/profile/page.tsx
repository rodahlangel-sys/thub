import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { InfoRow } from "@/components/ui/InfoRow";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { updateParentProfileAction } from "./actions";

type ParentProfilePageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function ParentProfilePage({
  searchParams,
}: ParentProfilePageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { success, error } = await searchParams;
  const profile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
  });

  return (
    <PageShell>
        <PageHeader
          actions={<ButtonLink href="/parent" variant="outline">返回家长首页</ButtonLink>}
          description="补充所在区域和孩子情况，后续发布需求时会更省心。"
          eyebrow="家长资料"
          title="完善家长资料"
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[#182f38]">账号信息</h2>
              <Badge tone="green">家长</Badge>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <InfoRow label="姓名" value={user.name} />
              <InfoRow label="邮箱" value={user.email} />
              <InfoRow label="手机号" value={user.phone} />
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-[#182f38]">家庭与孩子情况</h2>
            <p className="mt-2 text-sm leading-6 text-[#60727a]">
              这里保存的是家长端基础资料，不会公开展示给未登录用户。
            </p>

            {success ? (
              <NoticeStrip className="mt-5" tone="green">
                {success}
              </NoticeStrip>
            ) : null}
            {error ? (
              <NoticeStrip className="mt-5" tone="red">
                {error}
              </NoticeStrip>
            ) : null}

            <form action={updateParentProfileAction} className="mt-6 space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">所在区域</span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] bg-white px-3 text-sm text-[#182f38] outline-none transition focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
                  defaultValue={profile?.area ?? ""}
                  name="area"
                  placeholder="例如：洪山区、武昌区"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">详细地址</span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#cbd9de] bg-white px-3 text-sm text-[#182f38] outline-none transition focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
                  defaultValue={profile?.addressDetail ?? ""}
                  name="addressDetail"
                  placeholder="可填写小区或附近地标"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#244b5b]">孩子情况</span>
                <textarea
                  className="mt-2 min-h-32 w-full rounded-md border border-[#cbd9de] bg-white px-3 py-3 text-sm text-[#182f38] outline-none transition focus:border-[#176b87] focus:ring-2 focus:ring-[#d7ebf0]"
                  defaultValue={profile?.childInfo ?? ""}
                  maxLength={300}
                  name="childInfo"
                  placeholder="例如：初二，数学基础中等，希望加强几何和压轴题训练"
                />
                <span className="mt-2 block text-xs text-[#708188]">
                  最多 300 字，建议写清年级、基础和主要困扰。
                </span>
              </label>

              <div className="flex flex-wrap gap-3">
                <Button type="submit">保存资料</Button>
                <ButtonLink href="/parent/demands/new" variant="secondary">
                  去发布需求
                </ButtonLink>
              </div>
            </form>
          </Card>
        </div>
    </PageShell>
  );
}
