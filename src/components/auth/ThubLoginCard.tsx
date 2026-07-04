import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { loginAction } from "@/app/login/actions";
import { PasswordField } from "@/components/auth/PasswordField";

const cormorant = Cormorant_Garamond({
  weight: ["700"],
  style: ["italic"],
  subsets: ["latin"],
  display: "swap",
});

type ThubLoginCardProps = {
  error?: string;
};

const glassInput =
  "h-[52px] w-full rounded-xl border border-[#1a7373]/10 bg-white/[0.58] px-4 text-[14px] text-[#1a2e2e] outline-none transition placeholder:text-[#8fa5a5]/65 focus:border-[#1a7373] focus:bg-white/[0.92] focus:shadow-[0_0_0_4px_rgba(26,115,115,0.07),0_2px_8px_rgba(26,115,115,0.05)]";

export function ThubLoginCard({ error }: ThubLoginCardProps) {
  return (
    <section
      className="relative w-full max-w-[408px] rounded-3xl border border-white/55 bg-white/[0.66] px-10 py-12 shadow-[0_0_0_0.5px_rgba(255,255,255,0.3),0_2px_8px_rgba(26,115,115,0.04),0_8px_32px_rgba(26,115,115,0.06),0_24px_84px_rgba(26,115,115,0.10)] backdrop-blur-[48px] [backdrop-filter:blur(48px)_saturate(1.2)] sm:px-10"
      style={{ animation: "auth-card-in 0.8s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{
        padding: 1,
        background: "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.08) 70%, rgba(255,255,255,0.35) 100%)",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }} />

      <div className="text-center" style={{ animation: "auth-card-in 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both" }}>
        <h1
          className={`${cormorant.className} text-[50px] font-bold italic leading-[1.05] tracking-[2px] text-[#1a7373] [text-shadow:0_1px_2px_rgba(26,115,115,0.06)]`}
        >
          THub
        </h1>
      </div>

      <div className="mt-5 text-center" style={{ animation: "auth-card-in 0.6s 0.16s cubic-bezier(0.22,1,0.36,1) both" }}>
        <h2 className="text-[26px] font-bold tracking-tight text-[#1a2e2e]">
          欢迎回来
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-[#5a7070]">
          登录 THub，继续管理你的家教需求与服务。
        </p>
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="mt-5 rounded-xl border border-[#f1c8c5] bg-[#fff4f3]/90 px-4 py-3 text-sm text-[#9f3d38] backdrop-blur-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-4">
        <label className="block" htmlFor="email">
          <span className="pl-[3px] text-[12.5px] font-medium tracking-[0.2px] text-[#8fa5a5]">邮箱</span>
          <input
            autoComplete="email"
            className={`${glassInput} mt-[6px]`}
            id="email"
            name="email"
            placeholder="请输入邮箱"
            required
            type="email"
          />
        </label>

        <label className="block" htmlFor="password">
          <span className="pl-[3px] text-[12.5px] font-medium tracking-[0.2px] text-[#8fa5a5]">密码</span>
          <PasswordField className={glassInput} />
        </label>

        <div className="flex items-center justify-between pt-1 text-[12.5px]">
          <label className="flex cursor-pointer items-center gap-[7px] text-[#8fa5a5]">
            <input
              className="h-[15px] w-[15px] accent-[#1a7373]"
              type="checkbox"
            />
            记住我
          </label>
          <Link
            className="font-semibold tracking-[0.1px] text-[#1a7373] transition-opacity hover:opacity-65"
            href="/support"
          >
            忘记密码？
          </Link>
        </div>

        <button
          className="mt-2 h-[52px] w-full rounded-xl bg-gradient-to-br from-[#1a7373] to-[#167b7b] text-[15.5px] font-semibold tracking-[0.3px] text-white shadow-[0_2px_8px_rgba(26,115,115,0.15),0_8px_22px_rgba(26,115,115,0.10)] transition hover:brightness-105 hover:shadow-[0_4px_14px_rgba(26,115,115,0.20),0_12px_32px_rgba(26,115,115,0.14)] hover:-translate-y-px active:scale-[0.985]"
          type="submit"
        >
          登 录
        </button>
      </form>

      <p className="mt-7 text-center text-[12.5px] tracking-[0.15px] text-[#8fa5a5]" style={{ animation: "auth-card-in 0.6s 0.52s cubic-bezier(0.22,1,0.36,1) both" }}>
        还没有账号？
        <Link
          className="font-semibold text-[#1a7373] transition-opacity hover:opacity-65"
          href="/register"
        >
          立即注册
        </Link>
      </p>
    </section>
  );
}
