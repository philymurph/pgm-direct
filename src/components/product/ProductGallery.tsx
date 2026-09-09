"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  productName,
}: {
  images: { url: string; altText: string | null }[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {current ? (
          <Image
            src={current.url}
            alt={current.altText ?? productName}
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-contain p-6"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 overflow-hidden rounded border ${i === active ? "border-blue-600" : "border-slate-200"}`}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
