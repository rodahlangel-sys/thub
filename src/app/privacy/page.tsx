import { RulePage } from "@/components/RulePage";
import { privacySections, rulesUpdatedAt } from "@/lib/rule-pages";

export default function PrivacyPage() {
  return (
    <RulePage
      description="说明平台会收集和使用哪些信息，以及信息展示、保护和用户权利相关安排。"
      sections={privacySections}
      title="隐私政策"
      updatedAt={rulesUpdatedAt}
    />
  );
}
