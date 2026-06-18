"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThubBrandMark } from "@/components/auth/ThubBrandMark";

export function PublicNavigation() {
  const pathname = usePathname();
  const isRegisterPage = pathname === "/register";

  return (
    <header className="sticky top-0 z-30 border-b border-[#dbe8e4] bg-[#f7fbfa]/92 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link className="inline-flex items-center gap-3" href="/">
          <span className="relative flex size-9 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[#d8e7e3]">
            <ThubBrandMark compact />
          </span>
          <span className="text-base font-semibold text-[#224442]">THub</span>
        </Link>

        {isRegisterPage ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[#708784] sm:inline">已有账号？</span>
            <Link
              className="rounded-full border border-[#cfe1dc] bg-white px-4 py-2 font-semibold text-[#117b7a] shadow-sm transition hover:bg-[#f8fcfb]"
              href="/login"
            >
              返回登录
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link className="text-[#607a77] transition hover:text-[#117b7a]" href="/">
              返回首页
            </Link>
            <Link
              className="rounded-full border border-[#cfe1dc] bg-white px-4 py-2 font-semibold text-[#117b7a] shadow-sm transition hover:bg-[#f8fcfb]"
              href="/login"
            >
              登录
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
