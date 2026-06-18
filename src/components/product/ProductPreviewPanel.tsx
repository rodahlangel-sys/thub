import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Badge } from "@/components/Badge";

type PreviewTutor = {
  name: string;
  school: string;
  major: string;
  subjects: string;
  areas: string;
  rating: number;
  priceMin: number;
  priceMax: number;
};

type ProductPreviewPanelProps = {
  tutor?: PreviewTutor;
};

function firstValue(value: string, fallback: string) {
  return value
    .split(/[，,、/]/)
    .map((item) => item.trim())
    .find(Boolean) ?? fallback;
}

export function ProductPreviewPanel({ tutor }: ProductPreviewPanelProps) {
  const teacher = tutor ?? {
    name: "张同学",
    school: "武汉大学",
    major: "数学与应用数学",
    subjects: "数学,物理",
    areas: "洪山区,武昌区",
    rating: 4.9,
    priceMin: 120,
    priceMax: 180,
  };

  const subject = firstValue(teacher.subjects, "数学");
  const area = firstValue(teacher.areas, "洪山区");

  return (
    <div className="relative rounded-2xl border border-[#d7ded8] bg-[#fffdf8] p-4 shadow-[0_18px_46px_rgba(54,66,58,0.12)]">
      <div className="absolute right-5 top-5 rounded-full border border-[#d9e5de] bg-white px-3 py-1 text-xs font-semibold text-[#116a6c]">
        平台预览
      </div>

      <div className="rounded-xl border border-[#e3e1d9] bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#6a7772]">家长需求</p>
            <h3 className="mt-1 font-semibold text-[#1f2d2d]">
              初二{subject}辅导
            </h3>
            <p className="mt-2 text-xs leading-5 text-[#66736e]">
              {area}｜周六下午｜预算 {teacher.priceMin}-{teacher.priceMax} 元/小时
            </p>
          </div>
          <Badge tone="yellow">待预约</Badge>
        </div>
      </div>

      <div className="mx-auto my-3 flex w-fit items-center gap-2 rounded-full border border-[#c9ded8] bg-[#edf7f3] px-3 py-1 text-xs font-semibold text-[#1f6f58]">
        <CheckCircle2 className="size-3.5" aria-hidden />
        推荐匹配度 92%
      </div>

      <div className="rounded-xl border border-[#cfe1dc] bg-white p-4">
        <div className="flex gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e8f3ef] text-[#116a6c]">
            <GraduationCap className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-[#1f2d2d]">{teacher.name}</h3>
              <Badge tone="green">已认证</Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#66736e]">
              {teacher.school}｜{teacher.major}
            </p>
            <div className="mt-3 grid gap-2 text-xs text-[#52625d] sm:grid-cols-2">
              <span className="rounded-md bg-[#f7f8f5] px-2.5 py-1.5">
                {subject}
              </span>
              <span className="rounded-md bg-[#f7f8f5] px-2.5 py-1.5">
                {area}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#e5e1d7] bg-white p-3">
          <Clock3 className="size-4 text-[#b47c2d]" aria-hidden />
          <p className="mt-2 text-xs font-semibold text-[#1f2d2d]">老师确认</p>
          <p className="mt-1 text-xs text-[#7b8580]">等待回复</p>
        </div>
        <div className="rounded-lg border border-[#e5e1d7] bg-white p-3">
          <ShieldCheck className="size-4 text-[#116a6c]" aria-hidden />
          <p className="mt-2 text-xs font-semibold text-[#1f2d2d]">担保支付</p>
          <p className="mt-1 text-xs text-[#7b8580]">确认后支付</p>
        </div>
        <div className="rounded-lg border border-[#e5e1d7] bg-white p-3">
          <FileText className="size-4 text-[#1f6f58]" aria-hidden />
          <p className="mt-2 text-xs font-semibold text-[#1f2d2d]">课后反馈</p>
          <p className="mt-1 text-xs text-[#7b8580]">服务后查看</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl bg-[#116a6c] p-4 text-white">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Star className="size-4 fill-white" aria-hidden />
            {teacher.rating.toFixed(1)} 分
          </p>
          <p className="mt-1 text-xs text-white/75">历史评价参考</p>
        </div>
        <div className="rounded-xl border border-[#d7ded8] bg-[#f8f7f3] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1f2d2d]">
            <CalendarCheck className="size-4 text-[#116a6c]" aria-hidden />
            周六 14:00-16:00
          </p>
          <p className="mt-1 text-xs text-[#66736e]">预约时间示例</p>
        </div>
      </div>
    </div>
  );
}
