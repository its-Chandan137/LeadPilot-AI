"use client";

import { type ReactNode, useCallback, useEffect } from "react";

type ModalOverlayProps = {
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function ModalOverlay({ children, onClose, className = "" }: ModalOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <>
      <style>{`
        @keyframes lp-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lp-modal-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0px) scale(1); }
        }
        .lp-overlay { animation: lp-overlay-in 0.2s ease forwards; }
        .lp-modal { animation: lp-modal-in 0.25s ease forwards; }
      `}</style>
      <div
        className="lp-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className={`lp-modal ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
}
