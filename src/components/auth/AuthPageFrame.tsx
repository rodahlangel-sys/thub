import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";

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
      <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
        {children}
      </div>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-4 text-xs text-white/50">
        {footerLinks.map((link) => (
          <Link
            className="transition hover:text-white/80"
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
