import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[#d9e3df] bg-white shadow-[0_1px_2px_rgba(18,45,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}
