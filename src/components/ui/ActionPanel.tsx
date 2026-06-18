import type { ReactNode } from "react";

type ActionPanelProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function ActionPanel({
  title,
  description,
  children,
  className = "",
}: ActionPanelProps) {
  return (
    <div
      className={`rounded-lg border border-[#cfe2e5] bg-[#f7fbfb] p-5 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-[#1d2b2f]">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[#60727a]">{description}</p>
          ) : null}
        </div>
        {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </div>
  );
}
