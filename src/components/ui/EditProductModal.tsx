import { Modal } from "./Modal";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    _id: string;
    name: string;
    sku: string;
    hsn: string;
    unit: string;
    categoryId?: string;
    gstRate?: number;
    purchasePrice: number;
    sellingPrice: number;
    mrp: number;
    minStock: number;
    barcode?: string | null;
  } | null;
  formData: Record<string, any>;
  onFormChange: (key: string, value: any) => void;
  onSave: (e: React.FormEvent) => void;
  isLoading?: boolean;
  error?: string;
  categories: Array<{ _id: string; name: string; gstRate: number }>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function EditProductModal({
  isOpen,
  onClose,
  product,
  formData,
  onFormChange,
  onSave,
  isLoading = false,
  error,
  categories,
}: EditProductModalProps) {
  if (!product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(e);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Product" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info */}
        <div className="rounded-lg bg-slate-50 p-3 mb-4">
          <p className="text-sm text-slate-700">
            Updating: <span className="font-medium text-slate-900">{product.name}</span>
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Product name">
            <input
              name="name"
              placeholder="Enter product name"
              value={formData.name || ""}
              onChange={(e) => onFormChange("name", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="SKU">
            <input
              name="sku"
              placeholder="Enter SKU"
              value={formData.sku || ""}
              onChange={(e) => onFormChange("sku", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="HSN">
            <input
              name="hsn"
              placeholder="Enter HSN"
              value={formData.hsn || ""}
              onChange={(e) => onFormChange("hsn", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
        </div>

        {/* Unit and Category */}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Unit">
            <input
              name="unit"
              placeholder="pcs/kg/etc"
              value={formData.unit || ""}
              onChange={(e) => onFormChange("unit", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="Category">
            <select
              name="categoryId"
              value={formData.categoryId || ""}
              onChange={(e) => onFormChange("categoryId", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select category (optional)</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name} (GST {cat.gstRate}%)
                </option>
              ))}
            </select>
          </Field>
          <Field label="GST override">
            <select
              name="gstRate"
              value={formData.gstRate || ""}
              onChange={(e) => onFormChange("gstRate", e.target.value === "" ? "" : Number(e.target.value))}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Use category GST (optional)</option>
              {[0, 5, 12, 18, 28].map((rate) => (
                <option key={rate} value={rate}>
                  GST {rate}%
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Pricing */}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Purchase price">
            <input
              name="purchasePrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.purchasePrice || ""}
              onChange={(e) => onFormChange("purchasePrice", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="Selling price">
            <input
              name="sellingPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.sellingPrice || ""}
              onChange={(e) => onFormChange("sellingPrice", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="MRP">
            <input
              name="mrp"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.mrp || ""}
              onChange={(e) => onFormChange("mrp", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
        </div>

        {/* Stock and Barcode */}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum stock">
            <input
              name="minStock"
              type="number"
              step="1"
              placeholder="0"
              value={formData.minStock || ""}
              onChange={(e) => onFormChange("minStock", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="Barcode">
            <input
              name="barcode"
              placeholder="Scan or enter barcode"
              value={formData.barcode || ""}
              onChange={(e) => onFormChange("barcode", e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
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
            type="submit"
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
