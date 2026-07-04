import type { ReactNode } from "react";

type AuthBackgroundProps = {
  children: ReactNode;
};

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d3b3b] text-[#1a2e2e]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.48]"
        style={{ backgroundImage: "url('/bg-mountain.png')" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(26,115,115,0.14) 0%, rgba(26,115,115,0.09) 40%, rgba(26,115,115,0.04) 70%, rgba(18,80,80,0.12) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute h-[420px] w-[420px] rounded-full blur-[64px]"
          style={{
            top: "15%",
            left: "60%",
            background:
              "radial-gradient(circle, rgba(26,115,115,0.10) 0%, transparent 70%)",
            animation: "auth-drift-1 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute h-[340px] w-[340px] rounded-full blur-[64px]"
          style={{
            top: "55%",
            left: "25%",
            background:
              "radial-gradient(circle, rgba(42,148,148,0.08) 0%, transparent 70%)",
            animation: "auth-drift-2 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute h-[280px] w-[280px] rounded-full blur-[64px]"
          style={{
            top: "35%",
            left: "10%",
            background:
              "radial-gradient(circle, rgba(26,115,115,0.06) 0%, transparent 70%)",
            animation: "auth-drift-3 26s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-5 sm:px-8">
        {children}
      </div>
    </main>
  );
}
