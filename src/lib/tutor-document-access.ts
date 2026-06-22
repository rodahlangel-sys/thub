type DocumentViewer = {
  id: string;
  role: "PARENT" | "TUTOR" | "ADMIN";
};

export type TutorDocumentAccess =
  | "ALLOWED"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "FORBIDDEN";

export function getTutorDocumentAccess(
  user: DocumentViewer | null,
  document: { ownerUserId: string } | null,
): TutorDocumentAccess {
  if (!user) return "UNAUTHENTICATED";
  if (!document) return "NOT_FOUND";
  if (user.role === "ADMIN") return "ALLOWED";
  if (user.role === "TUTOR" && user.id === document.ownerUserId) return "ALLOWED";
  return "FORBIDDEN";
}
