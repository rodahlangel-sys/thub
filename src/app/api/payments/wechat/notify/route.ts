import { NextResponse } from "next/server";
import { WechatPayProvider } from "@/lib/payments/wechatProvider";

export async function POST(request: Request) {
  const params = await request.json().catch(() => ({}));
  const provider = new WechatPayProvider();
  const result = await provider.verifyNotify?.(params);

  // 微信支付通知后续需要在这里完成验签、解密 resource，并以确认后的交易状态更新 Payment / Order。
  // 本阶段不信任任何回调内容，也不改变订单状态。
  return NextResponse.json({
    success: result?.success ?? false,
    message: result?.message ?? "微信支付通知暂未启用",
  });
}
