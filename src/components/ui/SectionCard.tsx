import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  className?: string;
  accent?: "default" | "soft" | "admin";
};

const accentClass = {
  default: "border-[#dbe5e4] bg-white",
  soft: "border-[#d7e9e7] bg-[#fbfdfd]",
  admin: "border-[#dbe2ea] bg-white",
};

export function SectionCard({
  children,
  className = "",
  accent = "default",
}: SectionCardProps) {
  return (
    <section
      className={`rounded-lg border shadow-[0_1px_2px_rgba(16,40,48,0.04)] ${accentClass[accent]} ${className}`}
    >
      {children}
    </section>
  );
}
