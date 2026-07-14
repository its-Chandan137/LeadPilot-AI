"use client";

import { useEffect, useRef, useState } from "react";

type HSV = { h: number; s: number; v: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb({ h, s, v }: HSV) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToHsv(hex: string): HSV | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsv(rgb.r, rgb.g, rgb.b) : null;
}

function hsvToHex(hsv: HSV) {
  return rgbToHex(hsvToRgb(hsv).r, hsvToRgb(hsv).g, hsvToRgb(hsv).b);
}

const DEFAULT_PRESETS = [
  "#7C3AED",
  "#2563EB",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#111827",
  "#FFFFFF",
];

const HUE_GRADIENT =
  "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)";

export function ColorPicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}: {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<HSV>(
    () => hexToHsv(value) ?? { h: 270, s: 0.75, v: 0.82 }
  );
  const [hexText, setHexText] = useState(value);

  const containerRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = hexToHsv(value);
    if (parsed) setHsv(parsed);
    setHexText(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const currentHex = hsvToHex(hsv);

  function commit(next: HSV) {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    onChange(hex);
  }

  function beginDrag(type: "sv" | "hue", e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      if (type === "sv" && svRef.current) {
        const rect = svRef.current.getBoundingClientRect();
        const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
        commit({ h: hsv.h, s: x, v: 1 - y });
      } else if (type === "hue" && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect();
        const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        commit({ ...hsv, h: x * 360 });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(e.nativeEvent);
  }

  function onHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const t = e.target.value;
    setHexText(t);
    const normalized = t.startsWith("#") ? t : `#${t}`;
    if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(normalized)) {
      const parsed = hexToHsv(normalized);
      if (parsed) {
        setHsv(parsed);
        onChange(normalized.toLowerCase());
      }
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
      >
        <span
          className="h-6 w-6 shrink-0 rounded border border-black/10"
          style={{ background: currentHex }}
        />
        <span className="font-mono text-sm uppercase text-slate-700">{currentHex}</span>
        <svg
          className="ml-auto h-4 w-4 text-slate-400"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div
            ref={svRef}
            onPointerDown={(e) => beginDrag("sv", e)}
            className="relative h-40 w-full cursor-crosshair rounded-md"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
            }}
          >
            <span
              className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: currentHex,
              }}
            />
          </div>

          <div
            ref={hueRef}
            onPointerDown={(e) => beginDrag("hue", e)}
            className="relative mt-3 h-3 w-full cursor-pointer rounded-full"
            style={{ background: HUE_GRADIENT }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h}, 100%, 50%)` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-9 w-9 shrink-0 rounded-md border border-slate-200"
              style={{ background: currentHex }}
            />
            <input
              value={hexText}
              onChange={onHexInput}
              spellCheck={false}
              className="h-9 w-full rounded-md border border-slate-300 px-2.5 font-mono text-sm uppercase outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
            />
          </div>

          <div className="mt-3 grid grid-cols-9 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                title={preset}
                onClick={() => {
                  const parsed = hexToHsv(preset);
                  if (parsed) commit(parsed);
                }}
                className="h-5 w-full rounded border border-black/10 transition hover:scale-110"
                style={{ background: preset }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
