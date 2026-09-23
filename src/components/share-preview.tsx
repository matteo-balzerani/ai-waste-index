"use client";

import { useCallback, useState, type ReactNode } from "react";
import { drawShareCard, type ShareFormat } from "@/browser/sharing/card";
import type { ShareModel } from "@/browser/sharing/model";

/** The preview and clipboard use the same renderer. Only transient canvas pixels. */
export function SharePreview({ model, format, zoomIn, zoomOut, children }: {
  model: ShareModel; format: ShareFormat; zoomIn: string; zoomOut: string; children: ReactNode;
}) {
  const [drawn, setDrawn] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const canvas = useCallback((target: HTMLCanvasElement | null) => {
    if (!target) return;
    try {
      drawShareCard(target, model, format);
      setDrawn(true);
    } catch {
      target.width = target.height = 0;
      setDrawn(false);
    }
    return () => { target.width = target.height = 0; };
  }, [model, format]);
  return <div className={`share-preview ${format}`}>
    {drawn && <button type="button" className="text-action" aria-pressed={zoomed}
      onClick={() => setZoomed(value => !value)}>{zoomed ? zoomOut : zoomIn}</button>}
    <div className="preview-scroll" hidden={!drawn} tabIndex={zoomed ? 0 : undefined}>
      <canvas ref={canvas} aria-hidden="true" style={{ minWidth: zoomed ? (format === "badge" ? 360 : 540) : undefined }} />
    </div>
    <div className={drawn ? "sr-only" : undefined}>{children}</div>
  </div>;
}
