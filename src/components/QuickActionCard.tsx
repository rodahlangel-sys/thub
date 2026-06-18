import Link from "next/link";
import type { ComponentType } from "react";
import { Card } from "@/components/Card";

type QuickActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:border-[#b8d7e0]">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#eef8fa] p-2 text-[#176b87]">
            <Icon className="size-5" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-[#182f38]">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#60727a]">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
