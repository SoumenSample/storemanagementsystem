"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Barcode from "react-barcode";
import QRCode from "qrcode";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateBarcodeValue, normalizeBarcode } from "@/utils/barcode";

type ShelfProduct = {
  inventoryId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  expiryDate?: string | null;
  batchNo?: string | null;
};

type Shelf = {
  _id: string;
  code: string;
  label: string;
  locationType: "AISLE" | "RACK" | "SHELF" | "BIN";
  parentShelfId?: string | null;
  capacityQty: number;
  minOccupancyPct: number;
  barcode?: string | null;
  qrValue?: string | null;
  notes?: string | null;
  totalQuantity: number;
  occupancyPct?: number | null;
  isHighOccupancy: boolean;
  isOverCapacity: boolean;
  productsOnShelf: ShelfProduct[];
};

type Product = {
  _id: string;
  name: string;
  sku: string;
  stockQty: number;
  minStock: number;
};

type AlertPayload = {
  lowStockProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    stockQty: number;
    minStock: number;
  }>;
  expiringSoon: Array<{
    inventoryId: string;
    shelfId: string;
    shelfCode: string;
    productId: string;
    quantity: number;
    expiryDate: string;
  }>;
  occupancyAlerts: Array<{
    shelfId: string;
    code: string;
    label: string;
    locationType: string;
    capacityQty: number;
    totalQuantity: number;
    occupancyPct: number | null;
    minOccupancyPct: number;
  }>;
};

function formatPct(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `${value}%`;
}

function ShelfCodePreview({ value }: { value: string }) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(value, { width: 120, margin: 1 })
      .then((dataUrl: string) => {
        if (active) setQrSrc(dataUrl);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });

    return () => {
      active = false;
    };
  }, [value]);

  if (!qrSrc) {
    return (
      <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
        QR
        <br />
        {value}
      </div>
    );
  }

  return <img src={qrSrc} alt={`QR for ${value}`} className="h-28 w-28 rounded-2xl border border-slate-200 bg-white p-2" />;
}

