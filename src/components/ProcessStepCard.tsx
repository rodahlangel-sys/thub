import type { ComponentType } from "react";

type ProcessStepCardProps = {
  index: number;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function ProcessStepCard({
  index,
  title,
  description,
  icon: Icon,
}: ProcessStepCardProps) {
  return (
    <div className="rounded-xl border border-[#d9e3e6] bg-white p-5 transition hover:border-[#b8d7e0]">
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#eef8fa] text-[#176b87]">
          <Icon className="size-5" aria-hidden />
        </div>
        <span className="text-sm font-semibold text-[#9aaeB6]">
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-4 font-semibold text-[#182f38]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#60727a]">{description}</p>
    </div>
  );
}
