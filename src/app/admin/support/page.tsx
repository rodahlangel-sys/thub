import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { getRoleLabel, getDashboardPath } from "@/lib/roles";
import { listSupportConversationsForAdmin } from "@/lib/support-conversations";

function formatMessageTime(value: Date | null | undefined) {
  if (!value) return "暂无消息";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminSupportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const conversations = await listSupportConversationsForAdmin(user);

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">平台客服</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">客服消息</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            查看家长和大学生家教发来的平台咨询，并进行文字回复。
          </p>
        </div>
        <ButtonLink href="/admin" variant="outline">
          返回后台首页
        </ButtonLink>
      </div>

      {conversations.length > 0 ? (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <Link
              className="block rounded-[1.5rem] border border-[#dbe7e3] bg-white p-5 shadow-[0_12px_30px_rgba(18,45,42,0.05)] transition hover:border-[#116a6c]"
              href={`/admin/support/${conversation.id}`}
              key={conversation.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1f2d2d]">
                    {conversation.userName}
                  </h2>
                  <p className="mt-1 text-sm text-[#66736e]">
                    {getRoleLabel(conversation.userRole)}
                  </p>
                </div>
                <span className="text-sm text-[#7b8580]">
                  {formatMessageTime(conversation.lastMessageAt)}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#536861]">
                {conversation.lastMessagePreview}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-[#172c2c]">暂无客服会话</h2>
          <p className="mt-3 text-sm leading-6 text-[#66736e]">
            用户首次进入“联系客服”后，会在这里出现对应会话。
          </p>
        </Card>
      )}
    </PageShell>
  );
}
