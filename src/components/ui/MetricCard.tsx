import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: number | string;
  helper?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "gray";
};

const tones = {
  blue: "bg-[#eef8fa] text-[#176b87]",
  green: "bg-[#f0f8f3] text-[#27734d]",
  amber: "bg-[#fff8df] text-[#8a650e]",
  gray: "bg-[#f6f7f8] text-[#5c6970]",
};

export function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-[#dbe5e4] bg-white p-5 shadow-[0_1px_2px_rgba(16,40,48,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#60727a]">{label}</p>
          <p className="mt-3 text-2xl font-bold text-[#1d2b2f]">{value}</p>
        </div>
        {icon ? <div className={`rounded-md p-2 ${tones[tone]}`}>{icon}</div> : null}
      </div>
      {helper ? <p className="mt-3 text-xs leading-5 text-[#708188]">{helper}</p> : null}
    </div>
  );
}
