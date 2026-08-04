import { api } from "@/lib/api";

/**
 * Fetch an API endpoint with the Bearer token and save the response as a file
 * in the browser. Used for module documents and other protected downloads that
 * cannot use a plain <a> link (the JWT lives in sessionStorage, not a cookie).
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

/** Build the module-document stream URL for inline reading with auth token. */
export function moduleDocStreamUrl(id: string, token?: string | null): string {
  const tok = token || api.getAccessToken();
  return `/api/module-documents/${id}/download/?token=${encodeURIComponent(tok || "")}`;
}