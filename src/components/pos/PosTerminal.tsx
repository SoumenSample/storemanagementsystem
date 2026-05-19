"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { calculateGST, resolveProductGstRate, type GstRate } from "@/utils/gst";
import { normalizeBarcode } from "@/utils/barcode";

type Category = {
  _id: string;
  name: string;
  gstRate: number;
};

type Product = {
  _id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  hsn: string;
  unit: string;
  categoryId?: string;
  gstRate?: number;
  sellingPrice: number;
  stockQty: number;
};

type CartItem = {
  productId: string;
  description: string;
  sku: string;
  hsn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  gstRate: GstRate;
  lineDiscount: number;
};

type PosTerminalProps = {
  businessName: string;
  businessState: string;
  invoicePrefix: string;
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

export default function PosTerminal({
  businessName,
  businessState,
  invoicePrefix,
}: PosTerminalProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [buyerName, setBuyerName] = useState("Walk-in Customer");
  const [buyerAddress, setBuyerAddress] = useState("Walk-in counter");
  const [buyerState, setBuyerState] = useState(businessState);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [scanValue, setScanValue] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categoriesQuery = useQuery<{ items: Category[] }>({
    queryKey: ["pos-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories?page=1&pageSize=100");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const productsQuery = useQuery<{ items: Product[] }>({
    queryKey: ["pos-products", search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const totals = useMemo(() => {
    if (!items.length) return null;

    return calculateGST(
      items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount,
        gstRate: item.gstRate,
      })),
      businessState,
      buyerState || businessState,
      invoiceDiscount
    );
  }, [items, businessState, buyerState, invoiceDiscount]);

  const addProduct = (product: Product) => {
    setMessage(null);
    
    let gstRate: GstRate = 18; // default
    if (product.categoryId && categoriesQuery.data?.items) {
      const category = categoriesQuery.data.items.find(
        (cat) => cat._id === product.categoryId
      );
      if (category) {
        gstRate = category.gstRate as GstRate;
      }
    } else if (product.gstRate) {
      gstRate = product.gstRate as GstRate;
    }
    
    setItems((current) => {
      const existing = current.find((item) => item.productId === product._id);
      if (existing) {
        return current.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product._id,
          description: product.name,
          sku: product.sku,
          hsn: product.hsn,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.sellingPrice,
          gstRate,
          lineDiscount: 0,
        },
      ];
    });
  };

  const updateItem = (index: number, patch: Partial<CartItem>) => {
    setItems((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const scanBarcode = async () => {
    const barcode = normalizeBarcode(scanValue);
    if (!barcode) {
      setMessage("Enter a barcode to scan.");
      return;
    }

    const localMatch = productsQuery.data?.items.find(
      (product) => normalizeBarcode(product.barcode) === barcode
    );

    if (localMatch) {
      addProduct(localMatch);
      setScanValue("");
      return;
    }

    try {
      const params = new URLSearchParams({ page: "1", pageSize: "20", search: barcode });
      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Unable to scan barcode.");
        return;
      }

      const match = (data.items as Product[]).find(
        (product) => normalizeBarcode(product.barcode) === barcode
      );

      if (!match) {
        setMessage("No product found for this barcode.");
        return;
      }

      addProduct(match);
      setScanValue("");
    } catch {
      setMessage("Unable to scan barcode.");
    }
  };

  const submitSale = async () => {
    setMessage(null);

    if (!items.length) {
      setMessage("Add at least one product before creating the invoice.");
      return;
    }

    if (!buyerName.trim() || !buyerAddress.trim()) {
      setMessage("Buyer name and address are required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "TAX_INVOICE",
          invoicePrefix,
          supplierState: businessState,
          buyerState: buyerState || businessState,
          buyerName,
          buyerAddress,
          buyerPhone: buyerPhone || undefined,
          buyerEmail: buyerEmail || undefined,
          invoiceDiscount,
          items: items.map((item) => ({
            productId: item.productId,
            description: item.description,
            hsn: item.hsn,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            lineDiscount: item.lineDiscount,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Unable to create invoice.");
        return;
      }

      router.push(`/invoices/${data.invoiceId}`);
    } catch {
      setMessage("Unable to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section - Full Width */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Quick sale
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {businessName} POS
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Add products, review totals, and generate a GST invoice quickly.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Prefix: <span className="font-semibold text-slate-900">{invoicePrefix}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products by name, SKU, HSN, or barcode"
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
          />
          <button
            type="button"
            onClick={() => productsQuery.refetch()}
            className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void scanBarcode();
              }
            }}
            placeholder="Scan barcode and press Enter"
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              void scanBarcode();
            }}
            className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Scan Barcode
          </button>
        </div>
      </section>

      {/* Main Content Area - Two Columns on Desktop */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Products Section */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Products</h2>
          {productsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading products...</p>
          ) : productsQuery.isError ? (
            <p className="text-sm text-red-600">Failed to load products.</p>
          ) : (
            <div className="max-h-125 space-y-2 overflow-y-auto pr-2">
              {productsQuery.data?.items.map((product) => {
                const category = categoriesQuery.data?.items.find(
                  (cat) => cat._id === product.categoryId
                );
                const gstRate = resolveProductGstRate(product.gstRate, category?.gstRate) ?? 18;
                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{product.name}</div>
                      <div className="text-xs text-slate-500">
                        SKU {product.sku} · HSN {product.hsn} · GST {gstRate}% · Stock {product.stockQty}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white whitespace-nowrap">
                      {currency.format(product.sellingPrice)}
                    </div>
                  </button>
                );
              })}
              {productsQuery.data?.items.length === 0 && (
                <p className="text-sm text-slate-500">No products found.</p>
              )}
            </div>
          )}
        </section>

        {/* Cart & Checkout Section */}
        <aside className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Checkout
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Customer details
            </h2>
          </div>

          <div className="grid gap-3">
            <input
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
              placeholder="Buyer name"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
            <textarea
              value={buyerAddress}
              onChange={(event) => setBuyerAddress(event.target.value)}
              placeholder="Buyer address"
              className="min-h-20 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            />
            <input
              value={buyerState}
              onChange={(event) => setBuyerState(event.target.value)}
              placeholder="Buyer state"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
            <input
              value={buyerPhone}
              onChange={(event) => setBuyerPhone(event.target.value)}
              placeholder="Phone"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
            <input
              value={buyerEmail}
              onChange={(event) => setBuyerEmail(event.target.value)}
              placeholder="Email"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={invoiceDiscount}
              onChange={(event) => setInvoiceDiscount(Number(event.target.value) || 0)}
              placeholder="Invoice discount"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Cart</h3>
              <span className="text-xs text-slate-500">{items.length} item(s)</span>
            </div>

            <div className="mt-3 max-h-50 space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500">No items added yet.</p>
              ) : (
                items.map((item, index) => (
                  <div key={item.productId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.description}</div>
                        <div className="text-xs text-slate-500">SKU {item.sku}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-xs font-semibold text-red-600 whitespace-nowrap ml-2"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, { quantity: Number(event.target.value) || 1 })
                          }
                          className="w-full h-10 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(index, { unitPrice: Number(event.target.value) || 0 })
                          }
                          className="w-full h-10 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Total</label>
                        <div className="h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                          <span className="text-sm font-semibold text-slate-900">
                            {currency.format(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      GST {item.gstRate}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Subtotal</span>
              <span>{currency.format(totals?.totals.subtotal ?? 0)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <span>Tax</span>
              <span>{currency.format(totals?.totals.totalTax ?? 0)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
              <span>Discount</span>
              <span>{currency.format(invoiceDiscount)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm font-semibold">
              <span>Total</span>
              <span>{currency.format(totals?.totals.payableAmount ?? 0)}</span>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={submitSale}
            disabled={submitting}
            className="h-11 py-3 rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating invoice..." : "Create invoice"}
          </button>
        </aside>
      </div>
    </div>
  );
}