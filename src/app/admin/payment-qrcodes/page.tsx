/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { AdminShell } from "@/components/layout/AdminShell";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { paymentQrTypeLabels, paymentQrTypes } from "@/lib/payment-qrcodes";
import { getDashboardPath } from "@/lib/roles";
import { formatTutorDocumentSize } from "@/lib/tutor-documents";
import { prisma } from "@/lib/prisma";
import {
  deletePlatformPaymentQrAction,
  uploadPlatformPaymentQrAction,
} from "./actions";

type AdminPaymentQrPageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminPaymentQrPage({
  searchParams,
}: AdminPaymentQrPageProps) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.ADMIN) redirect(getDashboardPath(user.role));

  const [query, qrs] = await Promise.all([
    searchParams,
    prisma.platformPaymentQrCode.findMany({
      orderBy: { type: "asc" },
    }),
  ]);
  const qrByType = new Map(qrs.map((qr) => [qr.type, qr]));

  return (
    <AdminShell>
      <PageHeader
        description="维护平台信息服务费收款二维码。二维码文件存储在私有云存储中，前端只通过受控接口预览。"
        eyebrow="支付配置"
        title="平台收款二维码管理"
      />

      {query?.success ? (
        <div className="mt-6 rounded-xl border border-[#b9d8c5] bg-[#f0f8f3] px-4 py-3 text-sm text-[#27734d]">
          {query.success}
        </div>
      ) : null}
      {query?.error ? (
        <div className="mt-6 rounded-xl border border-[#e6b6b6] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
          {query.error}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {paymentQrTypes.map((type) => {
          const qr = qrByType.get(type);
          return (
            <Card className="p-6" key={type}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#172c2c]">
                    {paymentQrTypeLabels[type]}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#60716c]">
                    家长支付平台信息服务费时展示。请上传管理员实际可收款的个人二维码。
                  </p>
                </div>
                <Badge tone={qr ? "green" : "yellow"}>
                  {qr ? "已配置" : "待配置"}
                </Badge>
              </div>

              {qr ? (
                <div className="mt-5">
                  <div className="overflow-hidden rounded-2xl border border-[#dbe7e4] bg-[#f8fbfa]">
                    <img
                      alt={`${paymentQrTypeLabels[type]}预览`}
                      className="h-72 w-full object-contain"
                      src={`/api/payment-qrcodes/platform/default/${type}`}
                    />
                  </div>
                  <p className="mt-3 text-sm text-[#60716c]">
                    {qr.originalName} · {formatTutorDocumentSize(qr.sizeBytes)}
                  </p>
                </div>
              ) : null}

              <form action={uploadPlatformPaymentQrAction} className="mt-5 space-y-3">
                <input name="type" type="hidden" value={type} />
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full rounded-xl border border-[#cbd8dc] bg-white px-3 py-2 text-sm text-[#182f38]"
                  name="qr"
                  required
                  type="file"
                />
                <Button type="submit">{qr ? "更换二维码" : "上传二维码"}</Button>
              </form>

              {qr ? (
                <form action={deletePlatformPaymentQrAction} className="mt-4">
                  <input name="type" type="hidden" value={type} />
                  <button
                    className="text-sm font-semibold text-[#a33b3b] hover:text-[#842a2a]"
                    type="submit"
                  >
                    删除二维码
                  </button>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}
