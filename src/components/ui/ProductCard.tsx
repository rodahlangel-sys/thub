import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

type ProductCardProps = {
  title: string;
  description: string;
  href?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  meta?: ReactNode;
  actionLabel?: string;
};

export function ProductCard({
  title,
  description,
  href,
  icon: Icon,
  meta,
  actionLabel = "查看",
}: ProductCardProps) {
  const content = (
    <div className="group h-full rounded-lg border border-[#dbe5e4] bg-white p-5 shadow-[0_1px_2px_rgba(16,40,48,0.04)] transition hover:-translate-y-0.5 hover:border-[#b8d7e0] hover:shadow-[0_10px_24px_rgba(20,64,78,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#1d2b2f]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#60727a]">{description}</p>
        </div>
        {Icon ? (
          <span className="rounded-md bg-[#eef8fa] p-2 text-[#176b87]">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>{meta}</div>
        {href ? (
          <span className="text-sm font-semibold text-[#176b87] transition group-hover:text-[#11536a]">
            {actionLabel}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link className="block h-full" href={href}>
      {content}
    </Link>
  );
}
