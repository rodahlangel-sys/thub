import { notFound, redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { getConversationForUser } from "@/lib/conversations";
import { getDashboardPath } from "@/lib/roles";
import { sendMessageAction } from "../actions";

type ConversationPageProps = {
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

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) {
    redirect(getDashboardPath(user.role));
  }

  const { conversationId } = await params;
  const query = (await searchParams) ?? {};
  const conversation = await getConversationForUser(conversationId, user.id);

  if (!conversation) {
    notFound();
  }

  const counterpart =
    user.id === conversation.parentUserId ? conversation.tutor : conversation.parent;

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">站内私聊</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">
            与{counterpart.name}沟通
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            {conversation.order
              ? `关联订单：${conversation.order.subject}`
              : `关联需求：${conversation.demand.childGrade ?? ""} ${conversation.demand.subject}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/messages/${conversation.id}`} variant="outline">
            刷新消息
          </ButtonLink>
          <ButtonLink href="/messages" variant="outline">
            返回消息列表
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
                      <span>{mine ? "我" : message.sender.name}</span>
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
              还没有消息，可以先向对方说明上课时间、地点或沟通重点。
            </div>
          )}
        </div>

        <form action={sendMessageAction} className="mt-6 grid gap-3">
          <input name="conversationId" type="hidden" value={conversation.id} />
          <label className="text-sm font-semibold text-[#244b5b]" htmlFor="message-content">
            发送消息
          </label>
          <textarea
            className="min-h-28 rounded-xl border border-[#cfdcd8] bg-white px-4 py-3 text-sm leading-6 text-[#1f2d2d] outline-none transition focus:border-[#116a6c] focus:ring-2 focus:ring-[#b8dcd8]"
            id="message-content"
            maxLength={1000}
            name="content"
            placeholder="请输入文字消息，最多1000字"
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">发送</Button>
            <ButtonLink href={`/messages/${conversation.id}`} variant="outline">
              手动刷新
            </ButtonLink>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
