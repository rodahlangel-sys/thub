import type { ReactNode } from "react";

type TimelineStep = {
  title: string;
  description?: string;
  meta?: ReactNode;
  active?: boolean;
};

type StepTimelineProps = {
  steps: TimelineStep[];
};

export function StepTimeline({ steps }: StepTimelineProps) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => (
        <li className="flex gap-3" key={`${step.title}-${index}`}>
          <span
            className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
              step.active
                ? "border-[#176b87] bg-[#176b87] text-white"
                : "border-[#cbd8dc] bg-white text-[#60727a]"
            }`}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1d2b2f]">{step.title}</p>
            {step.description ? (
              <p className="mt-1 text-sm leading-6 text-[#60727a]">
                {step.description}
              </p>
            ) : null}
            {step.meta ? <div className="mt-2">{step.meta}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
