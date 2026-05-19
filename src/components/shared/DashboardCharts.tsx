"use client";

import { useEffect, useState } from "react";

type Metrics = {
  revenueLast6Months: Array<{ month: string; total: number }>;
  invoiceStatusCounts: Record<string, number>;
  monthlyInvoices: Array<{ month: string; count: number }>;
  topProducts: Array<{ productId: string | null; name: string; quantity: number; revenue: number }>;
};

function SimpleLine({ points, width = 400, height = 120 }: { points: number[]; width?: number; height?: number }) {
  if (!points.length) return <div className="text-sm text-slate-500">No data</div>;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const step = width / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="url(#line-gradient)" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardCharts() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (!res.ok) throw new Error("Failed to load metrics");
        const data = await res.json();
        if (mounted) setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading charts...</div>;
  if (!metrics) return <div className="text-sm text-red-600">Unable to load metrics.</div>;

  const revenuePoints = metrics.revenueLast6Months.map((m) => m.total);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Revenue (last 6 months)</div>
        <div className="mt-2 h-32">
          <SimpleLine points={revenuePoints} />
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {metrics.revenueLast6Months.map((m) => (
            <span key={m.month} className="mr-3">
              {m.month}: ₹{m.total.toFixed(0)}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Top products (by quantity)</div>
        <div className="mt-3 flex flex-col gap-2">
          {metrics.topProducts.length === 0 ? (
            <div className="text-sm text-slate-500">No product sales yet.</div>
          ) : (
            metrics.topProducts.map((p) => (
              <div key={p.productId ?? p.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-sm font-medium text-slate-800">{p.name}</div>
                <div className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{p.quantity}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
