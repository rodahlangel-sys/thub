import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button, ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/ui/PageShell";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrGetSupportConversationForUser,
  getSupportConversationForUser,
} from "@/lib/support-conversations";
import { getDashboardPath } from "@/lib/roles";
import { sendUserSupportMessageAction } from "./actions";

type SupportPageProps = {
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

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT && user.role !== UserRole.TUTOR) {
    redirect("/admin/support");
  }

  const query = (await searchParams) ?? {};
  const conversationSeed = await createOrGetSupportConversationForUser(user);
  const conversation = await getSupportConversationForUser(conversationSeed.id, user);

  if (!conversation) {
    redirect(getDashboardPath(user.role));
  }

  return (
    <PageShell className="bg-[#f7f4ee]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#116a6c]">平台客服</p>
          <h1 className="mt-2 text-3xl font-bold text-[#172c2c]">联系客服</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66736e]">
            遇到账号、预约、支付、退款或资料审核问题，可以在这里给平台管理员留言。当前为手动刷新，不会实时弹出。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/support" variant="outline">
            刷新消息
          </ButtonLink>
          <ButtonLink href={getDashboardPath(user.role)} variant="outline">
            返回工作台
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
                      <span>{mine ? "我" : "平台管理员"}</span>
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
              还没有客服消息。可以先说明遇到的问题和希望平台协助的事项。
            </div>
          )}
        </div>

        <form action={sendUserSupportMessageAction} className="mt-6 grid gap-3">
          <label className="text-sm font-semibold text-[#244b5b]" htmlFor="support-content">
            发送给平台管理员
          </label>
          <textarea
            className="min-h-28 rounded-xl border border-[#cfdcd8] bg-white px-4 py-3 text-sm leading-6 text-[#1f2d2d] outline-none transition focus:border-[#116a6c] focus:ring-2 focus:ring-[#b8dcd8]"
            id="support-content"
            maxLength={1000}
            name="content"
            placeholder="请输入文字消息，最多1000字"
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">发送</Button>
            <ButtonLink href="/support" variant="outline">
              手动刷新
            </ButtonLink>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
