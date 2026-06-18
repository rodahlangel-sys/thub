import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#116a6c] text-white shadow-[0_8px_18px_rgba(17,106,108,0.18)] hover:bg-[#0d5759]",
  secondary: "bg-[#e8f3ef] text-[#185653] hover:bg-[#dcece8]",
  outline:
    "border border-[#c7d5d2] bg-white text-[#244b5b] hover:border-[#116a6c] hover:bg-[#f7fbfa]",
  danger: "bg-[#b5473f] text-white hover:bg-[#983b35]",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return [
    "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#b8dcd8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName(variant, className)}
      type={type}
      {...props}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
};

export function ButtonLink({
  className = "",
  href,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName(variant, className)} href={href} {...props} />
  );
}
