import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { listConversationsForUser } from "@/lib/conversations";
import { getDashboardPath } from "@/lib/roles";

type MessagesPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

function formatMessageTime(value: Date | null | undefined) {
  if (!value) return "暂无消息";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const query = (await searchParams) ?? {};
  const conversations = await listConversationsForUser(user);

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">站内私聊</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">消息</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            和已经匹配到的家长或大学生家教沟通上课时间、方式和注意事项。
          </p>
        </div>
        <ButtonLink href={getDashboardPath(user.role)} variant="outline">
          返回工作台
        </ButtonLink>
      </div>

      {query.error ? (
        <div className="mb-6 rounded-lg border border-[#efc8c8] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f3030]">
          {query.error}
        </div>
      ) : null}

      {conversations.length > 0 ? (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <Link
              className="block rounded-[1.5rem] border border-[#dbe7e3] bg-white p-5 shadow-[0_12px_30px_rgba(18,45,42,0.05)] transition hover:border-[#116a6c]"
              href={`/messages/${conversation.id}`}
              key={conversation.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1f2d2d]">
                    {conversation.counterpartName}
                  </h2>
                  <p className="mt-1 text-sm text-[#66736e]">
                    {conversation.orderSubject
                      ? `关联订单：${conversation.orderSubject}`
                      : `关联需求：${conversation.demandSubject}`}
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
          <h2 className="text-xl font-bold text-[#172c2c]">暂无私聊会话</h2>
          <p className="mt-3 text-sm leading-6 text-[#66736e]">
            家长可以从推荐老师、家教详情或订单详情发起联系；家教可以从订单详情进入沟通。
          </p>
        </Card>
      )}
    </PageShell>
  );
}
