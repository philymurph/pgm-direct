import { getSession } from "@/lib/auth";
import { cableAttachmentDownloadName, cableAttachmentOptions } from "@/lib/cable-attachments";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const headers = { "Cache-Control": "private, no-store" };
  if ((await getSession())?.role !== "ADMIN") return new Response(null, { status: 403, headers });

  const { id: cableTypeId, kind } = await params;
  if (kind !== "IMAGE" && kind !== "PDF") return new Response(null, { status: 404, headers });
  const file = await prisma.cableAttachment.findUnique({
    where: { cableTypeId_kind: { cableTypeId, kind } },
  });
  if (!file) return new Response(null, { status: 404, headers });

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (preview && !cableAttachmentOptions[kind].accept.split(",").includes(file.contentType)) {
    return new Response(null, { status: 415, headers });
  }

  const name = cableAttachmentDownloadName(file.fileName, file.contentType);
  return new Response(new Uint8Array(file.data), {
    headers: {
      ...headers,
      "Content-Type": file.contentType,
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${name}"`,
      "Content-Security-Policy": "frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
