import type { ReactNode } from "react";

type ParentSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ParentSection({
  title,
  description,
  action,
  children,
  className = "",
}: ParentSectionProps) {
  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1f2d2d]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[#66736e]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
