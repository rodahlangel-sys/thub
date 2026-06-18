import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { AdminShell } from "@/components/layout/AdminShell";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { requireUser } from "@/lib/auth";
import { getPaymentConfig } from "@/lib/payments/config";
import { getDashboardPath } from "@/lib/roles";

type ConfigCheckItem = {
  label: string;
  configured: boolean;
};

function ConfigCheckList({ items }: { items: ConfigCheckItem[] }) {
  return (
    <div className="mt-5 grid gap-3">
      {items.map((item) => (
        <div
          className="flex items-center justify-between gap-4 rounded-md border border-[#edf1f3] bg-[#fbfcfc] px-4 py-3"
          key={item.label}
        >
          <span className="text-sm font-medium text-[#244b5b]">{item.label}</span>
          <Badge tone={item.configured ? "green" : "gray"}>
            {item.configured ? "已配置" : "未配置"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default async function AdminPaymentSettingsPage() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const config = getPaymentConfig();
  const alipayItems: ConfigCheckItem[] = [
    { label: "APP_ID", configured: Boolean(config.alipay.appId) },
    { label: "PRIVATE_KEY", configured: Boolean(config.alipay.privateKey) },
    { label: "PUBLIC_KEY", configured: Boolean(config.alipay.publicKey) },
    { label: "GATEWAY", configured: Boolean(config.alipay.gateway) },
    { label: "NOTIFY_URL", configured: Boolean(config.alipay.notifyUrl) },
  ];
  const wechatItems: ConfigCheckItem[] = [
    { label: "APP_ID", configured: Boolean(config.wechat.appId) },
    { label: "MCH_ID", configured: Boolean(config.wechat.mchId) },
    { label: "API_V3_KEY", configured: Boolean(config.wechat.apiV3Key) },
    { label: "PRIVATE_KEY", configured: Boolean(config.wechat.privateKey) },
    { label: "CERT_SERIAL_NO", configured: Boolean(config.wechat.certSerialNo) },
    { label: "NOTIFY_URL", configured: Boolean(config.wechat.notifyUrl) },
  ];

  return (
    <AdminShell>
        <PageHeader
          actions={<Badge tone="blue">管理员</Badge>}
          description="当前页面只用于检查本地环境变量是否完整，不展示密钥内容。"
          eyebrow="支付配置"
          title="支付接入配置检查"
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-[#708188]">当前支付方式</p>
            <p className="mt-2 text-2xl font-bold text-[#182f38]">{config.provider}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[#708188]">真实支付启用</p>
            <p className="mt-2 text-2xl font-bold text-[#182f38]">
              {config.enableRealProvider ? "已启用" : "未启用"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[#708188]">模拟支付</p>
            <p className="mt-2 text-2xl font-bold text-[#182f38]">可用</p>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <SectionTitle
              description="仅检查必要项是否存在，不显示任何具体内容。"
              title="支付宝配置"
            />
            <ConfigCheckList items={alipayItems} />
          </Card>

          <Card className="p-6">
            <SectionTitle
              description="仅检查必要项是否存在，不显示任何具体内容。"
              title="微信支付配置"
            />
            <ConfigCheckList items={wechatItems} />
          </Card>
        </section>
      </AdminShell>
  );
}
