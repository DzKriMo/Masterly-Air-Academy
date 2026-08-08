"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Renders an image fetched from an authenticated API endpoint.
 * A plain <img src=...> cannot attach auth headers/cookies reliably,
 * so we fetch the blob (authenticated via the session cookie) and show it
 * via an object URL.
 */
export default function SecureImage({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const res = await api.download(src);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setUrl(objectUrl);
      } catch {
        setUrl(null);
      }
    })();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}
