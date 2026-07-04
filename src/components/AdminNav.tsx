import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "后台首页" },
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/tutors", label: "家教审核" },
  { href: "/admin/demands", label: "需求管理" },
  { href: "/admin/orders", label: "订单管理" },
  { href: "/admin/payments", label: "支付记录" },
  { href: "/admin/payments/qrcode", label: "待确认平台收款" },
  { href: "/admin/payment-settings", label: "支付配置" },
  { href: "/admin/payment-qrcodes", label: "收款码管理" },
  { href: "/admin/refunds", label: "退款管理" },
  { href: "/admin/reviews", label: "评价管理" },
  { href: "/admin/feedbacks", label: "课后反馈" },
  { href: "/admin/support", label: "客服消息" },
];

export function AdminNav() {
  return (
    <div className="border-b border-[#d9e3e6] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-5 py-3 sm:px-8">
        {adminLinks.map((link) => (
          <Link
            className="whitespace-nowrap rounded-md border border-transparent px-3 py-2 text-sm font-medium text-[#244b5b] transition hover:border-[#cfe2e5] hover:bg-[#eef8fa] hover:text-[#176b87]"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
