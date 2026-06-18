import Link from "next/link";
import type { ReactNode } from "react";

type RecentListItem = {
  title: string;
  description: string;
  href?: string;
  meta?: ReactNode;
};

type RecentListProps = {
  title: string;
  emptyText: string;
  items: RecentListItem[];
};

export function RecentList({ title, emptyText, items }: RecentListProps) {
  return (
    <section className="rounded-2xl border border-[#d9ded6] bg-white p-5 shadow-[0_1px_2px_rgba(18,45,42,0.04)]">
      <h2 className="text-lg font-bold text-[#1f2d2d]">{title}</h2>
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => {
            const content = (
              <div className="rounded-xl border border-[#ebe6dc] bg-[#fffdf8] px-4 py-3 transition hover:border-[#bad8cf]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1f2d2d]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#66736e]">
                      {item.description}
                    </p>
                  </div>
                  {item.meta ? <div>{item.meta}</div> : null}
                </div>
              </div>
            );

            return item.href ? (
              <Link href={item.href} key={`${item.title}-${item.description}`}>
                {content}
              </Link>
            ) : (
              <div key={`${item.title}-${item.description}`}>{content}</div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[#d5d2c8] bg-[#fffdf8] p-5 text-sm text-[#66736e]">
          {emptyText}
        </div>
      )}
    </section>
  );
}
