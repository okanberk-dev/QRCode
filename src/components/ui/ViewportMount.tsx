"use client";

import { useEffect, useState, type ReactNode } from "react";

interface ViewportMountProps {
  query: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ViewportMount({ query, children, fallback = null }: ViewportMountProps) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches ? <>{children}</> : <>{fallback}</>;
}
