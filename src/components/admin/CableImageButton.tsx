"use client";

import Image from "next/image";
import { useId, useRef, useState, type CSSProperties } from "react";

export function CableImageButton({ src, label, marker = false, style }: {
  src: string; label: string; marker?: boolean; style?: CSSProperties;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const [failed, setFailed] = useState(false);
  return <>
    <button type="button" aria-label={`View image: ${label}`} title={`View image: ${label}`} style={style}
      className={marker
        ? "absolute rounded-lg border-2 border-transparent text-blue-700 hover:border-blue-500 hover:bg-blue-100/20 focus-visible:border-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700"
        : "inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"}
      onClick={() => { setFailed(false); dialog.current?.showModal(); }}>
      <span className={marker ? "absolute right-1 top-1 rounded bg-white p-1 shadow" : ""} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3" />
        </svg>
      </span>
      {!marker && "View image"}
    </button>
    <dialog ref={dialog} aria-labelledby={heading}
      className="m-auto max-h-[90vh] w-11/12 max-w-3xl overflow-auto rounded-lg p-5 shadow-xl backdrop:bg-slate-900/50">
      <div className="mb-4 flex justify-between gap-3">
        <h2 id={heading} className="break-words font-semibold">{label}</h2>
        <button type="button" className="text-sm text-blue-700 underline" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      {failed ? <p role="alert" className="text-red-700">The image could not be loaded.</p> :
        <Image src={src} alt={label} width={1000} height={1000} unoptimized
          className="mx-auto h-auto max-h-[70vh] w-auto max-w-full object-contain" onError={() => setFailed(true)} />}
    </dialog>
  </>;
}
