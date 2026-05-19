"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Props = { invoiceId: string };

export default function InvoicePayments({ invoiceId }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const invoiceQuery = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
    enabled: open,
  });

  const paymentsQuery = useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`);
      if (!res.ok) throw new Error("Failed to load payments");
      return res.json();
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (body: { amount: number; method: string; reference?: string; notes?: string }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoiceId] });
      setOpen(false);
    },
  });

  // Calculate remaining amount
  const invoiceData = invoiceQuery.data?.invoice;
  const payments = paymentsQuery.data?.payments ?? [];
  const totalAmount = invoiceData?.grandTotal ?? 0;
  const paidAmount = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-500">Payments</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-3 text-sm font-medium text-white"
          >
            Record Payment
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {paymentsQuery.isLoading ? (
          <div className="text-sm text-zinc-500">Loading payments...</div>
        ) : paymentsQuery.isError ? (
          <div className="text-sm text-red-600">Failed to load payments</div>
        ) : (
          (paymentsQuery.data?.payments ?? []).map((p: any) => (
            <div key={p._id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">₹{p.amount.toFixed(2)}</div>
                <div className="text-xs text-zinc-500">{p.method} • {new Date(p.paidAt).toLocaleString()}</div>
                {p.reference && <div className="text-xs text-zinc-400">Ref: {p.reference}</div>}
              </div>
              <div className="text-xs text-zinc-400">By {p.createdBy ?? "-"}</div>
            </div>
          ))
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">Record Payment</h4>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Invoice Summary */}
            {invoiceQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading invoice...</div>
            ) : (
              <div className="mb-4 rounded-lg bg-slate-50 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Invoice Total:</span>
                  <span className="font-medium text-slate-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Already Paid:</span>
                  <span className="font-medium text-slate-900">₹{paidAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">Remaining:</span>
                  <span className={`font-semibold ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{remainingAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                const amount = Number(fd.get("amount")) || 0;
                const method = String(fd.get("method") || "cash");
                const reference = String(fd.get("reference") || "");
                const notes = String(fd.get("notes") || "");
                try {
                  await mutation.mutateAsync({ amount, method, reference, notes });
                } catch (err) {
                  // error handled below via mutation.isError
                }
              }}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Amount</label>
                  <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    required 
                    defaultValue={remainingAmount > 0 ? remainingAmount.toFixed(2) : ""}
                    placeholder="0.00"
                    className="mt-1 w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Method</label>
                  <select name="method" defaultValue="upi" className="mt-1 w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Reference</label>
                  <input name="reference" className="mt-1 w-full h-10 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <textarea name="notes" rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>

                {mutation.isError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {(mutation.error as Error)?.message}
                  </div>
                )}

                <div className="mt-6 flex gap-2 justify-end">
                  <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={mutation.isPending || remainingAmount <= 0} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                    {mutation.isPending ? "Saving..." : "Save Payment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
