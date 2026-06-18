import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/Button";

type PrimaryTaskCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  icon?: LucideIcon;
  secondary?: {
    label: string;
    href: string;
  };
};

export function PrimaryTaskCard({
  eyebrow = "建议下一步",
  title,
  description,
  actionLabel,
  href,
  icon: Icon,
  secondary,
}: PrimaryTaskCardProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#cfe6e0] bg-[#eaf6f1] p-6 shadow-[0_18px_50px_rgba(17,106,108,0.08)] sm:p-7">
      <div className="absolute -right-16 -top-20 size-48 rounded-full border border-[#b9dcd4]/70" />
      <div className="absolute bottom-5 right-20 size-2 rounded-full bg-[#7fc3bd]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          {Icon ? (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#116a6c] shadow-sm">
              <Icon className="size-6" aria-hidden />
            </span>
          ) : null}
          <div>
            <p className="text-sm font-semibold text-[#116a6c]">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-[#172c2c]">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#536861]">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3 lg:justify-end">
          <ButtonLink href={href}>{actionLabel}</ButtonLink>
          {secondary ? (
            <ButtonLink href={secondary.href} variant="outline">
              {secondary.label}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
