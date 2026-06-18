import type { ReactNode } from "react";

type DashboardGridProps = {
  children: ReactNode;
  columns?: "stats" | "cards" | "two";
  className?: string;
};

const columnsClass = {
  stats: "sm:grid-cols-2 lg:grid-cols-4",
  cards: "md:grid-cols-2 xl:grid-cols-3",
  two: "lg:grid-cols-2",
};

export function DashboardGrid({
  children,
  columns = "cards",
  className = "",
}: DashboardGridProps) {
  return (
    <div className={`grid gap-4 ${columnsClass[columns]} ${className}`}>
      {children}
    </div>
  );
}
