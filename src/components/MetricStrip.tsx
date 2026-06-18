const metrics = [
  { label: "覆盖高校", value: "6+" },
  { label: "入驻家教", value: "20+" },
  { label: "热门区域", value: "洪山区 / 武昌区 / 江汉区" },
  { label: "热门科目", value: "数学 / 英语 / 物理 / 编程" },
];

export function MetricStrip() {
  return (
    <div className="grid gap-3 rounded-xl border border-[#d9e3e6] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <p className="text-xs text-[#708188]">{metric.label}</p>
          <p className="mt-1 text-sm font-semibold text-[#182f38]">
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}
