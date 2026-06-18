import type { ReactNode } from "react";

type NoticeStripProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "yellow" | "red";
  className?: string;
};

const tones = {
  blue: "border-[#b8d7e0] bg-[#eef8fa] text-[#17445a]",
  green: "border-[#b9d8c5] bg-[#f0f8f3] text-[#27734d]",
  yellow: "border-[#e5d4a1] bg-[#fff8df] text-[#8a650e]",
  red: "border-[#e6b6b6] bg-[#fff1f1] text-[#a33b3b]",
};

export function NoticeStrip({
  children,
  tone = "blue",
  className = "",
}: NoticeStripProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}
