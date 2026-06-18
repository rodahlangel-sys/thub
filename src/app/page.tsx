import { redirect } from "next/navigation";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { ThubLoginCard } from "@/components/auth/ThubLoginCard";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPath } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  return (
    <AuthPageFrame>
      <ThubLoginCard />
    </AuthPageFrame>
  );
}
