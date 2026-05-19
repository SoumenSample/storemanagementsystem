import { NextResponse } from "next/server";
import { requireInventoryAccess } from "@/lib/access";
import { connectToDatabase } from "@/lib/db";
import { CategoryModel } from "@/models/category";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  gstRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]).optional(),
});

export async function PUT(
  request: Request,
  context: any
) {
  try {
    const access = await requireInventoryAccess();
    if (access.error) {
      return access.error;
    }

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const params = await context.params;
    const session = access.session;
    const category = await CategoryModel.findOne({
      _id: params.categoryId,
      businessId: session.user.businessId,
      isDeleted: false,
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (parsed.data.name !== undefined) {
      category.name = parsed.data.name;
    }
    if (parsed.data.description !== undefined) {
      category.description = parsed.data.description || null;
    }
    if (parsed.data.gstRate !== undefined) {
      category.gstRate = parsed.data.gstRate;
    }

    await category.save();

    return NextResponse.json({ ok: true, category });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: any
) {
  try {
    const access = await requireInventoryAccess();
    if (access.error) {
      return access.error;
    }

    await connectToDatabase();

    const params = await context.params;
    const category = await CategoryModel.findOne({
      _id: params.categoryId,
      businessId: access.session.user.businessId,
      isDeleted: false,
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    category.isDeleted = true;
    await category.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
