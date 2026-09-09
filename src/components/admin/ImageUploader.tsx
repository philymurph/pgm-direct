"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  uploadProductImageAction,
  deleteProductImageAction,
} from "@/actions/admin/upload";

interface ImageItem {
  url: string;
  name: string;
}

function parseInitial(value: string | undefined): ImageItem[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((url) => ({ url, name: url.split("/").pop() ?? url }));
}

export function ImageUploader({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [images, setImages] = useState<ImageItem[]>(() =>
    parseInitial(defaultValue),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function uploadFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!imageFiles.length) return;

    setError(null);
    startTransition(async () => {
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadProductImageAction(formData);
        if (result.success) {
          setImages((prev) => [...prev, result.image]);
        } else {
          setError(result.error);
        }
      }
    });
  }

  function removeImage(index: number) {
    const removed = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (removed?.url.includes("blob.vercel-storage.com")) {
      void deleteProductImageAction(removed.url);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        Product images{" "}
        <span className="text-xs text-slate-400">
          (drag and drop, first image is primary)
        </span>
      </label>

      {/* Hidden field kept in sync so the existing form action needs no changes. */}
      <textarea
        name={name}
        value={images.map((i) => i.url).join("\n")}
        readOnly
        hidden
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ${
          isDragging
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-slate-300 text-slate-500 hover:border-slate-400"
        }`}
      >
        <p>
          {isPending
            ? "Uploading…"
            : "Drag and drop images here, or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.url}
              className="relative overflow-hidden rounded border border-slate-200"
            >
              <div className="relative aspect-square bg-slate-50">
                <Image
                  src={image.url}
                  alt={image.name}
                  fill
                  sizes="150px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Primary
                </span>
              )}
              <div className="flex items-center justify-between gap-1 border-t border-slate-200 bg-white px-1 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0}
                  className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Move earlier"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50"
                  aria-label="Remove image"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === images.length - 1}
                  className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Move later"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
