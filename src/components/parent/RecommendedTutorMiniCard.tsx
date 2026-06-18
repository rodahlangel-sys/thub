import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { formatCurrency, getFitLabel, getFitTone, safeText } from "@/lib/parent-display";

type RecommendedTutorMiniCardProps = {
  id: string;
  demandId?: string;
  name: string;
  school?: string | null;
  major?: string | null;
  grade?: string | null;
  subjects?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  matchPercent?: number;
  reasons?: string[];
};

function splitText(value?: string | null) {
  return safeText(value, "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function RecommendedTutorMiniCard({
  id,
  demandId,
  name,
  school,
  major,
  grade,
  subjects,
  priceMin,
  priceMax,
  matchPercent = 0,
  reasons = [],
}: RecommendedTutorMiniCardProps) {
  const subjectList = splitText(subjects);
  const visibleSubjects = subjectList.slice(0, 2);
  const extraSubjectCount = Math.max(subjectList.length - visibleSubjects.length, 0);

  return (
    <article className="rounded-[24px] border border-[#dbe7e3] bg-white p-5 shadow-[0_14px_34px_rgba(18,45,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-[#1f2d2d]">
            {safeText(name, "老师信息待完善")}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#66736e]">
            {safeText(school, "学校待完善")} · {safeText(major, "专业待完善")} ·{" "}
            {safeText(grade, "年级待完善")}
          </p>
        </div>
        <Badge tone={getFitTone(matchPercent)}>{getFitLabel(matchPercent)}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {visibleSubjects.length > 0 ? (
          visibleSubjects.map((subject) => (
            <span
              className="rounded-full bg-[#eef8f5] px-3 py-1 text-xs font-semibold text-[#117b7a]"
              key={subject}
            >
              {subject}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-[#eef8f5] px-3 py-1 text-xs font-semibold text-[#117b7a]">
            科目待完善
          </span>
        )}
        {extraSubjectCount > 0 ? (
          <span className="rounded-full bg-[#f4f1e9] px-3 py-1 text-xs font-semibold text-[#7d6a4f]">
            +{extraSubjectCount}
          </span>
        ) : null}
      </div>

      <p className="mt-4 whitespace-nowrap text-sm font-semibold text-[#234742]">
        参考价格：{formatCurrency(priceMin)} - {formatCurrency(priceMax)} / 小时
      </p>

      {reasons.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {reasons.slice(0, 2).map((reason) => (
            <Badge key={reason} tone="blue">
              {safeText(reason, "资料可供参考")}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href={`/tutors/${id}`} variant="outline">
          查看资料
        </ButtonLink>
        {demandId ? (
          <ButtonLink href={`/parent/demands/${demandId}/book/${id}`}>发起预约</ButtonLink>
        ) : null}
      </div>
    </article>
  );
}
