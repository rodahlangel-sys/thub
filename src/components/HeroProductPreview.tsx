import { CheckCircle2, Clock3, GraduationCap, Star } from "lucide-react";
import { Badge } from "@/components/Badge";

export function HeroProductPreview() {
  return (
    <div className="rounded-xl border border-[#d9e3e6] bg-white p-4 shadow-[0_14px_36px_rgba(25,61,74,0.08)]">
      <div className="rounded-lg bg-[#f4f7f8] p-4">
        <div className="flex items-start justify-between gap-3 rounded-lg border border-[#d9e3e6] bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-[#182f38]">初二数学辅导</p>
            <p className="mt-1 text-xs text-[#60727a]">
              洪山区｜周六下午｜预算 120-180 元/小时
            </p>
          </div>
          <Badge tone="yellow">待匹配</Badge>
        </div>

        <div className="mt-3 flex items-center justify-center">
          <span className="rounded-full bg-[#e7f1f3] px-3 py-1 text-xs font-semibold text-[#176b87]">
            92% 匹配
          </span>
        </div>

        <div className="mt-3 rounded-lg border border-[#b8d7e0] bg-white p-4">
          <div className="flex gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-[#eef8fa] text-[#176b87]">
              <GraduationCap className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[#182f38]">张同学</p>
                <Badge tone="green">已认证</Badge>
              </div>
              <p className="mt-1 text-xs text-[#60727a]">
                武汉大学｜数学与应用数学｜4.9 分
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#52676f]">
                <span className="rounded-full bg-[#f5fafb] px-2.5 py-1">
                  初中数学
                </span>
                <span className="rounded-full bg-[#f5fafb] px-2.5 py-1">
                  洪山区
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[0.85fr_1.15fr] gap-3">
          <div className="rounded-lg border border-[#d9e3e6] bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#182f38]">
              <Clock3 className="size-3.5 text-[#176b87]" aria-hidden />
              待确认
            </p>
            <p className="mt-1 text-xs text-[#708188]">预约状态</p>
          </div>
          <div className="rounded-lg border border-[#d9e3e6] bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#182f38]">
              <Star className="size-3.5 fill-[#e7a928] text-[#e7a928]" aria-hidden />
              讲解耐心，反馈具体
            </p>
            <p className="mt-1 text-xs text-[#708188]">家长评价</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#176b87] px-4 py-3 text-sm font-semibold text-white">
          <CheckCircle2 className="size-4" aria-hidden />
          资料、预约和反馈集中记录
        </div>
      </div>
    </div>
  );
}
