"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Props = {
  // `close=false` → "다음 캔버스": save as pending but keep the editor
  //   open with a cleared canvas so the user can draw another page.
  // `close=true` → "저장": save and close the editor.
  onSave: (blob: Blob, close: boolean) => void;
  onCancel: () => void;
};

type Mode = "pen" | "text";

// Fullscreen drawing modal. Supports a pen tool (black ink, 2.5px) and
// a text tool (click to place a text input anywhere on the canvas; the
// typed text is baked into the bitmap on confirm). Save returns the
// canvas as a PNG blob — the caller uploads it like any other image.
export default function CanvasEditor({ onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<Mode>("pen");
  const [saving, setSaving] = useState(false);
  const [textOverlay, setTextOverlay] = useState<
    { x: number; y: number; text: string } | null
  >(null);

  // Fit the canvas to its wrapper on mount / resize while preserving a
  // white background. Scaled with devicePixelRatio so lines don't look
  // blurry on retina displays.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Preserve existing bitmap so a resize doesn't clear the drawing.
    const prev = document.createElement("canvas");
    prev.width = canvas.width;
    prev.height = canvas.height;
    const prevCtx = prev.getContext("2d");
    if (prevCtx && canvas.width > 0 && canvas.height > 0) {
      prevCtx.drawImage(canvas, 0, 0);
    }
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (prev.width > 0 && prev.height > 0) {
      ctx.drawImage(
        prev,
        0,
        0,
        prev.width,
        prev.height,
        0,
        0,
        rect.width,
        rect.height,
      );
    }
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#111";
    ctx.font = "20px sans-serif";
    ctx.textBaseline = "top";
  }, []);

  useLayoutEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvas]);

  // Point helper — converts pointer event to canvas CSS-pixel coords.
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (mode === "pen") {
      drawingRef.current = true;
      lastPointRef.current = pos;
      e.currentTarget.setPointerCapture(e.pointerId);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + 0.1, pos.y + 0.1); // dot for tap-without-move
      ctx.stroke();
    } else if (mode === "text") {
      setTextOverlay({ x: pos.x, y: pos.y, text: "" });
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || mode !== "pen") return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const commitTextOverlay = () => {
    if (!textOverlay) return;
    const trimmed = textOverlay.text.trim();
    if (trimmed) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        // Multi-line text support — fillText doesn't wrap/break on \n.
        const lines = textOverlay.text.split("\n");
        lines.forEach((line, i) => {
          ctx.fillText(line, textOverlay.x, textOverlay.y + i * 24);
        });
      }
    }
    setTextOverlay(null);
  };

  const handleSave = async (close: boolean) => {
    if (saving) return;
    // If a text overlay is still open, commit it first.
    if (textOverlay) commitTextOverlay();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("캔버스를 이미지로 내보내지 못했습니다.");
      onSave(blob, close);
      // "다음 캔버스": wipe the drawing so the user starts a fresh page.
      if (!close) {
        const ctx = canvas.getContext("2d");
        const wrapper = wrapperRef.current;
        if (ctx && wrapper) {
          const rect = wrapper.getBoundingClientRect();
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          // Re-apply drawing styles (reset by fill restore above).
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.fillStyle = "#111";
          ctx.font = "20px sans-serif";
          ctx.textBaseline = "top";
        }
      }
    } catch (err) {
      alert(
        "저장 실패: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSaving(false);
    }
  };

  // Esc cancels the text overlay or the whole editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (textOverlay) {
          setTextOverlay(null);
        } else {
          onCancel();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [textOverlay, onCancel]);

  return (
    <div className="pt-safe-8 safe-bottom fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-[13px] text-text-secondary hover:bg-white/10 hover:text-text-primary"
        >
          취소
        </button>
        <div className="flex items-center gap-1 rounded-full bg-white/[0.08] p-0.5">
          <button
            onClick={() => setMode("pen")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[12px] ${
              mode === "pen"
                ? "bg-white text-black"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="M4 20l4-1 11-11a2.5 2.5 0 0 0-3.5-3.5L4.5 15.5 4 20z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            펜
          </button>
          <button
            onClick={() => setMode("text")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[12px] ${
              mode === "text"
                ? "bg-white text-black"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="M5 6V4h14v2M12 4v16M9 20h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            텍스트
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => void handleSave(false)}
            disabled={saving}
            title="현재 캔버스를 저장하고 새 캔버스로 계속"
            className="flex items-center gap-1 rounded-md bg-white/[0.08] px-3 py-1.5 text-[13px] text-text-primary hover:bg-white/[0.16] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            다음
          </button>
          <button
            onClick={() => void handleSave(true)}
            disabled={saving}
            className="rounded-md bg-white px-3 py-1.5 text-[13px] font-bold text-black hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "저장중…" : "저장"}
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden px-3 pb-3">
        <div
          ref={wrapperRef}
          style={{
            aspectRatio: "3 / 4",
            maxHeight: "100%",
            maxWidth: "100%",
          }}
          className="relative overflow-hidden rounded-md border border-white/10 bg-white"
        >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`block h-full w-full ${
            mode === "text" ? "cursor-text" : "cursor-crosshair"
          } touch-none`}
        />
        {textOverlay && (
          <div
            className="absolute flex flex-col gap-1 rounded-md border border-sky-500 bg-white p-1"
            style={{
              left: textOverlay.x,
              top: textOverlay.y,
              maxWidth: `calc(100% - ${textOverlay.x}px - 1rem)`,
            }}
          >
            <textarea
              autoFocus
              value={textOverlay.text}
              onChange={(e) =>
                setTextOverlay(
                  textOverlay
                    ? { ...textOverlay, text: e.target.value }
                    : null,
                )
              }
              rows={2}
              className="w-full resize-none bg-transparent px-1 text-[14px] text-black focus:outline-none"
              placeholder="텍스트 입력"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextOverlay();
                }
              }}
            />
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setTextOverlay(null)}
                className="rounded px-2 py-0.5 text-[11px] text-text-muted hover:bg-black/10 hover:text-black"
              >
                취소
              </button>
              <button
                onClick={commitTextOverlay}
                className="rounded bg-black px-2 py-0.5 text-[11px] font-bold text-white hover:opacity-90"
              >
                삽입
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
