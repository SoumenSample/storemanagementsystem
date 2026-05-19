import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductModel } from "@/models/product";
import { productSchema } from "@/schemas/product";
import { rateLimit } from "@/lib/rate-limit";
import { addShelfInventory } from "@/services/shelfService";
import { requireInventoryAccess } from "@/lib/access";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  lowStock: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query" },
      { status: 400 }
    );
  }

  const { page, pageSize, search, lowStock } = parsed.data;
  const filter: Record<string, unknown> = {
    businessId: session.user.businessId,
    isDeleted: false,
  };

  const isLowStockView = lowStock === "1" || lowStock === "true";

  if (isLowStockView) {
    filter.$expr = {
      $lte: [{ $ifNull: ["$stockQty", "$openingStock"] }, { $ifNull: ["$minStock", 0] }],
    };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { hsn: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    ProductModel.find(filter)
      .sort(isLowStockView ? { stockQty: 1, createdAt: -1 } : { createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ProductModel.countDocuments(filter),
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
  try {
    const access = await requireInventoryAccess();
    if (access.error) return access.error;

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`product:create:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const payload = parsed.data;
    const initialStock = payload.stockQty ?? payload.openingStock ?? 0;
    const product = await ProductModel.create({
      businessId: access.session.user.businessId,
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode || null,
      hsn: payload.hsn,
      categoryId: payload.categoryId || null,
      unit: payload.unit,
      gstRate: payload.gstRate,
      purchasePrice: payload.purchasePrice,
      sellingPrice: payload.sellingPrice,
      mrp: payload.mrp,
      stockQty: initialStock,
      minStock: payload.minStock ?? 0,
      openingStock: initialStock,
    });

    if (initialStock > 0) {
      await addShelfInventory({
        businessId: access.session.user.businessId as string,
        productId: product._id.toString(),
        quantity: initialStock,
        notes: "Opening stock",
        movementType: "OPENING",
        syncProductStock: false,
      });
    }

    return NextResponse.json({ ok: true, productId: product._id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("E11000") || message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 400 }
      );
    }

    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
