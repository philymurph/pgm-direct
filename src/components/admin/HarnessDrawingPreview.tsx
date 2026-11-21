"use client";

import Image from "next/image";
import { useId, useRef, type ReactNode } from "react";

export function HarnessDrawingPreview({ name, image, children }: {
  name: string; image: string; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();

  return <>
    <button type="button" onClick={() => dialog.current?.showModal()}
      aria-label={`View full drawing: ${name}`}
      className="group w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
      <span className="relative block h-36 overflow-hidden rounded border border-slate-200 bg-white">
        <Image unoptimized fill src={image} alt=""
          sizes="(min-width: 1024px) 40vw, 90vw" className="object-contain" />
      </span>
      <span className="mt-2 block text-sm font-semibold text-blue-700 group-hover:underline">View full drawing</span>
    </button>
    <dialog ref={dialog} aria-labelledby={heading}
      className="m-auto max-h-[95dvh] w-[95vw] max-w-7xl overflow-hidden rounded-lg p-4 shadow-xl backdrop:bg-slate-900/50 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id={heading} className="break-words font-semibold text-slate-900">{name} drawing</h2>
        <button type="button" className="shrink-0 text-sm text-blue-700 underline" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <div className="max-h-[80dvh] overflow-auto rounded-md border border-slate-200" tabIndex={0} aria-label={`${name} saved drawing, scrollable`}>
        {children}
      </div>
    </dialog>
  </>;
}
