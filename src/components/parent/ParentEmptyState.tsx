import type { ReactNode } from "react";

type ParentEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ParentEmptyState({ title, description, action }: ParentEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cfe0dc] bg-[#fbfdfb] px-6 py-10 text-center">
      <h3 className="text-lg font-bold text-[#1f2d2d]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#66736e]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
