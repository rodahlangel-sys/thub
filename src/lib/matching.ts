import type { Demand, TutorProfile, User } from "@prisma/client";
import { CertificationStatus, TeachMode } from "@prisma/client";

export type TutorWithUser = TutorProfile & {
  user: Pick<User, "id" | "name" | "email">;
};

export type TutorMatchResult = {
  tutor: TutorWithUser;
  score: number;
  matchPercent: number;
  reasons: string[];
  warnings: string[];
};

function splitField(value: string) {
  return value
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesText(source: string, target: string) {
  if (!source.trim() || !target.trim()) {
    return false;
  }

  return source.includes(target) || target.includes(source);
}

function getSchoolStage(childGrade: string) {
  if (/小学|一年级|二年级|三年级|四年级|五年级|六年级|小一|小二|小三|小四|小五|小六/.test(childGrade)) {
    return "小学";
  }

  if (/初中|初一|初二|初三|七年级|八年级|九年级/.test(childGrade)) {
    return "初中";
  }

  if (/高中|高一|高二|高三/.test(childGrade)) {
    return "高中";
  }

  return childGrade.trim();
}

function hasOverlap(first: string[], second: string[]) {
  return first.some((left) => second.some((right) => includesText(left, right)));
}

function isTeachModeMatched(tutorMode: TeachMode, demandMode: TeachMode) {
  return (
    tutorMode === demandMode ||
    tutorMode === TeachMode.BOTH ||
    demandMode === TeachMode.BOTH
  );
}

function getPriceGap(demand: Demand, tutor: TutorProfile) {
  const hasOverlap =
    tutor.priceMin <= demand.budgetMax && tutor.priceMax >= demand.budgetMin;

  if (hasOverlap) {
    return 0;
  }

  if (tutor.priceMin > demand.budgetMax) {
    return tutor.priceMin - demand.budgetMax;
  }

  return demand.budgetMin - tutor.priceMax;
}

const timeKeywords = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
  "周末",
  "工作日",
  "晚上",
  "下午",
  "上午",
  "寒假",
  "暑假",
];

function getTimeKeywords(value: string) {
  return timeKeywords.filter((keyword) => value.includes(keyword));
}

// 第一版推荐先用透明的规则算法，方便学生团队后续调整权重。
export function matchTutorsForDemand(
  demand: Demand,
  tutors: TutorWithUser[],
): TutorMatchResult[] {
  return tutors
    .filter((tutor) => tutor.certificationStatus === CertificationStatus.APPROVED)
    .map((tutor) => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      const tutorSubjects = splitField(tutor.subjects);
      if (hasOverlap(tutorSubjects, [demand.subject])) {
        score += 25;
        reasons.push("辅导科目匹配");
      }

      const demandStage = getSchoolStage(demand.childGrade);
      const tutorLevels = splitField(tutor.teachLevels);
      if (hasOverlap(tutorLevels, [demandStage])) {
        score += 15;
        reasons.push("可辅导学段匹配");
      }

      const tutorAreas = splitField(tutor.areas);
      if (hasOverlap(tutorAreas, [demand.area])) {
        score += 15;
        reasons.push("服务区域匹配");
      }

      if (isTeachModeMatched(tutor.teachMode, demand.teachMode)) {
        score += 10;
        reasons.push("上课方式匹配");
      }

      const priceGap = getPriceGap(demand, tutor);
      if (priceGap === 0) {
        score += 15;
        reasons.push("价格区间基本合适");
      } else if (priceGap <= 30) {
        score += 8;
        reasons.push("价格与预算接近");
      } else if (tutor.priceMin > demand.budgetMax) {
        warnings.push("价格可能高于预算");
      }

      const demandTimeKeywords = getTimeKeywords(demand.expectedTime);
      const tutorTimeKeywords = getTimeKeywords(tutor.availableTimes);
      if (demandTimeKeywords.length > 0 && hasOverlap(tutorTimeKeywords, demandTimeKeywords)) {
        score += 10;
        reasons.push("可上课时间接近");
      }

      if (tutor.rating >= 4.8) {
        score += 5;
        reasons.push("历史评分较高");
      }

      if (tutor.orderCount >= 5) {
        score += 5;
        reasons.push("已有一定接单记录");
      }

      const finalScore = Math.min(score, 100);

      if (reasons.length === 0) {
        reasons.push("资料可供参考，但与需求匹配度一般");
      }

      return {
        tutor,
        score: finalScore,
        matchPercent: finalScore,
        reasons,
        warnings,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.tutor.rating !== left.tutor.rating) {
        return right.tutor.rating - left.tutor.rating;
      }

      return right.tutor.orderCount - left.tutor.orderCount;
    });
}
