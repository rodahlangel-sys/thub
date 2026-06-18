type SectionTitleProps = {
  title: string;
  description?: string;
};

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#182f38]">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-[#60727a]">{description}</p>
      ) : null}
    </div>
  );
}
