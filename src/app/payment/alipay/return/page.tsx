import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";

export default function AlipayReturnPage() {
  return (
    <main className="flex-1 bg-[#f4f7f8] py-10">
      <Container>
        <PageHeader
          description="同步返回页面只用于提示结果处理中，最终状态请以订单详情为准。"
          eyebrow="支付返回"
          title="支付结果确认中"
        />

        <Card className="mt-8 p-6">
          <p className="text-sm leading-7 text-[#60727a]">
            支付结果正在确认。请返回订单详情查看最新状态，平台会以后端通知确认后的结果为准。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/parent/orders">查看我的订单</ButtonLink>
            <ButtonLink href="/" variant="outline">返回首页</ButtonLink>
          </div>
        </Card>
      </Container>
    </main>
  );
}
