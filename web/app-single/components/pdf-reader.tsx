"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize, Minimize } from "lucide-react";

interface Props {
  src: string;
  title?: string;
}

export function PdfReader({ src, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [dataUrl, setDataUrl] = useState("");
  const renderTask = useRef<any>(null);
  const objectUrlRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadPdf() {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setDataUrl(url);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const doc = await pdfjs.getDocument({ url, withCredentials: false }).promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError("Failed to load PDF");
        setLoading(false);
      }
    }
    loadPdf();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
    };
  }, [src]);

  const renderPage = useCallback((pageNumber: number) => {
    if (!pdf || !canvasRef.current) return;
    if (renderTask.current) renderTask.current.cancel();

    pdf.getPage(pageNumber).then((page: any) => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const task = page.render({ canvasContext: ctx, viewport });
      renderTask.current = task;
      task.promise.then(() => { renderTask.current = null; });
    });
  }, [pdf, scale]);

  useEffect(() => { renderPage(pageNum); }, [pageNum, renderPage]);

  const goTo = (n: number) => {
    const p = Math.max(1, Math.min(numPages, n));
    setPageNum(p);
  };

  const zoomIn = () => setScale(s => Math.min(3, s + 0.3));
  const zoomOut = () => setScale(s => Math.max(0.5, s - 0.3));

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-navy-900 rounded-xl">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`bg-navy-900 rounded-xl overflow-hidden border border-navy-700 ${fullscreen ? "fixed inset-0 z-50" : ""}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 border-b border-navy-700 sticky top-0 z-10">
        {title && <span className="text-sm text-white font-medium truncate flex-1">{title}</span>}

        <div className="flex items-center gap-1">
          <button onClick={() => goTo(pageNum - 1)} disabled={pageNum <= 1} className="p-1.5 rounded hover:bg-navy-700 disabled:opacity-30 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 min-w-[60px] text-center font-mono">{pageNum} / {numPages || "?"}</span>
          <button onClick={() => goTo(pageNum + 1)} disabled={pageNum >= numPages} className="p-1.5 rounded hover:bg-navy-700 disabled:opacity-30 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-navy-600 mx-1" />
        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-navy-700 text-gray-400 hover:text-white transition-colors"><ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs text-gray-400 w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-navy-700 text-gray-400 hover:text-white transition-colors"><ZoomIn className="w-4 h-4" /></button>

        <div className="w-px h-5 bg-navy-600 mx-1" />
        <a href={dataUrl || src} download={title || "document.pdf"} className="p-1.5 rounded hover:bg-navy-700 text-gray-400 hover:text-gold-500 transition-colors"><Download className="w-4 h-4" /></a>
        <button onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-navy-700 text-gray-400 hover:text-white transition-colors">
          {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      <div className={`overflow-auto bg-navy-950 flex justify-center p-4 ${fullscreen ? "flex-1" : "max-h-[65vh]"}`}>
        {loading && (
          <div className="flex items-center justify-center h-64">
            <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#c4943c" strokeWidth="3" />
              <path className="opacity-75" fill="#c4943c" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        <canvas ref={canvasRef} className={`shadow-2xl ${loading ? "hidden" : "block"}`} />
      </div>
    </div>
  );
}
