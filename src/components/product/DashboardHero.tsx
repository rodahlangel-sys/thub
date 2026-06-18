import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";

type DashboardHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  children?: ReactNode;
};

export function DashboardHero({
  eyebrow,
  title,
  description,
  badge,
  children,
}: DashboardHeroProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d9ded6] bg-[#fffdf8] shadow-[0_18px_46px_rgba(54,66,58,0.10)]">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Badge tone="green">{eyebrow}</Badge>
          <h1 className="mt-4 text-3xl font-bold text-[#1f2d2d]">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#52625d]">
            {description}
          </p>
        </div>
        <div className="rounded-xl border border-[#dedbd2] bg-white px-5 py-4">
          <p className="text-xs text-[#66736e]">当前身份</p>
          <p className="mt-1 text-lg font-bold text-[#116a6c]">{badge}</p>
        </div>
      </div>
      {children ? (
        <div className="border-t border-[#ebe6dc] bg-white/65 p-5 sm:px-8">
          {children}
        </div>
      ) : null}
    </section>
  );
}
