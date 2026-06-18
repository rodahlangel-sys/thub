import { CheckCircle2, Clock3, GraduationCap, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/Badge";

export function HeroVisualMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d9e3e6] bg-[#fbfcfc] p-5 shadow-[0_18px_45px_rgba(25,61,74,0.08)]">
      <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[#e7f1f3]" />
      <div className="absolute bottom-10 left-6 h-20 w-20 rounded-full bg-[#edf7f1]" />

      <div className="relative grid gap-4">
        <div className="rounded-xl border border-[#d9e3e6] bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#182f38]">
                初二数学辅导需求
              </p>
              <p className="mt-2 text-xs leading-5 text-[#60727a]">
                洪山区 · 周六下午 · 预算 120-180 元/小时
              </p>
            </div>
            <Badge tone="yellow">待匹配</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["函数专题", "几何基础", "线下优先"].map((tag) => (
              <span
                className="rounded-full bg-[#f5fafb] px-2.5 py-1 text-xs text-[#52676f]"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto w-[88%] rounded-xl border border-[#b8d7e0] bg-white p-4 shadow-[0_10px_24px_rgba(23,107,135,0.08)]">
          <div className="flex gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#eef8fa] text-[#176b87]">
              <GraduationCap className="size-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#182f38]">张同学</p>
                <Badge tone="green">已认证</Badge>
              </div>
              <p className="mt-1 text-xs text-[#60727a]">
                武汉大学 · 数学与应用数学 · 大三
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#52676f]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden />
                  洪山区 / 武昌区
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 fill-[#e7a928] text-[#e7a928]" aria-hidden />
                  4.9 分
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_0.86fr] gap-3">
          <div className="rounded-xl border border-[#d9e3e6] bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#182f38]">
              <CheckCircle2 className="size-4 text-[#27734d]" aria-hidden />
              匹配度 92%
            </p>
            <p className="mt-2 text-xs leading-5 text-[#60727a]">
              科目、区域和时间都符合家长需求。
            </p>
          </div>
          <div className="rounded-xl border border-[#d9e3e6] bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#182f38]">
              <Clock3 className="size-4 text-[#176b87]" aria-hidden />
              待确认
            </p>
            <p className="mt-2 text-xs leading-5 text-[#60727a]">
              双方确认后安排试课。
            </p>
          </div>
        </div>

        <div className="mr-8 rounded-xl bg-[#176b87] p-4 text-white">
          <p className="text-sm font-semibold">家长评价</p>
          <p className="mt-2 text-xs leading-5 text-white/85">
            老师讲题耐心，课后反馈很具体，孩子愿意继续上课。
          </p>
        </div>
      </div>
    </div>
  );
}
