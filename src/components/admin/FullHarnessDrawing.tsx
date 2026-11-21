import Image from "next/image";
import { CableImageButton } from "@/components/admin/CableImageButton";
import type { FullHarness } from "@/lib/full-harness";
import { fullHarnessImageTargets, fullHarnessSvgHeight } from "@/lib/full-harness-svg";

export function FullHarnessDrawing({ id, name, design, svg, hasHarnessImage }: {
  id: string; name: string; design: FullHarness; svg: string; hasHarnessImage: boolean;
}) {
  const height = fullHarnessSvgHeight(design);
  return <div className="relative min-w-[720px]">
    <Image className="block h-auto w-full" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt={`${name} schematic harness drawing`} width={1200} height={height} unoptimized />
    {hasHarnessImage && <CableImageButton marker src={`/admin/cable-making/${id}/attachments/IMAGE?preview=1`} label={`${name} harness`}
      style={{ left: "2.6%", top: 0, width: "94%", height: `${64 / height * 100}%` }} />}
    {fullHarnessImageTargets(design).map((target, index) => <CableImageButton key={`${index}:${target.imageId}`} marker
      src={`/admin/cable-making/parts/${target.partId}/images/${target.imageId}`} label={target.label}
      style={{ left: `${target.x / 12}%`, top: `${target.y / height * 100}%`,
        width: `${target.width / 12}%`, height: `${target.height / height * 100}%` }} />)}
  </div>;
}
