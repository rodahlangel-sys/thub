import type { ComponentType } from "react";
import { Card } from "@/components/Card";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "blue" | "green" | "yellow";
};

const toneClassName = {
  blue: "bg-[#eef8fa] text-[#176b87]",
  green: "bg-[#edf7f1] text-[#27734d]",
  yellow: "bg-[#fff7df] text-[#8a650e]",
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  tone = "blue",
}: FeatureCardProps) {
  return (
    <Card className="group p-5 transition hover:-translate-y-0.5 hover:border-[#b8d7e0] hover:shadow-[0_10px_24px_rgba(23,107,135,0.08)]">
      <div
        className={`flex size-11 items-center justify-center rounded-lg ${toneClassName[tone]}`}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="mt-4 font-semibold text-[#182f38]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#60727a]">{description}</p>
    </Card>
  );
}
