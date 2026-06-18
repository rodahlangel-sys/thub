import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ParentSection } from "@/components/parent/ParentSection";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { PageShell } from "@/components/ui/PageShell";
import { requireUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { createDemandAction } from "./actions";

type NewDemandPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-[#d6e2df] bg-white px-4 text-sm text-[#1f2d2d] outline-none transition placeholder:text-[#a2b2ad] focus:border-[#116a6c] focus:ring-4 focus:ring-[#d7ebe6]";
const textareaClass =
  "mt-2 min-h-28 w-full rounded-xl border border-[#d6e2df] bg-white px-4 py-3 text-sm text-[#1f2d2d] outline-none transition placeholder:text-[#a2b2ad] focus:border-[#116a6c] focus:ring-4 focus:ring-[#d7ebe6]";

const teachModeOptions = [
  { value: "OFFLINE", label: "线下上课" },
  { value: "ONLINE", label: "线上上课" },
  { value: "BOTH", label: "线上/线下都可以" },
];

export default async function NewDemandPage({ searchParams }: NewDemandPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const { error } = await searchParams;

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#116a6c]">发布需求</p>
            <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">告诉我们孩子需要什么帮助</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
              只填写必要信息即可。提交后可以直接查看适合的大学生家教。
            </p>
          </div>
          <ButtonLink href="/parent/demands" variant="outline">
            我的需求
          </ButtonLink>
        </div>

        <Card className="p-6 sm:p-8">
          {error ? (
            <NoticeStrip className="mb-6" tone="red">
              {error}
            </NoticeStrip>
          ) : null}

          <form action={createDemandAction} className="space-y-8">
            <ParentSection
              title="孩子的学习需求"
              description="先说明年级、科目和这次希望改善的地方。"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-[#244b5b]">孩子年级</span>
                  <input className={inputClass} name="childGrade" placeholder="例如：初二" required />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#244b5b]">辅导科目</span>
                  <input className={inputClass} name="subject" placeholder="例如：数学" required />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-[#244b5b]">希望改善的问题或目标</span>
                  <input
                    className={inputClass}
                    name="goal"
                    placeholder="例如：巩固基础，提升几何题和压轴题思路"
                    required
                  />
                </label>
              </div>
            </ParentSection>

            <ParentSection title="上课安排" description="填写区域、方式和大致可上课时间。">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-[#244b5b]">所在区域</span>
                  <input className={inputClass} name="area" placeholder="例如：洪山区" required />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#244b5b]">上课方式</span>
                  <select className={inputClass} name="teachMode" required>
                    {teachModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-[#244b5b]">期望时间</span>
                  <input
                    className={inputClass}
                    name="expectedTime"
                    placeholder="例如：周六下午 2 点后，每周 1-2 次"
                    required
                  />
                </label>
              </div>
            </ParentSection>

            <ParentSection title="预算与补充说明">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-[#244b5b]">最低预算（元/小时）</span>
                  <input className={inputClass} min="1" name="budgetMin" placeholder="120" required type="number" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#244b5b]">最高预算（元/小时）</span>
                  <input className={inputClass} min="1" name="budgetMax" placeholder="180" required type="number" />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-[#244b5b]">其他说明</span>
                  <textarea
                    className={textareaClass}
                    maxLength={500}
                    name="description"
                    placeholder="可以补充孩子目前基础、希望老师风格、是否需要试讲等"
                  />
                  <span className="mt-2 block text-xs text-[#708188]">最多 500 字</span>
                </label>
              </div>
            </ParentSection>

            <div className="flex flex-wrap gap-3 border-t border-[#edf2ef] pt-6">
              <Button type="submit">提交需求，查看推荐</Button>
              <ButtonLink href="/parent" variant="outline">
                返回家长首页
              </ButtonLink>
            </div>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
