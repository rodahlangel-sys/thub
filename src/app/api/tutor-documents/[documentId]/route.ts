import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { privateFileStorage } from "@/lib/storage";
import { getTutorDocumentAccess } from "@/lib/tutor-document-access";

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
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return privateError(401, "Authentication required");
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

  const access = getTutorDocumentAccess(
    { id: user.id, role: user.role },
    document ? { ownerUserId: document.tutorProfile.userId } : null,
  );
  if (access === "NOT_FOUND") return privateError(404, "Document not found");
  if (access === "FORBIDDEN") return privateError(403, "Access denied");
  if (!document) return privateError(404, "Document not found");

  let storedFile;
  try {
    storedFile = await privateFileStorage.read(document.storageKey);
  } catch {
    return privateError(503, "Private storage unavailable");
  }

  if (!storedFile) {
    return privateError(410, "Private file unavailable");
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
