import type { ReactNode } from "react";

type SearchFilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function SearchFilterBar({
  children,
  className = "",
}: SearchFilterBarProps) {
  return (
    <div
      className={`rounded-lg border border-[#dbe5e4] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,48,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}
