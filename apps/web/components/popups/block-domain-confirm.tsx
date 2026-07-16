"use client";

import { ModalOverlay } from "./modal-overlay";
import { ShieldOff } from "lucide-react";

type BlockDomainConfirmProps = {
  domain: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BlockDomainConfirm({ domain, onConfirm, onCancel }: BlockDomainConfirmProps) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-xl border-2 border-[#E5E7EB] bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldOff className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Block this domain?</h2>
            <p className="text-sm text-slate-500 font-medium">{domain}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5">
          Traffic from <strong className="text-slate-900">{domain}</strong> will be blocked. Visitors arriving via
          this referrer won&apos;t be able to start a conversation. You can unblock it at any time from this panel.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#6B7280] py-2.5 hover:bg-[#F9FAFB] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            <ShieldOff className="w-4 h-4" />
            Block domain
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
