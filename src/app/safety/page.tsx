import { RulePage } from "@/components/RulePage";
import { rulesUpdatedAt, safetySections } from "@/lib/rule-pages";

export default function SafetyPage() {
  return (
    <RulePage
      description="提供线下见面、个人信息保护、平台内交易和异常情况处理的基础提醒。"
      sections={safetySections}
      title="安全提示"
      updatedAt={rulesUpdatedAt}
    />
  );
}
