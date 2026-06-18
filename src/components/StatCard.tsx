import type { ReactNode } from "react";
import { Card } from "@/components/Card";

type StatCardProps = {
  label: string;
  value: number | string;
  description?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, description, icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#60727a]">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#182f38]">{value}</p>
          {description ? (
            <p className="mt-2 text-xs leading-5 text-[#708188]">{description}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="rounded-md bg-[#eef8fa] p-2 text-[#176b87]">{icon}</div>
        ) : null}
      </div>
    </Card>
  );
}
