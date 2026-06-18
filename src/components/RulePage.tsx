import { ButtonLink } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/ui/PageShell";
import { SectionCard } from "@/components/ui/SectionCard";

type RuleSection = {
  title: string;
  paragraphs: string[];
};

type RulePageProps = {
  title: string;
  description: string;
  updatedAt: string;
  sections: RuleSection[];
};

export function RulePage({
  title,
  description,
  updatedAt,
  sections,
}: RulePageProps) {
  return (
    <PageShell>
      <PageHeader
        description={description}
        eyebrow={`更新时间：${updatedAt}`}
        title={title}
      />

      <SectionCard className="mt-8 p-6 md:p-8">
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-[#182f38]">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[#52676f]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#edf1f3] pt-6">
          <ButtonLink href="/" variant="secondary">
            返回首页
          </ButtonLink>
        </div>
      </SectionCard>
    </PageShell>
  );
}
