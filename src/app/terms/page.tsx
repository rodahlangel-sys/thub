import { RulePage } from "@/components/RulePage";
import { rulesUpdatedAt, termsSections } from "@/lib/rule-pages";

export default function TermsPage() {
  return (
    <RulePage
      description="请在注册和使用平台服务前阅读本协议，了解账号、预约、支付、评价和平台管理规则。"
      sections={termsSections}
      title="用户协议"
      updatedAt={rulesUpdatedAt}
    />
  );
}
