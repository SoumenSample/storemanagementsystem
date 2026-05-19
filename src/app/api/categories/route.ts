import { NextResponse } from "next/server";
import { requireInventoryAccess } from "@/lib/access";
import { connectToDatabase } from "@/lib/db";
import { CategoryModel } from "@/models/category";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  gstRate: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(12),
    z.literal(18),
    z.literal(28),
  ]).optional().default(18),
});

export async function GET() {
  try {
    const access = await requireInventoryAccess();
    if (access.error) {
      return access.error;
    }

    await connectToDatabase();
    const items = await CategoryModel.find({
      businessId: access.session.user.businessId,
      isDeleted: false,
    })
      .select({ businessId: 1, name: 1, description: 1, gstRate: 1, createdAt: 1 })
      .sort({ name: 1 })
      .lean();

    // Ensure gstRate is set for all items (for legacy data compatibility)
    const itemsWithDefaults = items.map((item: any) => ({
      ...item,
      gstRate: item.gstRate ?? 18,
    }));

    return NextResponse.json({ items: itemsWithDefaults });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireInventoryAccess();
    if (access.error) {
      return access.error;
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`category:create:${ip}`, 20, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      console.error("Schema validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Check if a non-deleted category with this name exists
    const existing = await CategoryModel.findOne({
      businessId: access.session.user.businessId,
      name: parsed.data.name,
      isDeleted: false,
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    // Check if a deleted category exists - if so, reactivate it
    const deletedCategory = await CategoryModel.findOne({
      businessId: access.session.user.businessId,
      name: parsed.data.name,
      isDeleted: true,
    });

    if (deletedCategory) {
      deletedCategory.isDeleted = false;
      deletedCategory.description = parsed.data.description ?? null;
      deletedCategory.gstRate = parsed.data.gstRate ?? 18;
      await deletedCategory.save();
      return NextResponse.json({ ok: true, categoryId: deletedCategory._id });
    }

    const category = await CategoryModel.create({
      businessId: access.session.user.businessId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      gstRate: parsed.data.gstRate ?? 18,
    });

    return NextResponse.json({ ok: true, categoryId: category._id });
  } catch (error) {
    console.error("Failed to create category:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("duplicate") || errorMessage.includes("E11000")) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
