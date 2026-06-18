import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "yellow" | "red" | "gray";
  className?: string;
};

const tones = {
  blue: "border-[#b8d7e0] bg-[#eef8fa] text-[#176b87]",
  green: "border-[#b9d8c5] bg-[#f0f8f3] text-[#27734d]",
  yellow: "border-[#e5d4a1] bg-[#fff8df] text-[#8a650e]",
  red: "border-[#e6b6b6] bg-[#fff1f1] text-[#a33b3b]",
  gray: "border-[#d2d8dc] bg-[#f6f7f8] text-[#5c6970]",
};

export function StatusBadge({
  children,
  tone = "gray",
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
