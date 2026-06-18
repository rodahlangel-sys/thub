import type { ReactNode } from "react";

type TutorEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function TutorEmptyState({
  title,
  description,
  action,
}: TutorEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d7ddd8] bg-[#fffdf8] px-5 py-6 text-sm text-[#60716c]">
      <p className="font-semibold text-[#213331]">{title}</p>
      {description ? <p className="mt-2 leading-6">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
