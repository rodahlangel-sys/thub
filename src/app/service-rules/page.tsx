import { RulePage } from "@/components/RulePage";
import { rulesUpdatedAt, serviceRuleSections } from "@/lib/rule-pages";

export default function ServiceRulesPage() {
  return (
    <RulePage
      description="说明家长发布需求、大学生家教入驻、预约确认、课后反馈和评价等服务规则。"
      sections={serviceRuleSections}
      title="服务规则"
      updatedAt={rulesUpdatedAt}
    />
  );
}
