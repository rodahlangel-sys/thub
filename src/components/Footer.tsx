import Link from "next/link";
import { Container } from "@/components/Container";

const footerLinks = [
  { href: "/about", label: "关于平台" },
  { href: "/terms", label: "用户协议" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/service-rules", label: "服务规则" },
  { href: "/refund-rules", label: "退款规则" },
  { href: "/safety", label: "安全提示" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#d9e3e6] bg-white py-8">
      <Container>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-[#182f38]">THub</p>
            <p className="mt-2 text-sm text-[#60727a]">
              面向武汉家庭与高校大学生的家教信息交互平台
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {footerLinks.map((link) => (
              <Link
                className="text-[#52676f] transition hover:text-[#176b87]"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
}
