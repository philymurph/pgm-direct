"use client";

import type { CableAttachmentKind } from "@prisma/client";
import Image from "next/image";
import { useId, useState } from "react";

export function CableAttachmentPreviews({
  cableId,
  cableName,
  attachments,
}: {
  cableId: string;
  cableName: string;
  attachments: { kind: CableAttachmentKind; fileName: string }[];
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${open ? "Hide attachment previews" : "Preview attachments"} for ${cableName}`}
        className="text-sm font-medium text-blue-700 hover:underline"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide attachment previews" : "Preview attachments"}
      </button>
      <div id={id} hidden={!open}>
        {open && (
          <div className="mt-3 space-y-4">
            {attachments.map(({ kind, fileName }) => {
              const url = `/admin/cable-making/${cableId}/attachments/${kind}`;
              return (
                <figure key={kind} className="space-y-2">
                  <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="break-all font-medium">{fileName}</span>
                    <a href={url} className="text-blue-700 underline" aria-label={`Download ${fileName}`}>
                      Download {kind === "PDF" ? "PDF" : "image"}
                    </a>
                  </figcaption>
                  {kind === "IMAGE" ? (
                    <div className="relative h-64 overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <Image src={`${url}?preview=1`} alt={`${cableName}: ${fileName}`} fill unoptimized loading="eager" className="object-contain" />
                    </div>
                  ) : (
                    <iframe src={`${url}?preview=1`} title={`PDF preview: ${fileName}`}
                      className="h-[28rem] w-full rounded border border-slate-200" />
                  )}
                  {kind === "PDF" && (
                    <p className="text-xs text-slate-600">If the PDF preview doesn’t load in your browser, download it instead.</p>
                  )}
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
