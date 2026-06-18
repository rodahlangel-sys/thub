import { RulePage } from "@/components/RulePage";
import { refundRuleSections, rulesUpdatedAt } from "@/lib/rule-pages";

export default function RefundRulesPage() {
  return (
    <RulePage
      description="说明退款适用范围、可申请状态、金额参考和平台审核流程。"
      sections={refundRuleSections}
      title="退款规则"
      updatedAt={rulesUpdatedAt}
    />
  );
}
