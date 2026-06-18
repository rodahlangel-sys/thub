import { Badge } from "@/components/Badge";
import { formatDateTime } from "@/lib/orders";
import { safeTutorText } from "@/lib/tutor-display";

type TutorReviewPreviewProps = {
  subject: string;
  score: number;
  comment: string;
  createdAt: Date;
};

export function TutorReviewPreview({
  subject,
  score,
  comment,
  createdAt,
}: TutorReviewPreviewProps) {
  return (
    <article className="rounded-2xl border border-[#e4e2d8] bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[#172c2c]">
          {safeTutorText(subject, "辅导科目")}
        </p>
        <Badge tone="blue">{score.toFixed(1)} 分</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#60716c]">
        {safeTutorText(comment, "家长暂未填写文字评价")}
      </p>
      <p className="mt-3 text-xs text-[#8a9691]">{formatDateTime(createdAt)}</p>
    </article>
  );
}
