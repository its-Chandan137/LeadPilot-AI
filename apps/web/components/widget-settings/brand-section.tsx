"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Paintbrush, ImageIcon, ExternalLink } from "lucide-react";

type BrandData = {
  colors?: string[];
  logoUrl?: string | null;
  extractedAt?: string;
};

type Props = {
  brand: BrandData | null;
  color: string;
  onColorChange: (color: string) => void;
  onLogoUrlChange: (url: string) => void;
};

const SWATCH_SIZE = 28;

function hexToRgb(hex: string) {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

export function BrandSection({ brand, color, onColorChange, onLogoUrlChange }: Props) {
  const [logoInput, setLogoInput] = useState(brand?.logoUrl ?? "");
  const [logoError, setLogoError] = useState(false);

  if (!brand || (brand.colors && brand.colors.length === 0 && !brand.logoUrl)) {
    return null;
  }

  const hasColors = brand.colors && brand.colors.length > 0;
  const hasLogo = !!brand.logoUrl;

  if (!hasColors && !hasLogo) return null;

  return (
    <div className="space-y-5 pt-4 border-t border-slate-200">
      <div>
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-slate-500" />
          Brand Assets
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Extracted from your website on first import.
        </p>
      </div>

      {hasColors && (
        <div className="space-y-2">
          <Label className="text-sm">Brand Colors</Label>
          <p className="text-xs text-slate-500 -mt-1">
            Click a swatch to set it as the primary color.
          </p>
          <div className="flex flex-wrap gap-2">
            {brand.colors!.map((hex) => {
              const lum = luminance(hex);
              const isActive = color.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onColorChange(hex)}
                  className={`relative rounded-full transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7C3AED] ${
                    isActive ? "ring-2 ring-offset-2 ring-[#7C3AED]" : ""
                  }`}
                  style={{
                    width: SWATCH_SIZE,
                    height: SWATCH_SIZE,
                    backgroundColor: hex,
                  }}
                  title={hex}
                >
                  {isActive && (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ color: lum > 128 ? "#000" : "#fff" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasLogo && (
        <div className="space-y-2">
          <Label className="text-sm">Brand Logo</Label>
          <p className="text-xs text-slate-500 -mt-1">
            The logo is stored for dashboard/branding reference only — it is not
            displayed inside the widget. Only the primary color is applied to the
            widget.
          </p>
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {logoError ? (
                <ImageIcon className="w-6 h-6 text-slate-300" />
              ) : (
                <img
                  src={logoInput || brand.logoUrl!}
                  alt="Brand logo"
                  className="max-w-full max-h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <Input
                value={logoInput}
                onChange={(e) => {
                  setLogoInput(e.target.value);
                  setLogoError(false);
                  onLogoUrlChange(e.target.value);
                }}
                placeholder={brand.logoUrl ?? ""}
                className="text-sm font-mono text-xs"
              />
              {brand.logoUrl && (
                <a
                  href={brand.logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#7C3AED] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open original
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
