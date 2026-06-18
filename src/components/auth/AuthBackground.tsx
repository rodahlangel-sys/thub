import type { ReactNode } from "react";

type AuthBackgroundProps = {
  children: ReactNode;
};

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f8f6] text-[#132d2d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2b8b8b]/10" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2b8b8b]/8" />
        <div className="absolute left-[12%] top-[16%] h-52 w-52 rounded-full bg-[#2b8b8b]/10 blur-3xl" />
        <div className="absolute bottom-[10%] right-[12%] h-60 w-60 rounded-full bg-[#cbe8e1]/45 blur-3xl" />
        <div className="absolute left-[28%] top-[11%] size-1.5 rounded-full bg-[#2b8b8b]/20" />
        <div className="absolute right-[23%] top-[28%] size-1 rounded-full bg-[#2b8b8b]/20" />
        <div className="absolute bottom-[20%] left-[23%] size-2 rounded-full bg-[#2b8b8b]/15" />
        <div className="absolute bottom-[8%] right-[8%] hidden size-12 rounded-full border border-[#2b8b8b]/8 md:block" />
      </div>

      <div className="relative flex min-h-full flex-col px-5 py-5 sm:px-8">
        {children}
      </div>
    </main>
  );
}
