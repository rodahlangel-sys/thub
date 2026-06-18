import { redirect } from "next/navigation";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { ThubLoginCard } from "@/components/auth/ThubLoginCard";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  const params = await searchParams;

  return (
    <AuthPageFrame>
      <ThubLoginCard error={params?.error} />
    </AuthPageFrame>
  );
}
