import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { privateFileStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateNotFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return privateNotFound();
  }

  const { documentId } = await params;
  const document = await prisma.tutorVerificationDocument.findUnique({
    where: { id: documentId },
    include: {
      tutorProfile: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!document) {
    return privateNotFound();
  }

  const canView =
    user.role === UserRole.ADMIN ||
    (user.role === UserRole.TUTOR && document.tutorProfile.userId === user.id);

  if (!canView) {
    return privateNotFound();
  }

  const storedFile = await privateFileStorage.read(document.storageKey);

  if (!storedFile) {
    return privateNotFound();
  }

  const body = new Uint8Array(storedFile.buffer).buffer;

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(storedFile.buffer.byteLength),
      "Content-Type": document.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
