import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProductModel } from "@/models/product";
import { productSchema } from "@/schemas/product";
import { requireInventoryAccess } from "@/lib/access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const access = await requireInventoryAccess();
    if (access.error) return access.error;

    const body = await request.json();
    const parsed = productSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const product = await ProductModel.findOne({
      _id: productId,
      businessId: access.session.user.businessId,
      isDeleted: false,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.sku !== undefined) updates.sku = payload.sku;
    if (payload.barcode !== undefined) updates.barcode = payload.barcode;
    if (payload.hsn !== undefined) updates.hsn = payload.hsn;
    if (payload.categoryId !== undefined) updates.categoryId = payload.categoryId;
    if (payload.unit !== undefined) updates.unit = payload.unit;
    if (payload.gstRate !== undefined) updates.gstRate = payload.gstRate;
    if (payload.purchasePrice !== undefined) updates.purchasePrice = payload.purchasePrice;
    if (payload.sellingPrice !== undefined) updates.sellingPrice = payload.sellingPrice;
    if (payload.mrp !== undefined) updates.mrp = payload.mrp;
    if (payload.minStock !== undefined) updates.minStock = payload.minStock;

    // Check for duplicate SKU (if changing)
    if (payload.sku && payload.sku !== product.sku) {
      const existing = await ProductModel.findOne({
        sku: payload.sku,
        businessId: access.session.user.businessId,
        isDeleted: false,
        _id: { $ne: productId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A product with this SKU already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await ProductModel.findByIdAndUpdate(
      productId,
      updates,
      { new: true }
    );

    return NextResponse.json({ ok: true, product: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("E11000") || message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 400 }
      );
    }

    console.error("Failed to update product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const access = await requireInventoryAccess();
    if (access.error) return access.error;

    await connectToDatabase();

    const product = await ProductModel.findOne({
      _id: productId,
      businessId: access.session.user.businessId,
      isDeleted: false,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Soft delete
    await ProductModel.findByIdAndUpdate(productId, {
      isDeleted: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
