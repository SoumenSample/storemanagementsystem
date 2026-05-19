"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";
import { resolveProductGstRate } from "@/utils/gst";
import { generateBarcodeValue, normalizeBarcode } from "@/utils/barcode";
import { AdjustStockModal } from "@/components/ui/AdjustStockModal";
import { EditProductModal } from "@/components/ui/EditProductModal";
import { SiteHeader } from "@/components/site-header";

type Category = {
  _id: string;
  name: string;
  gstRate: number;
};

type Product = {
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
  stockQty: number;
  minStock: number;
  barcode?: string | null;
  openingStock?: number;
  createdAt: string;
};

type ProductResponse = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

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

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const lowStockView = searchParams.get("lowStock") === "1" || searchParams.get("lowStock") === "true";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [categoryGst, setCategoryGst] = useState(18);
  const [newBarcode, setNewBarcode] = useState("");
  const [selectedForLabels, setSelectedForLabels] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});

  const readApiError = async (response: Response) => {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        return data.error ?? "Request failed";
      } catch {
        return "Request failed";
      }
    }

    const text = await response.text();
    return text.trim() || "Request failed";
  };

  const queryKey = useMemo(
    () => ["products", { search, page, pageSize, lowStockView }],
    [search, page, pageSize, lowStockView]
  );

  const effectivePageSize = lowStockView ? 100 : pageSize;

  const productsQuery = useQuery<ProductResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(effectivePageSize),
        search,
      });
      if (lowStockView) {
        params.set("lowStock", "1");
      }
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const categoriesQuery = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const createProduct = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setNewBarcode("");
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: categoryName, 
          description: categoryDesc,
          gstRate: categoryGst,
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: () => {
      setCategoryName("");
      setCategoryDesc("");
      setCategoryGst(18);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      if (!adjusting) throw new Error("No product selected");
      const res = await fetch(`/api/products/${adjusting._id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: adjustQty, notes: adjustNotes }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: () => {
      setAdjusting(null);
      setAdjustQty(0);
      setAdjustNotes("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const editProduct = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!editing) throw new Error("No product selected");
      const res = await fetch(`/api/products/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: () => {
      setEditing(null);
      setEditFormData({});
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const onCreateProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const gstRateValue = payload.gstRate;

    const currentStock = Number(payload.currentStock || 0);

    createProduct.mutate({
      ...payload,
      barcode: normalizeBarcode(String(payload.barcode ?? newBarcode)) || undefined,
      gstRate: gstRateValue === "" ? undefined : Number(gstRateValue),
      purchasePrice: Number(payload.purchasePrice),
      sellingPrice: Number(payload.sellingPrice),
      mrp: Number(payload.mrp),
      stockQty: currentStock,
      openingStock: currentStock,
      minStock: Number(payload.minStock || 0),
    });
  };

  const onEditProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const gstRateValue = payload.gstRate;

    editProduct.mutate({
      ...payload,
      gstRate: gstRateValue === "" ? undefined : (gstRateValue === "" ? undefined : Number(gstRateValue)),
      purchasePrice: payload.purchasePrice ? Number(payload.purchasePrice) : undefined,
      sellingPrice: payload.sellingPrice ? Number(payload.sellingPrice) : undefined,
      mrp: payload.mrp ? Number(payload.mrp) : undefined,
      minStock: payload.minStock ? Number(payload.minStock) : undefined,
    });
  };

  const startEdit = (product: Product) => {
    setEditing(product);
    setEditFormData(product);
  };

  const handleEditFormChange = (key: string, value: unknown) => {
    setEditFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectedLabelProducts = useMemo(() => {
    const items = productsQuery.data?.items ?? [];
    return items.filter((product) => selectedForLabels[product._id]);
  }, [productsQuery.data?.items, selectedForLabels]);

  const toggleSelectForLabel = (productId: string) => {
    setSelectedForLabels((current) => ({
      ...current,
      [productId]: !current[productId],
    }));
  };

  const printLabels = () => {
    if (!selectedLabelProducts.length) {
      alert("Select at least one product to print labels.");
      return;
    }
    window.print();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SiteHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10"></div> */}
    <div className="screen-only mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inventory</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Products</h1>
        <p className="text-sm text-slate-600">
          Manage inventory items with GST rates and stock tracking.
        </p>
      </header>

      {lowStockView && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Low stock view</p>
              <p className="text-sm text-amber-800">
                  Showing products whose current stock is at or below each product&apos;s minimum stock level.
              </p>
            </div>
            <a
              href="/products"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              Show all products
            </a>
          </div>
        </section>
      )}

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add product</h2>
        <form className="grid gap-4" onSubmit={onCreateProduct}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Product name">
              <input
                name="name"
                placeholder="Enter product name"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
            <Field label="SKU">
              <input
                name="sku"
                placeholder="Enter SKU"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
            <Field label="HSN">
              <input
                name="hsn"
                placeholder="Enter HSN"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Unit">
              <input
                name="unit"
                placeholder="pcs/kg/etc"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
            <Field label="Category">
              <select
                name="categoryId"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Select category (optional)</option>
                {categoriesQuery.data?.items.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name} (GST {cat.gstRate}%)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="GST override">
              <select
                name="gstRate"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
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
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Purchase price">
              <input
                name="purchasePrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
            <Field label="Selling price">
              <input
                name="sellingPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
            <Field label="MRP">
              <input
                name="mrp"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                required
              />
            </Field>
            <Field label="Current stock">
              <input
                name="currentStock"
                type="number"
                step="1"
                placeholder="Current stock"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Minimum stock">
              <input
                name="minStock"
                type="number"
                step="1"
                placeholder="0"
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />
            </Field>
            <Field label="Barcode">
              <div className="flex gap-2">
                <input
                  name="barcode"
                  value={newBarcode}
                  onChange={(event) => setNewBarcode(event.target.value)}
                  placeholder="Scan or enter barcode"
                  className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setNewBarcode(generateBarcodeValue())}
                  className="h-11 rounded-xl border border-slate-300 px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Generate
                </button>
              </div>
            </Field>
          </div>
          {normalizeBarcode(newBarcode) ? (
            <div className="w-fit rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Barcode value={normalizeBarcode(newBarcode)} height={40} displayValue={true} fontSize={11} />
            </div>
          ) : null}
          <button
            className="h-11 w-fit rounded-xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-700"
            type="submit"
            disabled={createProduct.isPending}
          >
            {createProduct.isPending ? "Saving..." : "Save product"}
          </button>
          {createProduct.isError && (
            <p className="text-sm text-red-600">
              {(createProduct.error as Error).message}
            </p>
          )}
        </form>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add category</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Category name"
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          />
          <input
            value={categoryDesc}
            onChange={(event) => setCategoryDesc(event.target.value)}
            placeholder="Description"
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          />
          <select
            value={categoryGst}
            onChange={(event) => setCategoryGst(Number(event.target.value))}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          >
            {[0, 5, 12, 18, 28].map((rate) => (
              <option key={rate} value={rate}>
                GST {rate}%
              </option>
            ))}
          </select>
          <button
            className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-700"
            onClick={() => createCategory.mutate()}
            disabled={!categoryName || createCategory.isPending}
          >
            {createCategory.isPending ? "Saving..." : "Create category"}
          </button>
        </div>
        {createCategory.isError && (
          <p className="text-sm text-red-600">
            {(createCategory.error as Error).message}
          </p>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Inventory list</h2>
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search products"
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            />
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}/page
                </option>
              ))}
            </select>
            <button
              type="button"
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={printLabels}
              disabled={!selectedLabelProducts.length}
            >
              Print labels ({selectedLabelProducts.length})
            </button>
          </div>
        </div>

        {productsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading products...</p>
        ) : productsQuery.isError ? (
          <p className="text-sm text-red-600">Failed to load products.</p>
        ) : (
          <div className="space-y-2">
            {productsQuery.data?.items.map((item) => {
              const category = categoriesQuery.data?.items.find(
                (cat) => cat._id === item.categoryId
              );
              const gstRate = resolveProductGstRate(item.gstRate, category?.gstRate);
              const currentStock = item.stockQty ?? item.openingStock ?? 0;
              const isLowStock = lowStockView ? currentStock <= item.minStock : currentStock < item.minStock;
              return (
                <div
                  key={item._id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedForLabels[item._id])}
                      onChange={() => toggleSelectForLabel(item._id)}
                      className="mt-1 h-4 w-4"
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-1">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      SKU: {item.sku} • HSN: {item.hsn} • Unit: {item.unit}
                    </div>
                    {normalizeBarcode(item.barcode) ? (
                      <div className="mt-2 w-fit rounded border border-slate-200 bg-white p-1">
                        <Barcode value={normalizeBarcode(item.barcode)} height={28} width={1.2} displayValue={false} margin={0} />
                      </div>
                    ) : (
                      <div className="text-xs text-amber-700">No barcode assigned</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
                    <div>
                      <span className="block text-xs font-medium text-slate-500">Category</span>
                      <span className="text-slate-900">{category ? category.name : "-"}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-500">GST</span>
                      <span className="text-slate-900">
                        {gstRate === null ? "-" : `${gstRate}%`}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-500">Price</span>
                      <span className="font-medium text-slate-900">₹{item.sellingPrice}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-500">Current stock</span>
                      <span className={`font-medium ${isLowStock ? "text-red-600" : "text-slate-900"}`}>
                        {currentStock}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-slate-500">Min</span>
                      <span className="text-slate-900">{item.minStock}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 md:flex-col">
                    <button
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 md:flex-none"
                      onClick={() => {
                        setAdjusting(item);
                        setAdjustQty(0);
                        setAdjustNotes("");
                      }}
                    >
                      Adjust
                    </button>
                    <button
                      className="flex-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 md:flex-none"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 md:flex-none"
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"?`)) {
                          deleteProduct.mutate(item._id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {productsQuery.data?.page ?? page} of {productsQuery.data?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (productsQuery.data?.totalPages ?? 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={!!adjusting}
        onClose={() => setAdjusting(null)}
        product={adjusting}
        quantity={adjustQty}
        notes={adjustNotes}
        onQuantityChange={setAdjustQty}
        onNotesChange={setAdjustNotes}
        onApply={() => adjustStockMutation.mutate()}
        isLoading={adjustStockMutation.isPending}
        error={
          adjustStockMutation.isError
            ? (adjustStockMutation.error as Error).message
            : undefined
        }
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={!!editing}
        onClose={() => {
          setEditing(null);
          setEditFormData({});
        }}
        product={editing}
        formData={editFormData}
        onFormChange={handleEditFormChange}
        onSave={onEditProduct}
        isLoading={editProduct.isPending}
        error={
          editProduct.isError
            ? (editProduct.error as Error).message
            : undefined
        }
        categories={categoriesQuery.data?.items || []}
      />
    </div>
    </div>

    <div className="print-label-sheet">
      {selectedLabelProducts.flatMap((product) => {
        const copies = 1;
        return Array.from({ length: copies }).map((_, index) => (
          <div key={`${product._id}-${index}`} className="print-label-card">
            <div className="print-name">{product.name}</div>
            <div className="print-meta">SKU: {product.sku}</div>
            <div className="print-meta">MRP: ₹{product.mrp}</div>
            {normalizeBarcode(product.barcode) ? (
              <Barcode value={normalizeBarcode(product.barcode)} height={34} width={1.4} fontSize={10} margin={0} />
            ) : (
              <div className="print-no-code">No barcode</div>
            )}
          </div>
        ));
      })}
    </div>

    <style jsx global>{`
      @media print {
        @page {
          margin: 10mm;
        }

        body * {
          visibility: hidden;
        }

        .print-label-sheet,
        .print-label-sheet * {
          visibility: visible;
        }

        .print-label-sheet {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: #ffffff;
        }

        .screen-only {
          display: none !important;
        }

        .print-label-sheet {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 12px;
        }

        .print-label-card {
          border: 1px solid #94a3b8;
          border-radius: 8px;
          padding: 8px;
          break-inside: avoid;
        }

        .print-name {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .print-meta {
          font-size: 10px;
          margin-bottom: 2px;
        }

        .print-no-code {
          font-size: 10px;
          color: #64748b;
          margin-top: 8px;
        }
      }

      @media screen {
        .print-label-sheet {
          display: none;
        }
      }
    `}</style>
    </div>
  );
}
