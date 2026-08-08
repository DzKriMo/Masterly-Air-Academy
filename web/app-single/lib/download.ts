import { api } from "@/lib/api";

/**
 * Fetch an API endpoint (authenticated via the session cookie) and save the
 * response as a file in the browser. Used for module documents and other
 * protected downloads that cannot use a plain <a> link.
 * @returns true on success, false on failure.
 */
export async function downloadBlob(endpoint: string, filename: string): Promise<boolean> {
  try {
    const res = await api.download(endpoint);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error("Download failed:", e);
    return false;
  }
}

/** Ensure the downloaded filename carries a sensible file extension. */
export function withExt(name: string | null | undefined, type?: string | null): string {
  const n = (name || "document").trim();
  const hasDot = /\.\w+$/.test(n);
  if (hasDot || !type) return n;
  const safe = type.replace(/[^\w.]/g, "").toLowerCase() || "bin";
  return `${n}.${safe}`;
}

/** Build the module-document download URL (streamed from storage). */
export function moduleDocDownloadUrl(id: string): string {
  return `/module-documents/${id}/download/`;
}

/**
 * Build the module-document stream URL for inline reading with a short-lived
 * signed media token (<iframe> cannot attach auth headers).
 */
export async function moduleDocStreamUrl(id: string): Promise<string | null> {
  return mediaStreamUrl(id, `/api/module-documents/${id}/download/`);
}

/**
 * Mint a short-lived signed media URL for inline playback that cannot attach
 * auth headers (<video>, <iframe>). The signed token expires server-side, so
 * a long-lived JWT is never placed in the URL.
 */
export async function mediaStreamUrl(resourceId: string, base: string): Promise<string | null> {
  try {
    const res = await api.post<any>("/media-token/", { resource: resourceId });
    const tok = res?.media_token;
    if (!tok) return null;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}media=${encodeURIComponent(tok)}`;
  } catch (e) {
    console.error("Failed to mint media token:", e);
    return null;
  }
}