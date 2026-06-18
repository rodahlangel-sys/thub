import Link from "next/link";

type TaskBoardItem = {
  label: string;
  value: number | string;
  href: string;
  helper?: string;
};

type TaskBoardProps = {
  title: string;
  description?: string;
  items: TaskBoardItem[];
};

export function TaskBoard({ title, description, items }: TaskBoardProps) {
  return (
    <section className="rounded-2xl border border-[#d9ded6] bg-white p-5 shadow-[0_1px_2px_rgba(18,45,42,0.04)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#1f2d2d]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[#66736e]">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            className="rounded-xl border border-[#ebe6dc] bg-[#fffdf8] p-4 transition hover:border-[#bad8cf] hover:bg-[#f8fbf8]"
            href={item.href}
            key={item.label}
          >
            <p className="text-2xl font-bold text-[#116a6c]">{item.value}</p>
            <p className="mt-1 text-sm font-semibold text-[#1f2d2d]">{item.label}</p>
            {item.helper ? (
              <p className="mt-1 text-xs text-[#7b8580]">{item.helper}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
