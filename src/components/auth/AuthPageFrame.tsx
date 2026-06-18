import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { ThubBrandMark } from "@/components/auth/ThubBrandMark";

type AuthPageFrameProps = {
  children: ReactNode;
};

const footerLinks = [
  { href: "/terms", label: "用户协议" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/safety", label: "安全提示" },
  { href: "/about", label: "关于平台" },
];

export function AuthPageFrame({ children }: AuthPageFrameProps) {
  return (
    <AuthBackground>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link
          className="inline-flex items-center gap-3 rounded-full bg-white/55 px-3 py-2 text-sm font-semibold text-[#224442] shadow-sm backdrop-blur transition hover:bg-white"
          href="/"
        >
          <span className="relative flex size-8 overflow-hidden rounded-full bg-white">
            <ThubBrandMark compact />
          </span>
          THub
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            className="hidden text-[#607a77] transition hover:text-[#117b7a] sm:inline"
            href="/about"
          >
            关于平台
          </Link>
          <Link
            className="rounded-full border border-[#cfe1dc] bg-white/70 px-4 py-2 font-semibold text-[#117b7a] shadow-sm transition hover:bg-white"
            href="/register"
          >
            立即注册
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
        {children}
      </div>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-xs text-[#7b908d]">
        {footerLinks.map((link) => (
          <Link
            className="transition hover:text-[#117b7a]"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </footer>
    </AuthBackground>
  );
}
