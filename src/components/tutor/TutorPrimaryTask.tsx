import { ButtonLink } from "@/components/Button";

type TutorPrimaryTaskProps = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

export function TutorPrimaryTask({
  title,
  description,
  href,
  actionLabel,
}: TutorPrimaryTaskProps) {
  return (
    <div className="rounded-3xl border border-[#cfe6e0] bg-[#e9f6f2] p-5 shadow-[0_18px_44px_rgba(17,123,122,0.10)]">
      <p className="text-sm font-semibold text-[#0f6f70]">当前需要处理</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#152f2d]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#536861]">{description}</p>
        </div>
        <ButtonLink className="shrink-0" href={href}>
          {actionLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
