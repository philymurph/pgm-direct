import { getSession } from "@/lib/auth";
import { cableAttachmentOptions } from "@/lib/cable-attachments";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if ((await getSession())?.role !== "ADMIN") return new Response(null, { status: 403, headers });
  const { id, imageId } = await params;
  const image = await prisma.cablePartImage.findFirst({ where: { id: imageId, partId: id } });
  if (!image) return new Response(null, { status: 404, headers });
  if (!cableAttachmentOptions.IMAGE.accept.split(",").includes(image.contentType)) return new Response(null, { status: 415, headers });
  return new Response(new Uint8Array(image.data), { headers: {
    ...headers, "Content-Type": image.contentType, "Content-Disposition": "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff",
  } });
}
