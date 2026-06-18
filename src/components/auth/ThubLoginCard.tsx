import Link from "next/link";
import { loginAction } from "@/app/login/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { ThubBrandMark } from "@/components/auth/ThubBrandMark";

type ThubLoginCardProps = {
  error?: string;
};

const inputClassName =
  "h-12 w-full rounded-xl border border-[#dce8e5] bg-white/90 px-4 text-[15px] text-[#173231] outline-none transition placeholder:text-[#9aadaa] focus:border-[#117b7a] focus:bg-white focus:ring-4 focus:ring-[#c9e9e4]/55";

export function ThubLoginCard({ error }: ThubLoginCardProps) {
  return (
    <section className="w-full max-w-[472px] rounded-[28px] border border-white/80 bg-white/88 px-7 py-8 shadow-[0_24px_80px_rgba(20,84,82,0.13)] backdrop-blur-md sm:px-10 sm:py-9">
      <ThubBrandMark />

      <div className="mt-5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[#173231]">
          欢迎回来
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6b7f7b]">
          登录 THub，继续管理你的家教需求与服务。
        </p>
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="mt-5 rounded-xl border border-[#f1c8c5] bg-[#fff4f3] px-4 py-3 text-sm text-[#9f3d38]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-5">
        <label className="block" htmlFor="email">
          <span className="text-sm font-semibold text-[#607a77]">邮箱</span>
          <input
            autoComplete="email"
            className={`${inputClassName} mt-2`}
            id="email"
            name="email"
            placeholder="请输入邮箱"
            required
            type="email"
          />
        </label>

        <label className="block" htmlFor="password">
          <span className="text-sm font-semibold text-[#607a77]">密码</span>
          <PasswordField className={inputClassName} />
        </label>

        <button
          className="h-12 w-full rounded-xl bg-[#117b7a] text-base font-semibold text-white shadow-[0_14px_30px_rgba(17,123,122,0.22)] transition hover:bg-[#0c6868] focus:outline-none focus:ring-4 focus:ring-[#b9deda] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
        >
          登录
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[#758986]">
        还没有账号？
        <Link
          className="font-semibold text-[#117b7a] transition hover:text-[#0c6868]"
          href="/register"
        >
          立即注册
        </Link>
      </p>

      <details className="group mt-5 rounded-xl border border-[#e1ece9] bg-[#f8fbfa] px-4 py-3 text-sm text-[#6b7f7b]">
        <summary className="cursor-pointer list-none text-center font-medium text-[#55706d] outline-none transition hover:text-[#117b7a] focus-visible:ring-2 focus-visible:ring-[#b9deda]">
          查看体验账号
        </summary>
        <div className="mt-3 space-y-1.5 border-t border-[#e1ece9] pt-3 text-xs leading-5">
          <p>管理员：admin@example.com / admin123456</p>
          <p>家长：parent1@example.com / 123456</p>
          <p>大学生家教：tutor1@example.com / 123456</p>
        </div>
      </details>
    </section>
  );
}
