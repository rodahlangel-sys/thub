import type { ReactNode } from "react";
import { Container } from "@/components/Container";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export function PageShell({
  children,
  className = "",
  compact = false,
}: PageShellProps) {
  return (
    <main
      className={`flex-1 bg-[#f6f4ef] text-[#1f2d2d] ${className}`}
    >
      <Container className={compact ? "py-6 sm:py-8" : "py-8 sm:py-10"}>
        {children}
      </Container>
    </main>
  );
}
