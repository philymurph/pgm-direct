"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LegacyCableMakingLinks() {
  const router = useRouter();

  useEffect(() => {
    function followLegacyLink() {
      const sections: Record<string, string> = {
        "#cable-types": "harnesses",
        "#work-log": "work",
        "#payments": "payments",
      };
      const section = sections[window.location.hash];
      if (section && !new URLSearchParams(window.location.search).has("section")) {
        router.replace(`/admin/cable-making?section=${section}${window.location.hash}`);
      }
    }
    followLegacyLink();
    window.addEventListener("hashchange", followLegacyLink);
    return () => window.removeEventListener("hashchange", followLegacyLink);
  }, [router]);

  return null;
}
