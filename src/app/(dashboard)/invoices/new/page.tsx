"use client";

import { useMemo, useState } from "react";
import { calculateGST, resolveProductGstRate } from "@/utils/gst";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

const gstRates = [0, 5, 12, 18, 28];

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
  sellingPrice: number;
};

type InvoiceItem = {
  productId?: string;
  description: string;
  hsn: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineDiscount?: number;
};

type FieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState("TAX_INVOICE");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [supplierState, setSupplierState] = useState("");
  const [buyerState, setBuyerState] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: "",
      hsn: "",
      unit: "",
      quantity: 1,
      unitPrice: 0,
      gstRate: 18,
      lineDiscount: 0,
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories?page=1&pageSize=100");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const productsQuery = useQuery<{ items: Product[] }>({
    queryKey: ["products", "invoice"],
    queryFn: async () => {
      const res = await fetch("/api/products?page=1&pageSize=100");
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const invoicePreviewQuery = useQuery<{ invoiceNumber: string }>({
    queryKey: ["invoice-preview", invoicePrefix],
    queryFn: async () => {
      const params = new URLSearchParams({ prefix: invoicePrefix || "INV" });
      const res = await fetch(`/api/invoices/preview?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load invoice preview");
      return res.json();
    },
    enabled: invoicePrefix.length >= 2,
  });

  const totals = useMemo(() => {
    if (!supplierState || !buyerState) {
      return null;
    }
    return calculateGST(
      items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount,
        gstRate: item.gstRate as 0 | 5 | 12 | 18 | 28,
      })),
      supplierState,
      buyerState,
      invoiceDiscount
    );
  }, [items, supplierState, buyerState, invoiceDiscount]);

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        hsn: "",
        unit: "",
        quantity: 1,
        unitPrice: 0,
        gstRate: 18,
        lineDiscount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitInvoice = async () => {
    setError(null);
    if (invoicePrefix.length < 2 || invoicePrefix.length > 6) {
      setError("Invoice prefix must be 2-6 characters.");
      return;
    }
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType,
        invoicePrefix,
        supplierState,
        buyerState,
        buyerName,
        buyerGstin: buyerGstin || undefined,
        buyerPhone: buyerPhone || undefined,
        buyerEmail: buyerEmail || undefined,
        buyerAddress,
        invoiceDiscount,
        items,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to create invoice");
      return;
    }

    const data = await response.json();
    router.push(`/invoices/${data.invoiceId}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SiteHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-sm text-zinc-600">
          Build GST compliant invoices with live tax totals.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Invoice details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Document type" htmlFor="documentType">
            <select
              id="documentType"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="PROFORMA">Proforma</option>
              <option value="QUOTATION">Quotation</option>
              <option value="DELIVERY_CHALLAN">Delivery Challan</option>
            </select>
          </Field>
          <Field label="Invoice prefix" htmlFor="invoicePrefix">
            <input
              id="invoicePrefix"
              value={invoicePrefix}
              onChange={(event) =>
                setInvoicePrefix(event.target.value.toUpperCase().slice(0, 6))
              }
              placeholder="INV"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            <span>Invoice number preview</span>
            <div className="flex h-11 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700">
              {invoicePreviewQuery.isLoading
                ? "Previewing invoice number..."
                : invoicePreviewQuery.data?.invoiceNumber ?? "-"}
            </div>
          </div>
          <Field label="Supplier state" htmlFor="supplierState">
            <input
              id="supplierState"
              value={supplierState}
              onChange={(event) => setSupplierState(event.target.value)}
              placeholder="e.g. Maharashtra"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
          <Field label="Buyer state" htmlFor="buyerState">
            <input
              id="buyerState"
              value={buyerState}
              onChange={(event) => setBuyerState(event.target.value)}
              placeholder="e.g. Maharashtra"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Buyer details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Buyer name" htmlFor="buyerName">
            <input
              id="buyerName"
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
              placeholder="Buyer name"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
          <Field label="Buyer GSTIN" htmlFor="buyerGstin">
            <input
              id="buyerGstin"
              value={buyerGstin}
              onChange={(event) => setBuyerGstin(event.target.value)}
              placeholder="GSTIN"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase text-zinc-900"
            />
          </Field>
          <Field label="Buyer phone" htmlFor="buyerPhone">
            <input
              id="buyerPhone"
              value={buyerPhone}
              onChange={(event) => setBuyerPhone(event.target.value)}
              placeholder="Phone"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
          <Field label="Buyer email" htmlFor="buyerEmail">
            <input
              id="buyerEmail"
              value={buyerEmail}
              onChange={(event) => setBuyerEmail(event.target.value)}
              placeholder="Email"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
        </div>
        <Field label="Buyer address" htmlFor="buyerAddress">
          <textarea
            id="buyerAddress"
            value={buyerAddress}
            onChange={(event) => setBuyerAddress(event.target.value)}
            placeholder="Buyer address"
            className="min-h-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Line items</h2>
          <button
            type="button"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={addItem}
          >
            Add row
          </button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="grid gap-4 border-b border-zinc-100 pb-4 last:border-b-0">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Product" htmlFor={`product-${index}`}>
                <select
                  id={`product-${index}`}
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                  value={item.productId ?? ""}
                  onChange={(event) => {
                    const product = productsQuery.data?.items.find(
                      (prod) => prod._id === event.target.value
                    );
                    if (!product) return;
                    
                    let gstRate = 18; // default
                    if (product.categoryId && categoriesQuery.data?.items) {
                      const category = categoriesQuery.data.items.find(
                        (cat) => cat._id === product.categoryId
                      );
                      gstRate = resolveProductGstRate(product.gstRate, category?.gstRate) ?? 18;
                    } else if (product.gstRate !== undefined && product.gstRate !== null) {
                      gstRate = product.gstRate;
                    }
                    
                    updateItem(index, {
                      productId: product._id,
                      description: product.name,
                      hsn: product.hsn,
                      unit: product.unit,
                      gstRate,
                      unitPrice: product.sellingPrice,
                    });
                  }}
                >
                  <option value="">Select product</option>
                  {productsQuery.data?.items.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description" htmlFor={`description-${index}`}>
                <input
                  id={`description-${index}`}
                  value={item.description}
                  onChange={(event) => updateItem(index, { description: event.target.value })}
                  placeholder="Description"
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                />
              </Field>
              <Field label="HSN" htmlFor={`hsn-${index}`}>
                <input
                  id={`hsn-${index}`}
                  value={item.hsn}
                  onChange={(event) => updateItem(index, { hsn: event.target.value })}
                  placeholder="HSN"
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-6">
              <Field label="Unit" htmlFor={`unit-${index}`}>
                <input
                  id={`unit-${index}`}
                  value={item.unit}
                  onChange={(event) => updateItem(index, { unit: event.target.value })}
                  placeholder="Unit"
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                />
              </Field>
              <Field label="Quantity" htmlFor={`quantity-${index}`}>
                <input
                  id={`quantity-${index}`}
                  type="number"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                  placeholder="Qty"
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                />
              </Field>
              <Field label="Rate" htmlFor={`rate-${index}`}>
                <input
                  id={`rate-${index}`}
                  type="number"
                  value={item.unitPrice}
                  onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })}
                  placeholder="Rate"
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                />
              </Field>
              <Field label="GST rate" htmlFor={`gstRate-${index}`}>
                <select
                  id={`gstRate-${index}`}
                  value={item.gstRate}
                  onChange={(event) => updateItem(index, { gstRate: Number(event.target.value) })}
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                >
                  {gstRates.map((rate) => (
                    <option key={rate} value={rate}>
                      GST {rate}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Line discount" htmlFor={`lineDiscount-${index}`}>
                <input
                  id={`lineDiscount-${index}`}
                  type="number"
                  value={item.lineDiscount ?? 0}
                  onChange={(event) => updateItem(index, { lineDiscount: Number(event.target.value) })}
                  placeholder="Discount"
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                />
              </Field>
              <button
                type="button"
                className="h-11 rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Totals</h2>
          <Field label="Invoice discount" htmlFor="invoiceDiscount">
            <input
              id="invoiceDiscount"
              type="number"
              value={invoiceDiscount}
              onChange={(event) => setInvoiceDiscount(Number(event.target.value))}
              placeholder="Invoice discount"
              className="h-10 w-48 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            />
          </Field>
        </div>
        {totals ? (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{totals.totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>₹{totals.totals.totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Round off</span>
              <span>₹{totals.totals.roundOff.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Payable</span>
              <span>₹{totals.totals.payableAmount.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Add supplier and buyer state to calculate GST.</p>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        className="h-11 w-fit rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800"
        onClick={submitInvoice}
      >
        Create invoice
      </button>
        </div>
      </div>
    </div>
  );
}
