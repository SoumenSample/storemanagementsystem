"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import InvoicePayments from "@/components/InvoicePayments";
import { SiteHeader } from "@/components/site-header";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const queryClient = useQueryClient();

  const invoiceQuery = useQuery<{ invoice: any; items: any[] }>({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (status: "sent" | "paid") => {
      const res = await fetch(`/api/invoices/${invoiceId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to finalize invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
  });

  return (
     <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SiteHeader />
              <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoice</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {invoiceQuery.data?.invoice?.invoiceNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-850 dark:hover:bg-zinc-100"
            onClick={() => finalizeMutation.mutate("sent")}
            disabled={finalizeMutation.isPending}
          >
            Finalize & Deduct Stock
          </button>
          <a
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
            href={`/api/invoices/${invoiceId}/pdf`}
          >
            Download PDF
          </a>
        </div>
      </div>

      {invoiceQuery.isLoading ? (
        <p className="text-sm text-zinc-500">Loading invoice...</p>
      ) : invoiceQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load invoice.</p>
      ) : (
          <div className="grid gap-6 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-zinc-500">Buyer</p>
              <p className="text-base font-medium">
                {invoiceQuery.data?.invoice?.buyerName}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {invoiceQuery.data?.invoice?.buyerAddress}
              </p>
            </div>
            {finalizeMutation.isError && (
              <p className="text-sm text-red-600">
                {(finalizeMutation.error as Error).message}
              </p>
            )}
            <div>
              <p className="text-xs uppercase text-zinc-500">Totals</p>
              <p className="text-base font-medium">
                ₹{(invoiceQuery.data?.invoice?.payableAmount && invoiceQuery.data?.invoice?.payableAmount > 0) 
                  ? invoiceQuery.data?.invoice?.payableAmount 
                  : (invoiceQuery.data?.invoice?.grandTotal + (invoiceQuery.data?.invoice?.roundOff ?? 0))}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Status: {invoiceQuery.data?.invoice?.status}
              </p>
            </div>
          </div>

          <InvoicePayments invoiceId={invoiceId} />

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="py-3 pr-4">Item</th>
                  <th className="py-3 pr-4">HSN</th>
                  <th className="py-3 pr-4">Qty</th>
                  <th className="py-3 pr-4">Rate</th>
                  <th className="py-3 pr-4">GST</th>
                  <th className="py-3 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceQuery.data?.items.map((item) => (
                  <tr key={item._id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-3 pr-4">{item.description}</td>
                    <td className="py-3 pr-4">{item.hsn}</td>
                    <td className="py-3 pr-4">{item.quantity}</td>
                    <td className="py-3 pr-4">₹{item.unitPrice}</td>
                    <td className="py-3 pr-4">₹{item.cgst + item.sgst + item.igst}</td>
                    <td className="py-3 pr-4">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </div>
    </div>
  );
}
