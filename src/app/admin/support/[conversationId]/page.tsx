import { notFound, redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { getRoleLabel, getDashboardPath } from "@/lib/roles";
import { getSupportConversationForUser } from "@/lib/support-conversations";
import { sendAdminSupportMessageAction } from "../actions";

type AdminSupportDetailPageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminSupportDetailPage({
  params,
  searchParams,
}: AdminSupportDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  const { conversationId } = await params;
  const query = (await searchParams) ?? {};
  const conversation = await getSupportConversationForUser(conversationId, user);

  if (!conversation) {
    notFound();
  }

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">平台客服</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">
            {conversation.user.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            {getRoleLabel(conversation.user.role)} 的客服会话。请只回复与平台使用相关的问题。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/admin/support/${conversation.id}`} variant="outline">
            刷新消息
          </ButtonLink>
          <ButtonLink href="/admin/support" variant="outline">
            返回客服列表
          </ButtonLink>
        </div>
      </div>

      {query.error ? (
        <div className="mb-6 rounded-lg border border-[#efc8c8] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f3030]">
          {query.error}
        </div>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="grid gap-4">
          {conversation.messages.length > 0 ? (
            conversation.messages.map((message) => {
              const mine = message.senderUserId === user.id;

              return (
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 ${
                      mine
                        ? "bg-[#116a6c] text-white"
                        : "border border-[#dbe7e3] bg-[#f8fbfa] text-[#1f2d2d]"
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
                      <span>{mine ? "管理员" : message.sender.name}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d5e0dc] bg-[#fbfdfc] p-8 text-center text-sm text-[#66736e]">
              该会话还没有消息。
            </div>
          )}
        </div>

        <form action={sendAdminSupportMessageAction} className="mt-6 grid gap-3">
          <input name="conversationId" type="hidden" value={conversation.id} />
          <label className="text-sm font-semibold text-[#244b5b]" htmlFor="admin-support-content">
            回复用户
          </label>
          <textarea
            className="min-h-28 rounded-xl border border-[#cfdcd8] bg-white px-4 py-3 text-sm leading-6 text-[#1f2d2d] outline-none transition focus:border-[#116a6c] focus:ring-2 focus:ring-[#b8dcd8]"
            id="admin-support-content"
            maxLength={1000}
            name="content"
            placeholder="请输入文字回复，最多1000字"
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">发送回复</Button>
            <ButtonLink href={`/admin/support/${conversation.id}`} variant="outline">
              手动刷新
            </ButtonLink>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
