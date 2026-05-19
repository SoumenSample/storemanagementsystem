import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { InvoiceModel } from "@/models/invoice";
import { InvoiceItemModel } from "@/models/invoiceItem";
import { ProductModel } from "@/models/product";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const businessId = session.user.businessId;

  // last 6 months start
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Revenue per month (grandTotal)
  const revenueAgg = await InvoiceModel.aggregate([
    { $match: { businessId, isDeleted: false, issuedAt: { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: "$issuedAt" }, month: { $month: "$issuedAt" } },
        total: { $sum: "$grandTotal" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const revenueLast6Months = revenueAgg.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    total: r.total,
  }));

  // Invoice counts by status
  const statusAgg = await InvoiceModel.aggregate([
    { $match: { businessId, isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const invoiceStatusCounts = Object.fromEntries(
    statusAgg.map((s) => [s._id, s.count])
  );

  // Monthly invoice counts
  const invoicesMonthAgg = await InvoiceModel.aggregate([
    { $match: { businessId, isDeleted: false, issuedAt: { $gte: start } } },
    { $group: { _id: { year: { $year: "$issuedAt" }, month: { $month: "$issuedAt" } }, count: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthlyInvoices = invoicesMonthAgg.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
    count: r.count,
  }));

  // Top products by quantity sold
  const topProductsAgg = await InvoiceItemModel.aggregate([
    { $match: { businessId, isDeleted: false } },
    { $group: { _id: "$productId", quantity: { $sum: "$quantity" }, revenue: { $sum: "$total" } } },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $sort: { quantity: -1 } },
    { $limit: 8 },
    { $project: { productId: "$_id", name: "$product.name", sku: "$product.sku", quantity: 1, revenue: 1 } },
  ]);

  const topProducts = topProductsAgg.map((p) => ({
    productId: p.productId?.toString() ?? null,
    name: p.name ?? "(deleted)",
    sku: p.sku ?? null,
    quantity: p.quantity ?? 0,
    revenue: p.revenue ?? 0,
  }));

  return NextResponse.json({ revenueLast6Months, invoiceStatusCounts, monthlyInvoices, topProducts });
}
