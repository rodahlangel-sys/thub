import { RulePage } from "@/components/RulePage";
import { aboutSections, rulesUpdatedAt } from "@/lib/rule-pages";

export default function AboutPage() {
  return (
    <RulePage
      description="了解平台定位、服务对象、核心能力和联系方式。"
      sections={aboutSections}
      title="关于平台"
      updatedAt={rulesUpdatedAt}
    />
  );
}
