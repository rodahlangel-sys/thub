import { NextResponse } from "next/server";
import { AlipayProvider } from "@/lib/payments/alipayProvider";

export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  const params = body ? Object.fromEntries(body.entries()) : {};
  const provider = new AlipayProvider();
  const result = await provider.verifyNotify?.(params);

  // 支付宝异步通知后续需要在这里完成验签，并以验签后的交易状态更新 Payment / Order。
  // 本阶段不信任任何回调内容，也不改变订单状态。
  return NextResponse.json({
    success: result?.success ?? false,
    message: result?.message ?? "支付宝支付通知暂未启用",
  });
}
