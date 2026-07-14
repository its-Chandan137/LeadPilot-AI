"use client";

import { ModalOverlay } from "./modal-overlay";
import { AlertTriangle } from "lucide-react";

type UnsavedChangesPopupProps = {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  saving?: boolean;
  title?: string;
  message?: string;
};

export function UnsavedChangesPopup({
  open,
  onSave,
  onDiscard,
  onCancel,
  saving = false,
  title = "Unsaved changes",
  message = "You have unsaved changes. Do you want to save them before leaving, or discard them?",
}: UnsavedChangesPopupProps) {
  if (!open) return null;

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard changes
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