export default function ShelvesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [selectedShelfId, setSelectedShelfId] = useState<string>("");
  const [createForm, setCreateForm] = useState({
    label: "",
    locationType: "SHELF" as Shelf["locationType"],
    code: "",
    parentShelfId: "",
    capacityQty: "0",
    minOccupancyPct: "85",
    notes: "",
  });
  const [mapForm, setMapForm] = useState({
    shelfId: "",
    productId: "",
    quantity: "",
    expiryDate: "",
    batchNo: "",
    notes: "",
  });
  const [transferForm, setTransferForm] = useState({
    fromShelfId: "",
    toShelfId: "",
    productId: "",
    quantity: "",
    expiryDate: "",
    batchNo: "",
    notes: "",
  });

  const printShelfLabel = (shelf: Shelf) => {
    const wrapper = document.getElementById(`shelf-label-${shelf._id}`);
    if (!wrapper) return;

    const popup = window.open("", "_blank", "width=640,height=900");
    if (!popup) return;

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Print shelf label</title>
          <style>
            @page { size: auto; margin: 12mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
            .sheet { display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; }
            .label { width: 100%; max-width: 420px; border: 1px solid #cbd5e1; border-radius: 18px; padding: 18px; box-sizing: border-box; }
            .title { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
            .meta { font-size: 13px; color: #475569; margin: 0 0 12px; }
            .codes { display: flex; gap: 18px; align-items: center; justify-content: space-between; }
            .codes svg { max-width: 100%; }
            .qr img { display: block; width: 128px; height: 128px; }
            .footer { margin-top: 14px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="sheet">
            ${wrapper.innerHTML}
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const readApiError = async (response: Response) => {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        if (typeof data.error === "string" && data.error.trim()) {
          return `${response.status}: ${data.error}`;
        }
        return `${response.status}: Request failed`;
      } catch {
        return `${response.status}: Request failed`;
      }
    }

    const text = await response.text();
    return text.trim() || `${response.status}: Request failed`;
  };

  const shelvesQuery = useQuery<{ items: Shelf[] }>({
    queryKey: ["shelves", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/shelves?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load shelves");
      return res.json();
    },
  });

  const alertsQuery = useQuery<AlertPayload>({
    queryKey: ["shelf-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/shelves/alerts");
      if (!res.ok) throw new Error("Failed to load shelf alerts");
      return res.json();
    },
  });

  const productsQuery = useQuery<{ items: Product[] }>({
    queryKey: ["shelf-products"],
    queryFn: async () => {
      const res = await fetch("/api/products?page=1&pageSize=100");
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const shelves = shelvesQuery.data?.items ?? [];
  const products = productsQuery.data?.items ?? [];
  const alerts = alertsQuery.data;
  const selectedShelf = useMemo(
    () => shelves.find((shelf) => shelf._id === selectedShelfId) ?? null,
    [selectedShelfId, shelves]
  );

  useEffect(() => {
    if (!selectedShelfId && shelves.length > 0) {
      setSelectedShelfId(shelves[0]._id);
    }
  }, [shelves, selectedShelfId]);

  useEffect(() => {
    if (!mapForm.shelfId && shelves.length > 0) {
      setMapForm((current) => ({ ...current, shelfId: shelves[0]._id }));
    }
    if (!transferForm.fromShelfId && shelves.length > 0) {
      setTransferForm((current) => ({ ...current, fromShelfId: shelves[0]._id }));
    }
  }, [shelves, mapForm.shelfId, transferForm.fromShelfId]);

  const createShelfMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shelves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: createForm.label,
          locationType: createForm.locationType,
          code: normalizeBarcode(createForm.code),
          parentShelfId: createForm.parentShelfId || undefined,
          capacityQty: Number(createForm.capacityQty),
          minOccupancyPct: Number(createForm.minOccupancyPct),
          notes: createForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    },
    onSuccess: () => {
      setCreateForm({
        label: "",
        locationType: "SHELF",
        code: "",
        parentShelfId: "",
        capacityQty: "0",
        minOccupancyPct: "85",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["shelves"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-alerts"] });
    },
  });

  const mapInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!mapForm.shelfId) throw new Error("Pick a shelf first");
      const res = await fetch(`/api/shelves/${mapForm.shelfId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: mapForm.productId,
          quantity: Number(mapForm.quantity),
          expiryDate: mapForm.expiryDate || undefined,
          batchNo: mapForm.batchNo || undefined,
          notes: mapForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    },
    onSuccess: () => {
      setMapForm((current) => ({
        ...current,
        productId: "",
        quantity: "",
        expiryDate: "",
        batchNo: "",
        notes: "",
      }));
      queryClient.invalidateQueries({ queryKey: ["shelves"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-products"] });
    },
  });

  const removeInventoryMutation = useMutation({
    mutationFn: async (payload: { shelfId: string; inventoryId: string }) => {
      const res = await fetch(`/api/shelves/${payload.shelfId}/inventory`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: payload.inventoryId,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelves"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-products"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferForm.fromShelfId) throw new Error("Pick a source shelf first");
      const res = await fetch(`/api/shelves/${transferForm.fromShelfId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: transferForm.productId,
          toShelfId: transferForm.toShelfId,
          quantity: Number(transferForm.quantity),
          expiryDate: transferForm.expiryDate || undefined,
          batchNo: transferForm.batchNo || undefined,
          notes: transferForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return res.json();
    },
    onSuccess: () => {
      setTransferForm((current) => ({
        ...current,
        productId: "",
        quantity: "",
        expiryDate: "",
        batchNo: "",
        notes: "",
      }));
      queryClient.invalidateQueries({ queryKey: ["shelves"] });
      queryClient.invalidateQueries({ queryKey: ["shelf-alerts"] });
    },
  });

  const currentShelfInventory = selectedShelf?.productsOnShelf ?? [];
  const selectedShelfOccupancy = selectedShelf?.occupancyPct ?? null;
  const lowStockCount = alerts?.lowStockProducts.length ?? 0;
  const expiringCount = alerts?.expiringSoon.length ?? 0;
  const occupancyCount = alerts?.occupancyAlerts.length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <SiteHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto px-4 py-5 lg:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  {/* <Badge className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Shelf control</Badge> */}
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Shelf management</h1>
                  <p className="max-w-2xl text-sm text-slate-600">
                    Mange and Create selves
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Shelves" value={String(shelves.length)} />
                  <StatCard label="Low stock" value={String(lowStockCount)} tone="slate" />
                  <StatCard label="Expiry watch" value={String(expiringCount)} tone="slate" />
                  <StatCard label="Occupancy" value={String(occupancyCount)} tone="slate" />
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Create location</h2>
                    <p className="text-sm text-slate-500">Add aisles, racks, shelves, or bins with capacity and scan codes.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setCreateForm((current) => ({ ...current, code: generateBarcodeValue("SH") }))}>
                    Generate code
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Label">
                    <Input value={createForm.label} onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))} placeholder="Rack A / Bin 12" />
                  </Field>
                  <Field label="Type">
                    <select
                      value={createForm.locationType}
                      onChange={(event) => setCreateForm((current) => ({ ...current, locationType: event.target.value as Shelf["locationType"] }))}
                      className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                    >
                      {["AISLE", "RACK", "SHELF", "BIN"].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Code">
                    <Input value={createForm.code} onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))} placeholder="SH-0001" />
                  </Field>
                  <Field label="Parent location">
                    <select value={createForm.parentShelfId} onChange={(event) => setCreateForm((current) => ({ ...current, parentShelfId: event.target.value }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm">
                      <option value="">None</option>
                      {shelves.map((shelf) => (
                        <option key={shelf._id} value={shelf._id}>{shelf.code} · {shelf.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Capacity">
                    <Input type="number" value={createForm.capacityQty} onChange={(event) => setCreateForm((current) => ({ ...current, capacityQty: event.target.value }))} min={0} />
                  </Field>
                  <Field label="Occupancy alert %">
                    <Input type="number" value={createForm.minOccupancyPct} onChange={(event) => setCreateForm((current) => ({ ...current, minOccupancyPct: event.target.value }))} min={1} max={100} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={createForm.notes} onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Optional operational notes" />
                </Field>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => createShelfMutation.mutate()}
                    disabled={createShelfMutation.isPending || !createForm.label.trim()}
                  >
                    {createShelfMutation.isPending ? "Creating..." : "Create location"}
                  </Button>
                  {createShelfMutation.isError ? (
                    <p className="self-center text-sm text-red-600">{(createShelfMutation.error as Error).message}</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/20">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Quick mapping and transfer</h2>
                  <p className="text-sm text-slate-300">Use scan-friendly codes to place stock or move it between shelves.</p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Map product to shelf</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Shelf">
                        <select value={mapForm.shelfId} onChange={(event) => setMapForm((current) => ({ ...current, shelfId: event.target.value }))} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">
                          {shelves.map((shelf) => (
                            <option key={shelf._id} value={shelf._id}>{shelf.code} · {shelf.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Product">
                        <select value={mapForm.productId} onChange={(event) => setMapForm((current) => ({ ...current, productId: event.target.value }))} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">
                          <option value="">Choose product</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>{product.sku} · {product.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Quantity">
                        <Input type="number" min={1} value={mapForm.quantity} onChange={(event) => setMapForm((current) => ({ ...current, quantity: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
                      </Field>
                      <Field label="Expiry date">
                        <Input type="date" value={mapForm.expiryDate} onChange={(event) => setMapForm((current) => ({ ...current, expiryDate: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
                      </Field>
                      <Field label="Batch">
                        <Input value={mapForm.batchNo} onChange={(event) => setMapForm((current) => ({ ...current, batchNo: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <textarea value={mapForm.notes} onChange={(event) => setMapForm((current) => ({ ...current, notes: event.target.value }))} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                    </Field>
                    <div className="mt-3 flex items-center gap-3">
                      <Button type="button" onClick={() => mapInventoryMutation.mutate()} disabled={mapInventoryMutation.isPending || !mapForm.shelfId || !mapForm.productId || !mapForm.quantity}>
                        {mapInventoryMutation.isPending ? "Saving..." : "Map stock"}
                      </Button>
                      {mapInventoryMutation.isError ? <p className="text-sm text-rose-300">{(mapInventoryMutation.error as Error).message}</p> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Transfer stock</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="From shelf">
                        <select value={transferForm.fromShelfId} onChange={(event) => setTransferForm((current) => ({ ...current, fromShelfId: event.target.value }))} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">
                          {shelves.map((shelf) => (
                            <option key={shelf._id} value={shelf._id}>{shelf.code} · {shelf.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="To shelf">
                        <select value={transferForm.toShelfId} onChange={(event) => setTransferForm((current) => ({ ...current, toShelfId: event.target.value }))} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">
                          <option value="">Choose target</option>
                          {shelves.filter((shelf) => shelf._id !== transferForm.fromShelfId).map((shelf) => (
                            <option key={shelf._id} value={shelf._id}>{shelf.code} · {shelf.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Product">
                        <select value={transferForm.productId} onChange={(event) => setTransferForm((current) => ({ ...current, productId: event.target.value }))} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">
                          <option value="">Choose product</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>{product.sku} · {product.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Quantity">
                        <Input type="number" min={1} value={transferForm.quantity} onChange={(event) => setTransferForm((current) => ({ ...current, quantity: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
                      </Field>
                      <Field label="Expiry date">
                        <Input type="date" value={transferForm.expiryDate} onChange={(event) => setTransferForm((current) => ({ ...current, expiryDate: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
                      </Field>
                      <Field label="Batch">
                        <Input value={transferForm.batchNo} onChange={(event) => setTransferForm((current) => ({ ...current, batchNo: event.target.value }))} className="border-white/10 bg-slate-950 text-white" />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <textarea value={transferForm.notes} onChange={(event) => setTransferForm((current) => ({ ...current, notes: event.target.value }))} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                    </Field>
                    <div className="mt-3 flex items-center gap-3">
                      <Button type="button" variant="secondary" onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending || !transferForm.fromShelfId || !transferForm.toShelfId || !transferForm.productId || !transferForm.quantity}>
                        {transferMutation.isPending ? "Moving..." : "Transfer stock"}
                      </Button>
                      {transferMutation.isError ? <p className="text-sm text-rose-300">{(transferMutation.error as Error).message}</p> : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Shelf directory</h2>
                  <p className="text-sm text-slate-500">Scan a shelf code, search by shelf or product (name, SKU, batch), and inspect mapped products with expiry data.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shelf or product" className="w-52" />
                  <Input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Scan shelf code" className="w-52" />
                  <Button type="button" variant="outline" onClick={() => setSearch(normalizeBarcode(scanValue))} disabled={!normalizeBarcode(scanValue)}>
                    Locate shelf
                  </Button>
                </div>
              </div>

              {shelvesQuery.isLoading ? (
                <p className="mt-4 text-sm text-slate-500">Loading shelves...</p>
              ) : shelves.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No shelves created yet.</p>
              ) : (
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {shelves.map((shelf) => (
                    <article key={shelf._id} className={`rounded-2xl border p-5 shadow-sm ${selectedShelfId === shelf._id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`} onClick={() => setSelectedShelfId(shelf._id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">{shelf.label}</h3>
                            <Badge variant="outline">{shelf.locationType}</Badge>
                            {shelf.isHighOccupancy ? <Badge className="bg-amber-100 text-amber-900">Near capacity</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Code {shelf.code} · Capacity {shelf.capacityQty || "-"} · Occupancy {formatPct(shelf.occupancyPct)}</p>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => setSelectedShelfId(shelf._id)}>Inspect</Button>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[auto_1fr]">
                        <div className="space-y-3">
                          <div id={`shelf-label-${shelf._id}`} className="hidden print:block">
                            <div className="label">
                              <div className="title">{shelf.label}</div>
                              <p className="meta">Code {shelf.code} · Type {shelf.locationType}</p>
                              <div className="codes">
                                <div className="barcode">
                                  <Barcode value={normalizeBarcode(shelf.barcode ?? shelf.code)} height={54} width={1.2} displayValue={true} margin={0} />
                                </div>
                                <div className="qr">
                                  <ShelfCodePreview value={normalizeBarcode(shelf.qrValue ?? shelf.code)} />
                                </div>
                              </div>
                              <div className="footer">Capacity {shelf.capacityQty || "-"} · Alert {shelf.minOccupancyPct}%</div>
                            </div>
                          </div>
                          <Barcode value={normalizeBarcode(shelf.barcode ?? shelf.code)} height={54} width={1.2} displayValue={false} margin={0} />
                          <ShelfCodePreview value={normalizeBarcode(shelf.qrValue ?? shelf.code)} />
                        </div>
                        <div className="space-y-3">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min(100, shelf.occupancyPct ?? 0)}%` }} />
                          </div>
                          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs uppercase tracking-wide text-slate-500">Total qty</div>
                              <div className="font-semibold text-slate-950">{shelf.totalQuantity}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs uppercase tracking-wide text-slate-500">Alert threshold</div>
                              <div className="font-semibold text-slate-950">{shelf.minOccupancyPct}%</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 px-3 py-2">
                              <div className="text-xs uppercase tracking-wide text-slate-500">Parent</div>
                              <div className="font-semibold text-slate-950">{shelf.parentShelfId ?? "None"}</div>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mapped products</div>
                            {shelf.productsOnShelf.length === 0 ? (
                              <p className="mt-2 text-sm text-slate-500">No product mapped to this shelf.</p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {shelf.productsOnShelf.map((item) => (
                                  <div key={`${item.productId}-${item.expiryDate ?? item.batchNo ?? "na"}`} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
                                    <div>
                                      <div className="font-medium text-slate-900">{item.productName}</div>
                                      <div className="text-xs text-slate-500">SKU {item.sku} · Batch {item.batchNo ?? "-"} · Expiry {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">Qty {item.quantity}</Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (window.confirm(`Remove ${item.productName} from ${shelf.label}?`)) {
                                            removeInventoryMutation.mutate({
                                              shelfId: shelf._id,
                                                inventoryId: item.inventoryId,
                                            });
                                          }
                                        }}
                                        disabled={removeInventoryMutation.isPending}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                printShelfLabel(shelf);
                              }}
                            >
                              Print label
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <AlertPanel title="Low stock" items={alerts?.lowStockProducts ?? []} emptyText="No low stock products right now." />
              <AlertPanel title="Expiring soon" items={alerts?.expiringSoon ?? []} emptyText="No expiring shelf lots right now." renderItem={(item) => (
                <>
                  <div className="font-medium text-slate-900">Shelf {item.shelfCode}</div>
                  <div className="text-xs text-slate-500">Qty {item.quantity} · Expiry {new Date(item.expiryDate).toLocaleDateString()}</div>
                </>
              )} />
              <AlertPanel title="Occupancy" items={alerts?.occupancyAlerts ?? []} emptyText="No shelves near capacity." renderItem={(item) => (
                <>
                  <div className="font-medium text-slate-900">{item.code} · {item.label}</div>
                  <div className="text-xs text-slate-500">{item.totalQuantity}/{item.capacityQty || "-"} ({formatPct(item.occupancyPct)})</div>
                </>
              )} />
            </section>

            {selectedShelf ? (
              <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <Badge className="bg-white/10 text-white">Focused shelf</Badge>
                    <h2 className="mt-2 text-2xl font-semibold">{selectedShelf.label}</h2>
                    <p className="text-sm text-slate-300">Code {selectedShelf.code} · Occupancy {formatPct(selectedShelf.occupancyPct)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Inventory count</div>
                    <div className="text-2xl font-semibold text-white">{currentShelfInventory.length}</div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {currentShelfInventory.map((item) => (
                    <div key={`${item.productId}-${item.expiryDate ?? item.batchNo ?? "na"}`} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <div className="text-sm font-semibold text-white">{item.productName}</div>
                      <div className="mt-1 text-xs text-slate-300">SKU {item.sku}</div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-200">
                        <span>Qty {item.quantity}</span>
                        <span>Batch {item.batchNo ?? "-"}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">Expiry {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (window.confirm(`Remove ${item.productName} from ${selectedShelf.label}?`)) {
                              removeInventoryMutation.mutate({
                                shelfId: selectedShelf._id,
                                inventoryId: item.inventoryId,
                              });
                            }
                          }}
                          disabled={removeInventoryMutation.isPending}
                        >
                          Remove from shelf
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-inherit/80">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "amber" | "rose" | "sky" }) {
  const toneStyles: Record<typeof tone, string> = {
    slate: "bg-slate-950 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-500 text-white",
    sky: "bg-sky-500 text-white",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 shadow-sm ${toneStyles[tone]}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AlertPanel({
  title,
  items,
  emptyText,
  renderItem,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  emptyText: string;
  renderItem?: (item: any) => React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyText}</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              {renderItem ? renderItem(item) : (
                <>
                  <div className="font-medium text-slate-900">{(item as any).name}</div>
                  <div className="text-xs text-slate-500">SKU {(item as any).sku} · Stock {(item as any).stockQty} / Min {(item as any).minStock}</div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}