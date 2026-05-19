import { Modal } from "./Modal";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    _id: string;
    name: string;
    sku: string;
  } | null;
  quantity: number;
  notes: string;
  onQuantityChange: (qty: number) => void;
  onNotesChange: (notes: string) => void;
  onApply: () => void;
  isLoading?: boolean;
  error?: string;
}

export function AdjustStockModal({
  isOpen,
  onClose,
  product,
  quantity,
  notes,
  onQuantityChange,
  onNotesChange,
  onApply,
  isLoading = false,
  error,
}: AdjustStockModalProps) {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Stock" size="sm">
      <div className="space-y-4">
        {/* Product Info */}
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{product.name}</span>
            <span className="mx-1 text-slate-400">•</span>
            <span className="text-slate-700">SKU: {product.sku}</span>
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity Adjustment
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
              placeholder="Enter positive or negative number (+/-)"
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Positive number to add, negative to reduce
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adjustment Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g., Stock verification, damaged items, inventory recount..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={onApply}
            disabled={isLoading || quantity === 0}
            className="flex-1 h-11 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Updating..." : "Apply Adjustment"}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
