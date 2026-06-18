import type { ComponentType } from "react";
import { ButtonLink } from "@/components/Button";

type NextActionPanelProps = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function NextActionPanel({
  title,
  description,
  href,
  actionLabel,
  icon: Icon,
}: NextActionPanelProps) {
  return (
    <section className="rounded-2xl border border-[#cfe1dc] bg-[#eaf5f1] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#116a6c] shadow-[0_1px_2px_rgba(18,45,42,0.05)]">
            <Icon className="size-6" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#116a6c]">建议下一步</p>
            <h2 className="mt-1 text-xl font-bold text-[#1f2d2d]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#52625d]">
              {description}
            </p>
          </div>
        </div>
        <ButtonLink href={href}>{actionLabel}</ButtonLink>
      </div>
    </section>
  );
}
