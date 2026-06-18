import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { TutorIllustration } from "@/components/tutor/TutorIllustration";

type TutorHeroProps = {
  name: string;
  statusLabel: string;
  statusTone?: "blue" | "green" | "yellow" | "red" | "gray";
  title: string;
  description: string;
  action: ReactNode;
  summary: ReactNode;
};

export function TutorHero({
  name,
  statusLabel,
  statusTone = "gray",
  title,
  description,
  action,
  summary,
}: TutorHeroProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#dfe8e4] bg-[#fffdf8] shadow-[0_24px_70px_rgba(31,79,72,0.10)]">
      <div className="grid gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <div className="flex min-h-72 flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={statusTone}>{statusLabel}</Badge>
              <span className="text-sm text-[#6a7a76]">服务首页</span>
            </div>
            <p className="mt-6 text-sm font-semibold text-[#117b7a]">
              {name}，今天的家教服务
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-[#142b2a] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#60716c]">
              {description}
            </p>
          </div>
          <div className="mt-7">
            <div className="mb-5">{action}</div>
            {summary}
          </div>
        </div>
        <TutorIllustration />
      </div>
    </section>
  );
}
