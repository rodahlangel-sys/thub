import type { ReactNode } from "react";

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-md border border-[#edf1f3] bg-[#fbfcfc] px-4 py-3">
      <dt className="text-xs text-[#708188]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#1d2b2f]">{value || "未填写"}</dd>
    </div>
  );
}
