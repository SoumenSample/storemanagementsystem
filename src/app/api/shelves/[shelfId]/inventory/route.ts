import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductModel } from "@/models/product";
import { ShelfInventoryModel } from "@/models/shelfInventory";
import { ShelfLocationModel } from "@/models/shelfLocation";
import { addShelfInventory } from "@/services/shelfService";
import { logStockMovement } from "@/services/stockMovementService";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  expiryDate: z.string().optional().or(z.literal("")),
  batchNo: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

const deleteSchema = z.object({
  inventoryId: z.string().min(1),
});

function parseDateOrNull(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shelfId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { shelfId } = await params;
  const shelf = await ShelfLocationModel.findOne({
    _id: shelfId,
    businessId: session.user.businessId,
    isDeleted: false,
  }).lean();

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  const [inventory, products] = await Promise.all([
    ShelfInventoryModel.find({
      businessId: session.user.businessId,
      shelfId,
      isDeleted: false,
      quantity: { $gt: 0 },
    }).sort({ expiryDate: 1, createdAt: 1 }).lean(),
    ProductModel.find({
      businessId: session.user.businessId,
      isDeleted: false,
    })
      .select({ name: 1, sku: 1 })
      .lean(),
  ]);

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const validInventory = inventory.filter(
    (item) => item.productId && item.shelfId && item.quantity > 0
  );

  return NextResponse.json({
    shelf,
    items: validInventory.map((item) => {
      const product = productMap.get(item.productId!.toString());
      return {
        ...item,
        productName: product?.name ?? "Unknown product",
        sku: product?.sku ?? "-",
      };
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shelfId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const { shelfId } = await params;

  const shelf = await ShelfLocationModel.findOne({
    _id: shelfId,
    businessId: session.user.businessId,
    isDeleted: false,
  });

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  const normalizedExpiryDate = parseDateOrNull(parsed.data.expiryDate || undefined);
  const normalizedBatchNo = parsed.data.batchNo?.trim() || null;

  try {
    const mapped = await addShelfInventory({
      businessId: session.user.businessId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      shelfId,
      expiryDate: normalizedExpiryDate,
      batchNo: normalizedBatchNo ?? undefined,
      notes: parsed.data.notes || undefined,
      movementType: "MAP",
      syncProductStock: false,
    });

    if (!mapped) {
      return NextResponse.json({ error: "Failed to map product" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      inventoryId: mapped.inventory?._id?.toString?.() ?? null,
      productId: mapped.product?._id?.toString?.() ?? null,
      shelfId,
      quantity: parsed.data.quantity,
    });
  } catch (error) {
    const recovered = await ShelfInventoryModel.findOne({
      businessId: session.user.businessId,
      shelfId,
      productId: parsed.data.productId,
      expiryDate: normalizedExpiryDate,
      batchNo: normalizedBatchNo,
      isDeleted: false,
      quantity: { $gt: 0 },
    }).sort({ updatedAt: -1 });

    if (recovered) {
      return NextResponse.json({
        ok: true,
        recovered: true,
        inventoryId: recovered._id.toString(),
        productId: recovered.productId.toString(),
        shelfId,
      });
    }

    const message = error instanceof Error ? error.message : "Failed to map product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ shelfId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const { shelfId } = await params;

  const shelf = await ShelfLocationModel.findOne({
    _id: shelfId,
    businessId: session.user.businessId,
    isDeleted: false,
  });

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found" }, { status: 404 });
  }

  const inventory = await ShelfInventoryModel.findOne({
    _id: parsed.data.inventoryId,
    businessId: session.user.businessId,
    shelfId,
    isDeleted: false,
    quantity: { $gt: 0 },
  });

  if (!inventory) {
    return NextResponse.json({ error: "No matching shelf stock found" }, { status: 404 });
  }

  const product = await ProductModel.findOne({
    _id: inventory.productId,
    businessId: session.user.businessId,
    isDeleted: false,
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const removedQuantity = inventory.quantity;

  if ((product.stockQty ?? 0) < removedQuantity) {
    return NextResponse.json(
      { error: "Shelf stock is out of sync with product totals" },
      { status: 409 }
    );
  }

  await ShelfInventoryModel.deleteOne({ _id: inventory._id });

  product.stockQty -= removedQuantity;
  await product.save();

  await logStockMovement({
    businessId: session.user.businessId,
    productId: product._id.toString(),
    type: "ADJUSTMENT",
    quantity: -removedQuantity,
    shelfId: shelf._id.toString(),
    notes: `Removed from shelf ${shelf.code}`,
    batchNo: inventory.batchNo || undefined,
    expiryDate: inventory.expiryDate ?? null,
  });

  return NextResponse.json({
    ok: true,
    removedQuantity,
    removedLots: 1,
    product: {
      _id: product._id.toString(),
      stockQty: product.stockQty,
    },
  });
}