import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  canParentViewTutorPaymentQr,
  canViewPlatformPaymentQr,
  parsePaymentQrType,
} from "@/lib/payment-qrcodes";
import { prisma } from "@/lib/prisma";
import { privateFileStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateError(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string; type: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return privateError(401, "Authentication required");

  const { scope, id, type } = await params;
  const qrType = parsePaymentQrType(type);
  if (!qrType) return privateError(404, "Payment QR not found");

  let qr:
    | {
        storageKey: string;
        mimeType: string;
      }
    | null = null;

  if (scope === "platform") {
    if (!canViewPlatformPaymentQr(user.role)) {
      return privateError(403, "Access denied");
    }
    qr = await prisma.platformPaymentQrCode.findUnique({
      where: { type: qrType },
      select: { storageKey: true, mimeType: true },
    });
  } else if (scope === "tutor") {
    qr = await prisma.tutorPaymentQrCode.findUnique({
      where: {
        tutorProfileId_type: {
          tutorProfileId: id,
          type: qrType,
        },
      },
      select: {
        storageKey: true,
        mimeType: true,
      },
    });

    if (qr) {
      if (user.role === UserRole.ADMIN) {
        // Admins can inspect QR configuration.
      } else if (user.role === UserRole.TUTOR) {
        const owner = await prisma.tutorProfile.findFirst({
          where: { id, userId: user.id },
          select: { id: true },
        });
        if (!owner) return privateError(403, "Access denied");
      } else if (user.role === UserRole.PARENT) {
        const order = await prisma.order.findFirst({
          where: {
            parentId: user.id,
            tutor: { tutorProfile: { id } },
          },
          select: { status: true },
          orderBy: { createdAt: "desc" },
        });
        if (!order || !canParentViewTutorPaymentQr(order.status)) {
          return privateError(403, "Access denied");
        }
      } else {
        return privateError(403, "Access denied");
      }
    }
  } else {
    return privateError(404, "Payment QR not found");
  }

  if (!qr) return privateError(404, "Payment QR not found");

  let storedFile;
  try {
    storedFile = await privateFileStorage.read(qr.storageKey);
  } catch {
    return privateError(503, "Private storage unavailable");
  }

  if (!storedFile) return privateError(410, "Private file unavailable");

  return new NextResponse(new Uint8Array(storedFile.buffer).buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(storedFile.buffer.byteLength),
      "Content-Type": qr.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
