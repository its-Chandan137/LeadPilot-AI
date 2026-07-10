"use client";

import { useState } from "react";
import { ModalOverlay } from "./modal-overlay";
import { Trash2 } from "lucide-react";

type DeleteProjectConfirmProps = {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
};

export function DeleteProjectConfirm({ projectName, onConfirm, onCancel, isDeleting }: DeleteProjectConfirmProps) {
  const [typedValue, setTypedValue] = useState("");
  const isMatch = typedValue === projectName;

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-xl border-2 border-red-400/60 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Delete {projectName}
            </h2>
            <p className="text-sm text-red-600 font-medium">
              This is permanent and irreversible
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          To confirm, type <strong className="text-red-600">{projectName}</strong> in the box below
        </p>

        <input
          type="text"
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 mb-4"
        />

        <button
          onClick={onConfirm}
          disabled={!isMatch || isDeleting}
          className="w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
        >
          {isDeleting ? (
            "Deleting..."
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete this project
            </>
          )}
        </button>

        <div className="mt-3 text-center">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
