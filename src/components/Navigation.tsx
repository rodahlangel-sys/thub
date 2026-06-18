import { NavigationClient } from "@/components/NavigationClient";
import { PublicNavigation } from "@/components/PublicNavigation";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getDashboardPath } from "@/lib/roles";

export async function Navigation() {
  const user = await getCurrentUser();

  if (!user) {
    return <PublicNavigation />;
  }

  const unreadCount = await getUnreadNotificationCount(user.id);

  return (
    <NavigationClient
      dashboardHref={getDashboardPath(user.role)}
      name={user.name}
      role={user.role}
      unreadCount={unreadCount}
    />
  );
}
