import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";

type AppChromeProps = {
  children: ReactNode;
};

const authPaths = new Set(["/", "/login", "/register"]);

export async function AppChrome({ children }: AppChromeProps) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "/";
  const isAuthPath = authPaths.has(pathname);

  return (
    <>
      {!isAuthPath ? <Navigation /> : null}
      {children}
      {!isAuthPath ? <Footer /> : null}
    </>
  );
}
