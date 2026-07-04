"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { Container } from "@/components/Container";
import { ThubBrandMark } from "@/components/auth/ThubBrandMark";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

type NavigationClientProps = {
  dashboardHref: string;
  name: string;
  role: UserRole;
  unreadCount: number;
};

const roleLabels: Record<UserRole, string> = {
  PARENT: "家长",
  TUTOR: "大学生家教",
  ADMIN: "管理员",
};

const dashboardLabels: Record<UserRole, string> = {
  PARENT: "家长首页",
  TUTOR: "服务首页",
  ADMIN: "运营后台",
};

const navConfig: Record<UserRole, NavItem[]> = {
  PARENT: [
    { href: "/parent", label: "家长首页", exact: true },
    { href: "/parent/demands", label: "我的需求", matchPrefixes: ["/parent/demands"] },
    { href: "/parent/orders", label: "我的订单", matchPrefixes: ["/parent/orders"] },
    { href: "/messages", label: "消息", matchPrefixes: ["/messages"] },
    { href: "/support", label: "联系客服", matchPrefixes: ["/support"] },
  ],
  TUTOR: [
    { href: "/tutor", label: "服务首页", exact: true },
    { href: "/tutor/orders", label: "预约管理", matchPrefixes: ["/tutor/orders"] },
    { href: "/tutor/payments", label: "收款确认", matchPrefixes: ["/tutor/payments"] },
    { href: "/tutor/profile", label: "我的资料", matchPrefixes: ["/tutor/profile"] },
    { href: "/tutor/reviews", label: "服务评价", matchPrefixes: ["/tutor/reviews"] },
    { href: "/messages", label: "消息", matchPrefixes: ["/messages"] },
    { href: "/support", label: "联系客服", matchPrefixes: ["/support"] },
  ],
  ADMIN: [{ href: "/admin", label: "运营后台", matchPrefixes: ["/admin"] }],
};

function matchesPath(pathname: string, item: NavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  const prefixes = item.matchPrefixes ?? [item.href];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getActiveHref(pathname: string, items: NavItem[]) {
  const matched = items
    .filter((item) => matchesPath(pathname, item))
    .sort((a, b) => b.href.length - a.href.length);

  return matched[0]?.href;
}

function getLinkClass(active: boolean) {
  return `rounded-md px-2.5 py-2 transition ${
    active
      ? "bg-[#eef8fa] font-semibold text-[#176b87]"
      : "text-[#4d6258] hover:bg-[#f5fbfa] hover:text-[#176b87]"
  }`;
}

export function NavigationClient({
  dashboardHref,
  name,
  role,
  unreadCount,
}: NavigationClientProps) {
  const pathname = usePathname();
  const navLinks = navConfig[role] ?? [
    { href: dashboardHref, label: dashboardLabels[role], exact: true },
  ];
  const activeHref =
    pathname === "/notifications" || pathname.startsWith("/notifications/")
      ? "/notifications"
      : getActiveHref(pathname, navLinks);
  const isParent = role === UserRole.PARENT;
  const isTutor = role === UserRole.TUTOR;

  return (
    <header className="sticky top-0 z-30 border-b border-[#d9e3e6] bg-white/95 shadow-[0_1px_0_rgba(16,40,48,0.02)] backdrop-blur">
      <Container>
        <nav className="flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={dashboardHref} className="flex items-center gap-3">
            <span className="relative flex size-9 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[#d8e7e3]">
              <ThubBrandMark compact />
            </span>
            <span>
              <span className="block text-base font-bold text-[#182f38]">THub</span>
              <span className="hidden text-xs text-[#6c7f86] sm:block">
                武汉高校大学生家教信息平台
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
            {navLinks.map((link) => (
              <Link
                className={getLinkClass(activeHref === link.href)}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
            <Link
              className={`inline-flex items-center gap-1 ${getLinkClass(activeHref === "/notifications")}`}
              href="/notifications"
            >
              通知
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#176b87] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
            <span className="text-[#52676f]">{name}</span>
            <Badge tone={isParent ? "blue" : isTutor ? "green" : "gray"}>
              {roleLabels[role]}
            </Badge>
            <form action="/logout" method="post">
              <button className={buttonClassName("outline")} type="submit">
                退出登录
              </button>
            </form>
          </div>
        </nav>
      </Container>
    </header>
  );
}
