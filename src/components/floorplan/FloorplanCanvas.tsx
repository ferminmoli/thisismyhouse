"use client";

import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import {
  CANVAS_DIM_PAD,
  paintUnifiedFloorplan,
} from "@/lib/canvas-renderer/render-unified-floorplan";
import type { FloorplanLayoutResult } from "@/lib/floorplan-layout/types";
import { useEffect, useRef } from "react";

type Props = {
  program: ArchitecturalProgram;
  layout: FloorplanLayoutResult;
  className?: string;
};

export function FloorplanCanvas({ program, layout, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pad = CANVAS_DIM_PAD;
    const cssW = layout.container.width + pad * 2;
    const cssH = layout.container.height + pad * 2;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(pad, pad);
    paintUnifiedFloorplan(ctx, layout, program, {
      pxPerMeter: layout.pxPerMeter,
      contentOffsetX: pad,
      contentOffsetY: pad,
      lotBackground: "#ebe8e4",
    });
  }, [layout, program]);

  return (
    <div
      className={`overflow-auto rounded-2xl bg-stone-200/30 p-2 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="mx-auto max-w-full"
        role="img"
        aria-label={`Plano: ${program.title}`}
      />
    </div>
  );
}
