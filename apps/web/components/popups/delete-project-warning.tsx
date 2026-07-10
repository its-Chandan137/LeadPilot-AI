"use client";

import { TriangleAlert } from "lucide-react";
import { ModalOverlay } from "./modal-overlay";

type DeleteProjectWarningProps = {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteProjectWarning({ projectName, onConfirm, onCancel }: DeleteProjectWarningProps) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-xl border-2 border-red-400/60 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <TriangleAlert className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            This will delete everything!
          </h2>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6 space-y-2">
          <p className="text-sm text-red-800">
            This will permanently delete the <strong>{projectName}</strong> project along with all of its data.
          </p>
          <p className="text-sm text-red-800">
            All conversations, leads, knowledge base sources, and widget configuration will be wiped out.
          </p>
          <p className="text-sm text-red-800 font-bold">
            This action cannot be undone.
          </p>
        </div>

        <button
          onClick={onConfirm}
          className="w-full rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 transition-colors"
        >
          I understand, delete this project
        </button>

        <div className="mt-3 text-center">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
