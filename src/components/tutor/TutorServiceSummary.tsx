type TutorServiceSummaryProps = {
  items: Array<{
    label: string;
    value: string | number;
  }>;
};

export function TutorServiceSummary({ items }: TutorServiceSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          className="rounded-2xl border border-white/60 bg-white/75 px-4 py-3 shadow-[0_10px_24px_rgba(31,79,72,0.08)]"
          key={item.label}
        >
          <p className="text-2xl font-bold text-[#0f6f70]">{item.value}</p>
          <p className="mt-1 text-xs text-[#61736e]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
