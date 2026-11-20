import type { CableAttachmentKind } from "@prisma/client";

export const cableAttachmentOptions = {
  IMAGE: { label: "Image", accept: "image/jpeg,image/png,image/webp", maxMiB: 1 },
  PDF: { label: "PDF", accept: "application/pdf", maxMiB: 2 },
} satisfies Record<CableAttachmentKind, { label: string; accept: string; maxMiB: number }>;

export const cableAttachmentKinds = ["IMAGE", "PDF"] as const satisfies readonly CableAttachmentKind[];

const MiB = 1024 * 1024;
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

function matches(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

export function detectCableAttachmentType(bytes: Uint8Array) {
  if (matches(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (matches(bytes, [0x52, 0x49, 0x46, 0x46]) && matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (matches(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

export function cableAttachmentSizeError(kind: CableAttachmentKind, size: number) {
  const { label, maxMiB } = cableAttachmentOptions[kind];
  return size > maxMiB * MiB ? `${label} must be ${maxMiB} MB or smaller.` : null;
}

export async function readCableAttachment(kind: CableAttachmentKind, entry: FormDataEntryValue | null) {
  if (entry === null || entry === "") return null;
  const { label, accept } = cableAttachmentOptions[kind];
  if (!(entry instanceof File)) return { error: `Choose a valid ${label.toLowerCase()} file.` };
  // React's multipart decoder can rename an unselected file input to "blob".
  if (entry.size === 0 && (!entry.name || (entry.name === "blob" && entry.type === "application/octet-stream"))) {
    return null;
  }
  const error = cableAttachmentSizeError(kind, entry.size);
  if (error) return { error };
  const data = new Uint8Array(await entry.arrayBuffer());
  const contentType = detectCableAttachmentType(data);
  if (!contentType || contentType !== entry.type || !accept.split(",").includes(contentType)) {
    return { error: kind === "IMAGE" ? "Choose a JPEG, PNG or WebP image." : "Choose a valid PDF." };
  }
  return { file: { kind, fileName: entry.name.slice(0, 255), contentType, data } };
}

export function cableAttachmentDownloadName(fileName: string, contentType: string) {
  const extension = extensions[contentType as keyof typeof extensions];
  const stem = fileName.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
  return `${stem || "cable-attachment"}.${extension ?? "bin"}`;
}
