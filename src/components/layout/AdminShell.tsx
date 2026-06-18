import type { ReactNode } from "react";
import { Container } from "@/components/Container";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <main className="flex-1 bg-[#f4f6f8] py-8 text-[#1d2b2f]">
      <Container>{children}</Container>
    </main>
  );
}
