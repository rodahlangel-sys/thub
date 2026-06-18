import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { ThubBrandMark } from "@/components/auth/ThubBrandMark";
import { NoticeStrip } from "@/components/ui/NoticeStrip";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";
import { registerAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-[#dce8e5] bg-white/90 px-4 text-[15px] text-[#173231] outline-none transition placeholder:text-[#9aadaa] focus:border-[#117b7a] focus:bg-white focus:ring-4 focus:ring-[#c9e9e4]/55";

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="flex flex-1 flex-col bg-[#f4f8f6]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link className="flex items-center gap-3" href="/">
          <span className="relative flex size-11 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[#d8e7e3]">
            <ThubBrandMark compact />
          </span>
          <span>
            <span className="block text-base font-bold text-[#173231]">THub</span>
            <span className="hidden text-xs text-[#6b7f7b] sm:block">
              武汉高校大学生家教信息平台
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-[#6b7f7b]">
          <span className="hidden sm:inline">已有账号？</span>
          <ButtonLink href="/login" variant="outline">
            返回登录
          </ButtonLink>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 pb-10 pt-2">
      <Card className="w-full max-w-3xl rounded-[28px] border-white/80 bg-white/88 p-7 shadow-[0_24px_80px_rgba(20,84,82,0.12)] backdrop-blur-md sm:p-9">
        <div className="mb-7">
          <Badge tone="green">创建账号</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#173231]">
            注册家长或大学生家教账号
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6b7f7b]">
            选择身份后完成注册，再继续完善你的账号资料。
          </p>
        </div>

        {error ? (
          <NoticeStrip className="mb-5" tone="red">
            {error}
          </NoticeStrip>
        ) : null}

        <form action={registerAction} className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[#607a77]">姓名</span>
            <input
              className={inputClassName}
              name="name"
              placeholder="例如：李女士"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#607a77]">手机号</span>
            <input
              className={inputClassName}
              name="phone"
              placeholder="用于联系确认"
              required
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-[#607a77]">邮箱</span>
            <input
              autoComplete="email"
              className={inputClassName}
              name="email"
              placeholder="请输入常用邮箱"
              required
              type="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#607a77]">密码</span>
            <input
              autoComplete="new-password"
              className={inputClassName}
              name="password"
              placeholder="至少 6 位"
              required
              type="password"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#607a77]">确认密码</span>
            <input
              autoComplete="new-password"
              className={inputClassName}
              name="confirmPassword"
              placeholder="请再次输入密码"
              required
              type="password"
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold text-[#607a77]">
              选择你的身份
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dce8e5] bg-[#fbfdfa] px-4 py-3 text-sm text-[#334940] transition hover:border-[#117b7a] hover:bg-white">
                <input
                  className="mt-1"
                  defaultChecked
                  name="role"
                  type="radio"
                  value={UserRole.PARENT}
                />
                <span>
                  <span className="block font-semibold text-[#173231]">家长</span>
                  <span className="mt-1 block text-[#6b7f7b]">
                    发布家教需求，查看推荐并管理预约。
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dce8e5] bg-[#fbfdfa] px-4 py-3 text-sm text-[#334940] transition hover:border-[#117b7a] hover:bg-white">
                <input
                  className="mt-1"
                  name="role"
                  type="radio"
                  value={UserRole.TUTOR}
                />
                <span>
                  <span className="block font-semibold text-[#173231]">
                    大学生家教
                  </span>
                  <span className="mt-1 block text-[#6b7f7b]">
                    完善资料，接收预约并提交课后反馈。
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-2xl border border-[#dce8e5] bg-[#fbfdfa] px-4 py-3 text-sm leading-6 text-[#607a77] sm:col-span-2">
            <input className="mt-1" name="policyAccepted" type="checkbox" />
            <span>
              我已阅读并同意
              <Link className="font-semibold text-[#117b7a]" href="/terms">
                《用户协议》
              </Link>
              和
              <Link className="font-semibold text-[#117b7a]" href="/privacy">
                《隐私政策》
              </Link>
              。
            </span>
          </label>

          <Button
            className="h-12 w-full rounded-xl text-base sm:col-span-2"
            type="submit"
          >
            注册并继续
          </Button>
        </form>
      </Card>
      </section>
    </main>
  );
}
