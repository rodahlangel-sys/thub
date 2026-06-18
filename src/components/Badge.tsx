import type { ReactNode } from "react";

type BadgeTone = "blue" | "green" | "yellow" | "red" | "gray";

const tones: Record<BadgeTone, string> = {
  blue: "border-[#b9d8df] bg-[#eef8fa] text-[#176b87]",
  green: "border-[#b8d7cd] bg-[#eef8f4] text-[#1f6f58]",
  yellow: "border-[#ead8a6] bg-[#fff8e5] text-[#8a650e]",
  red: "border-[#e8bbb5] bg-[#fff1ef] text-[#a33b35]",
  gray: "border-[#d5ddd9] bg-[#f7f8f7] text-[#5b6865]",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function Badge({ children, tone = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
