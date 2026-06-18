import type { ComponentType } from "react";

type FlowStep = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type ProductFlowProps = {
  steps: FlowStep[];
};

export function ProductFlow({ steps }: ProductFlowProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {steps.map((step, index) => {
        const Icon = step.icon;

        return (
          <div
            className="relative rounded-xl border border-[#dedbd2] bg-white p-4 shadow-[0_1px_2px_rgba(18,45,42,0.04)]"
            key={step.title}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#e8f3ef] text-sm font-bold text-[#116a6c]">
                {index + 1}
              </span>
              <Icon className="size-5 text-[#116a6c]" aria-hidden />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#1f2d2d]">
              {step.title}
            </h3>
            <p className="mt-2 text-xs leading-5 text-[#66736e]">
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
