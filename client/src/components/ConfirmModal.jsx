import { AlertTriangle, X } from "lucide-react";
import Button from "./ui/Button";

export default function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/15 w-full max-w-sm rounded-2xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)] relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08]"
          title="Close"
        >
          <X size={20} />
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-red-500/15 text-red-400 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertTriangle size={22} />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="glass"
            size="sm"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 rounded-lg shadow-sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}