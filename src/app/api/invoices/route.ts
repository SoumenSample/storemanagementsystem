import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { createInvoice } from "@/services/invoiceService";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const createInvoiceSchema = z.object({
  documentType: z.enum([
    "TAX_INVOICE",
    "PROFORMA",
    "QUOTATION",
    "DELIVERY_CHALLAN",
  ]),
  buyerName: z.string().min(2),
  buyerGstin: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerEmail: z.string().email().optional(),
  buyerAddress: z.string().min(5),
  supplierState: z.string().min(2),
  buyerState: z.string().min(2),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        description: z.string().min(1),
        hsn: z.string().min(4),
        unit: z.string().optional(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        lineDiscount: z.number().nonnegative().optional(),
        gstRate: z.union([
          z.literal(0),
          z.literal(5),
          z.literal(12),
          z.literal(18),
          z.literal(28),
        ]),
      })
    )
    .min(1),
  invoiceDiscount: z.number().nonnegative().optional(),
  invoicePrefix: z.string().min(1).max(12),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { page, pageSize, search } = parsed.data;
  const filter: Record<string, unknown> = {
    businessId: session.user.businessId,
    isDeleted: false,
  };

  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
      { buyerName: { $regex: search, $options: "i" } },
    ];
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    (await import("@/models/invoice")).InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    (await import("@/models/invoice")).InvoiceModel.countDocuments(filter),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`invoice:create:${ip}`, 20, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const invoice = await createInvoice({
    businessId: session.user.businessId,
    documentType: parsed.data.documentType,
    buyerName: parsed.data.buyerName,
    buyerGstin: parsed.data.buyerGstin ?? null,
    buyerPhone: parsed.data.buyerPhone ?? null,
    buyerEmail: parsed.data.buyerEmail ?? null,
    buyerAddress: parsed.data.buyerAddress,
    supplierState: parsed.data.supplierState,
    buyerState: parsed.data.buyerState,
    items: parsed.data.items,
    invoiceDiscount: parsed.data.invoiceDiscount,
    invoicePrefix: parsed.data.invoicePrefix,
  });

  return NextResponse.json({ ok: true, invoiceId: invoice._id });
}
